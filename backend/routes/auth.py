from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
import datetime

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name  = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    pw    = data.get("password", "")

    if not all([name, email, pw]):
        return jsonify({"error": "name, email, and password are required"}), 400
    if len(pw) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = current_app.db
    if db is None:
        return jsonify({"error": "Database not connected"}), 503

    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    hashed = bcrypt.hashpw(pw.encode(), bcrypt.gensalt())
    user = {
        "name": name,
        "email": email,
        "password": hashed,
        "created_at": datetime.datetime.utcnow(),
        "saved_resumes": []
    }
    result = db.users.insert_one(user)
    token = create_access_token(identity=str(result.inserted_id))
    return jsonify({"token": token, "name": name, "email": email}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data  = request.get_json()
    email = data.get("email", "").strip().lower()
    pw    = data.get("password", "")

    db = current_app.db
    if db is None:
        return jsonify({"error": "Database not connected"}), 503

    user = db.users.find_one({"email": email})
    if not user or not bcrypt.checkpw(pw.encode(), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({"token": token, "name": user["name"], "email": user["email"]}), 200


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    db = current_app.db
    if db is None:
        return jsonify({"error": "Database not connected"}), 503

    from bson import ObjectId
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])
    return jsonify(user), 200