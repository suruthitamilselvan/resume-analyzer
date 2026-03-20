from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import datetime

resume_bp = Blueprint("resume", __name__)


@resume_bp.route("/save", methods=["POST"])
@jwt_required()
def save_resume():
    user_id = get_jwt_identity()
    data = request.get_json()
    db = current_app.db
    if db is None:
        return jsonify({"error": "Database not connected"}), 503

    doc = {
        "user_id": user_id,
        "title": data.get("title", "My Resume"),
        "resume_text": data.get("resume_text", ""),
        "analysis": data.get("analysis", {}),
        "created_at": datetime.datetime.utcnow()
    }
    result = db.resumes.insert_one(doc)
    return jsonify({"id": str(result.inserted_id), "message": "Resume saved"}), 201


@resume_bp.route("/list", methods=["GET"])
@jwt_required()
def list_resumes():
    user_id = get_jwt_identity()
    db = current_app.db
    if db is None:
        return jsonify({"error": "Database not connected"}), 503

    resumes = list(db.resumes.find(
        {"user_id": user_id},
        {"resume_text": 0}
    ).sort("created_at", -1).limit(20))

    for r in resumes:
        r["_id"] = str(r["_id"])
    return jsonify(resumes), 200


@resume_bp.route("/<resume_id>", methods=["DELETE"])
@jwt_required()
def delete_resume(resume_id):
    user_id = get_jwt_identity()
    db = current_app.db
    if db is None:
        return jsonify({"error": "Database not connected"}), 503

    result = db.resumes.delete_one(
        {"_id": ObjectId(resume_id), "user_id": user_id}
    )
    if result.deleted_count == 0:
        return jsonify({"error": "Resume not found"}), 404
    return jsonify({"message": "Resume deleted"}), 200