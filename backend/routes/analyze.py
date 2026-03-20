from flask import Blueprint, request, jsonify, current_app
from services.nlp_analyzer import NLPAnalyzer
from services.ai_service import AIService
import traceback

analyze_bp = Blueprint("analyze", __name__)
ai = AIService()

@analyze_bp.route("/full", methods=["POST"])
def full_analysis():
    try:
        data = request.get_json()
        resume_text = data.get("resume_text", "").strip()
        job_desc = data.get("job_description", "").strip()

        if not resume_text:
            return jsonify({"error": "resume_text is required"}), 400
        if len(resume_text) < 50:
            return jsonify({"error": "Resume text is too short"}), 400

        analyzer = NLPAnalyzer(resume_text, job_desc)
        nlp_result = analyzer.analyze()
        ai_result = ai.enrich_analysis(resume_text, job_desc, nlp_result)

        final = {
            "score": nlp_result["score"],
            "ats_score": nlp_result["ats"]["total"],
            "match_pct": nlp_result["match_pct"],
            "internship_score": nlp_result["internship_score"],
            "level": nlp_result["level"],
            "domain": nlp_result["domain"],
            "word_count": nlp_result["word_count"],
            "skills_found": nlp_result["skills_found"],
            "skills_missing": nlp_result["skills_missing"],
            "matched_skills": nlp_result["matched_skills"],
            "weak_sections": nlp_result["weak_sections"],
            "score_breakdown": nlp_result["breakdown"],
            "ats": {
                "score": nlp_result["ats"]["total"],
                "breakdown": nlp_result["ats"]["breakdown"],
                "issues": nlp_result["ats"]["issues"],
                "strong_verbs": nlp_result["ats"]["strong_verbs_found"],
                "weak_verbs": nlp_result["ats"]["weak_verbs_found"],
            },
            "bullet_quality": nlp_result["bullet_quality"],
            "fake_flags": nlp_result["fake_flags"],
            "verdict": ai_result.get("verdict", ""),
            "summary": ai_result.get("summary", ""),
            "strengths": ai_result.get("strengths", []),
            "gaps": ai_result.get("gaps", []),
            "tips": ai_result.get("tips", []),
            "eligible_jobs": ai_result.get("eligible_jobs", []),
            "company_types": ai_result.get("company_types", []),
            "recruiter_sim": ai_result.get("recruiter_sim", {}),
            "skill_roadmap": ai_result.get("skill_roadmap", []),
            "bullet_examples": ai_result.get("bullet_examples", []),
            "interview_questions": ai_result.get("interview_questions", []),
            "genuine_strengths": ai_result.get("genuine_strengths", []),
            "multi_role": ai_result.get("multi_role", {}),
            "internship_roles": ai_result.get("internship_roles", []),
            "internship_next_steps": ai_result.get("internship_next_steps", []),
            "growth_potential": ai_result.get("growth_potential", 50),
            "growth_verdict": ai_result.get("growth_verdict", ""),
            "growth_steps": ai_result.get("growth_steps", []),
            "match_verdict": ai_result.get("match_verdict", ""),
            "match_suggestions": ai_result.get("match_suggestions", []),
            "ats_verdict": ai_result.get("ats_verdict", ""),
            "ats_suggestions": ai_result.get("ats_suggestions", []),
            "extracted_text": resume_text[:500],
        }
        return jsonify(final), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500


@analyze_bp.route("/upload", methods=["POST"])
def upload_resume():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    allowed = {"pdf", "docx", "txt", "doc"}
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        return jsonify({"error": f"File type .{ext} not supported"}), 400
    try:
        from utils.pdf_parser import extract_text_from_file
        text = extract_text_from_file(file, ext)
        if not text or len(text.strip()) < 50:
            return jsonify({"error": "Could not extract text. Try pasting directly."}), 400
        return jsonify({"text": text, "word_count": len(text.split()), "char_count": len(text)}), 200
    except Exception as e:
        return jsonify({"error": "File parsing failed", "detail": str(e)}), 500


@analyze_bp.route("/bullet", methods=["POST"])
def improve_bullet():
    data = request.get_json()
    original = data.get("bullet", "").strip()
    context = data.get("context", "")
    if not original:
        return jsonify({"error": "bullet text is required"}), 400
    try:
        result = ai.improve_bullet(original, context)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Failed", "detail": str(e)}), 500


@analyze_bp.route("/rewrite", methods=["POST"])
def rewrite_resume():
    data = request.get_json()
    resume_text = data.get("resume_text", "").strip()
    target_role = data.get("target_role", "Software Engineer")
    if not resume_text:
        return jsonify({"error": "resume_text is required"}), 400
    try:
        result = ai.rewrite_resume(resume_text, target_role)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@analyze_bp.route("/github", methods=["POST"])
def analyze_github():
    data = request.get_json()
    username = data.get("username", "").strip()
    if not username:
        return jsonify({"error": "username is required"}), 400
    try:
        import requests as req
        user = req.get(f"https://api.github.com/users/{username}", timeout=10).json()
        repos = req.get(f"https://api.github.com/users/{username}/repos?sort=updated&per_page=10", timeout=10).json()

        if "message" in user:
            return jsonify({"error": "GitHub user not found"}), 404

        repo_list = []
        total_stars = 0
        languages = {}

        for repo in repos[:10]:
            if isinstance(repo, dict):
                stars = repo.get("stargazers_count", 0)
                total_stars += stars
                lang = repo.get("language")
                if lang:
                    languages[lang] = languages.get(lang, 0) + 1
                has_desc = bool(repo.get("description"))
                repo_list.append({
                    "name": repo.get("name"),
                    "stars": stars,
                    "language": lang,
                    "has_description": has_desc,
                    "updated_at": repo.get("updated_at", "")[:10]
                })

        top_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:5]
        no_desc = [r["name"] for r in repo_list if not r["has_description"]]

        score = 0
        if user.get("public_repos", 0) >= 5: score += 20
        if user.get("followers", 0) >= 10: score += 15
        if total_stars >= 5: score += 15
        if user.get("bio"): score += 10
        if user.get("blog"): score += 10
        if len(no_desc) < 3: score += 15
        if len(top_langs) >= 2: score += 15

        suggestions = []
        if not user.get("bio"):
            suggestions.append("Add a bio to your GitHub profile")
        if no_desc:
            suggestions.append(f"Add descriptions to: {', '.join(no_desc[:3])}")
        if user.get("public_repos", 0) < 5:
            suggestions.append("Add more public repositories")
        if total_stars == 0:
            suggestions.append("Improve project quality to get stars")
        if not user.get("blog"):
            suggestions.append("Add your portfolio or LinkedIn link")

        return jsonify({
            "username": username,
            "name": user.get("name", username),
            "bio": user.get("bio", ""),
            "followers": user.get("followers", 0),
            "public_repos": user.get("public_repos", 0),
            "total_stars": total_stars,
            "top_languages": [l[0] for l in top_langs],
            "repos": repo_list[:6],
            "score": min(score, 100),
            "suggestions": suggestions,
            "no_description_repos": no_desc[:4]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@analyze_bp.route("/chat", methods=["POST"])
def career_chat():
    data = request.get_json()
    message = data.get("message", "").strip()
    resume_context = data.get("resume_context", "")
    history = data.get("history", [])
    if not message:
        return jsonify({"error": "message is required"}), 400
    try:
        result = ai.career_chat(message, resume_context, history)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
