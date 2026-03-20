from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from config import Config
import os

from routes.analyze import analyze_bp
from routes.auth import auth_bp
from routes.resume import resume_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "https://your-app.vercel.app"
            ]
        }
    })

    jwt = JWTManager(app)

    try:
        client = MongoClient(app.config["MONGODB_URI"], serverSelectionTimeoutMS=5000)
        client.server_info()
        app.db = client[app.config["DB_NAME"]]
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB not connected: {e}")
        app.db = None

    app.register_blueprint(analyze_bp, url_prefix="/api/analyze")
    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(resume_bp,  url_prefix="/api/resume")

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "version": "2.0.0"})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🚀 ResumeAI Backend running at http://localhost:{port}\n")
    app.run(debug=True, host="0.0.0.0", port=port)