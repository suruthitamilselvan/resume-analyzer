import os
import json
import requests


class AIService:
    def __init__(self):
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.use_ai = bool(self.anthropic_key or self.openai_key)

    def enrich_analysis(self, resume: str, jd: str, nlp_data: dict) -> dict:
        if not self.use_ai:
            return self._rule_based_fallback(nlp_data)
        prompt = self._build_prompt(resume, jd, nlp_data)
        try:
            raw = self._call_claude(prompt) if self.anthropic_key else self._call_openai(prompt)
            cleaned = raw.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except Exception as e:
            print(f"AI enrichment failed: {e}")
            return self._rule_based_fallback(nlp_data)

    def _build_prompt(self, resume: str, jd: str, nlp: dict) -> str:
        return f"""You are a world-class resume analyst. Analyze the resume and return insights.

RESUME:
{resume[:2000]}

{f"JOB DESCRIPTION:{chr(10)}{jd[:1000]}" if jd else ""}

NLP PRE-ANALYSIS:
- Score: {nlp['score']}/100
- Level: {nlp['level']}
- Domain: {nlp['domain']}
- Skills found: {', '.join(nlp['skills_found'][:10])}
- Skills missing: {', '.join(nlp['skills_missing'][:5])}
- Match %: {nlp['match_pct']}
- ATS score: {nlp['ats']['total']}

Return ONLY valid JSON (no markdown):
{{
  "verdict": "<1 sharp sentence>",
  "summary": "<2-3 sentence summary>",
  "strengths": ["<strength 1>","<strength 2>","<strength 3>","<strength 4>"],
  "gaps": ["<gap 1>","<gap 2>","<gap 3>"],
  "tips": ["<tip 1>","<tip 2>","<tip 3>","<tip 4>"],
  "match_verdict": "<1 sentence>",
  "match_suggestions": ["<suggestion 1>","<suggestion 2>","<suggestion 3>"],
  "eligible_jobs": [
    {{"title":"<job title>","reason":"<why qualified>"}},
    {{"title":"<job title>","reason":"<why>"}},
    {{"title":"<job title>","reason":"<why>"}},
    {{"title":"<job title>","reason":"<why>"}},
    {{"title":"<job title>","reason":"<why>"}}
  ],
  "company_types": [
    {{"type":"<company type>","fit":"High","reason":"<why>"}},
    {{"type":"<company type>","fit":"Medium","reason":"<why>"}},
    {{"type":"<company type>","fit":"Low","reason":"<why>"}},
    {{"type":"<company type>","fit":"Medium","reason":"<why>"}}
  ],
  "recruiter_sim": {{
    "first_glance": "<what recruiter notices in 0-3 sec>",
    "strongest_section": "<section>",
    "weakest_section": "<section>",
    "likely_skipped": "<section>",
    "hire_probability": 60,
    "recruiter_verdict": "<1 sentence>",
    "attention_flow": [
      {{"second":"0-3s","action":"<what recruiter looks at>","verdict":"Good"}},
      {{"second":"3-6s","action":"<what>","verdict":"Neutral"}},
      {{"second":"6-15s","action":"<what>","verdict":"Good"}},
      {{"second":"15-30s","action":"<what>","verdict":"Skip"}},
      {{"second":"30-60s","action":"<what>","verdict":"Good"}}
    ]
  }},
  "ats_verdict": "<1 sentence>",
  "ats_suggestions": ["<fix 1>","<fix 2>","<fix 3>"],
  "skill_roadmap": [
    {{"skill":"<skill>","priority":"High","why":"<why needed>","resources":["<course>","<resource>"]}},
    {{"skill":"<skill>","priority":"High","why":"<why>","resources":["<resource>","<resource>"]}},
    {{"skill":"<skill>","priority":"Medium","why":"<why>","resources":["<resource>","<resource>"]}},
    {{"skill":"<skill>","priority":"Medium","why":"<why>","resources":["<resource>","<resource>"]}}
  ],
  "bullet_examples": [
    {{"original":"<weak bullet>","improved":"<improved with metrics>"}},
    {{"original":"<weak bullet>","improved":"<improved>"}},
    {{"original":"<weak bullet>","improved":"<improved>"}}
  ],
  "interview_questions": [
    {{"category":"Technical","question":"<specific question>"}},
    {{"category":"Technical","question":"<specific question>"}},
    {{"category":"Technical","question":"<specific question>"}},
    {{"category":"HR","question":"<HR question>"}},
    {{"category":"HR","question":"<HR question>"}},
    {{"category":"Behavioral","question":"<behavioral question>"}},
    {{"category":"Behavioral","question":"<behavioral question>"}},
    {{"category":"Project","question":"<project question>"}},
    {{"category":"Project","question":"<project question>"}}
  ],
  "genuine_strengths": ["<evidence 1>","<evidence 2>","<evidence 3>"],
  "multi_role": {{
    "versions": [
      {{"role":"Software Engineer","summary":"<summary>","key_skills":["s1","s2","s3","s4","s5"],"headline_bullets":["<b1>","<b2>","<b3>"]}},
      {{"role":"Data Analyst","summary":"<summary>","key_skills":["s1","s2","s3","s4","s5"],"headline_bullets":["<b1>","<b2>","<b3>"]}},
      {{"role":"Product Manager","summary":"<summary>","key_skills":["s1","s2","s3","s4","s5"],"headline_bullets":["<b1>","<b2>","<b3>"]}},
      {{"role":"Backend Developer","summary":"<summary>","key_skills":["s1","s2","s3","s4","s5"],"headline_bullets":["<b1>","<b2>","<b3>"]}}
    ]
  }},
  "internship_verdict": "<1 sentence>",
  "internship_roles": [
    {{"title":"<role>","reason":"<why>"}},
    {{"title":"<role>","reason":"<why>"}},
    {{"title":"<role>","reason":"<why>"}}
  ],
  "internship_next_steps": ["<step 1>","<step 2>","<step 3>","<step 4>"],
  "growth_potential": 70,
  "growth_verdict": "<1 sentence>",
  "growth_steps": ["<step 1>","<step 2>","<step 3>","<step 4>"]
}}"""

    def _call_claude(self, prompt: str) -> str:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 3000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=60
        )
        data = response.json()
        return data["content"][0]["text"]

    def _call_openai(self, prompt: str) -> str:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 3000
            },
            timeout=60
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]

    def improve_bullet(self, original: str, context: str = "") -> dict:
        if not self.use_ai:
            return {
                "original": original,
                "improved": f"Developed and implemented {original.lower().replace('worked on','').replace('helped with','').strip()}, achieving measurable improvements in efficiency",
                "why": "Added stronger action verb and implied quantified impact"
            }
        prompt = f"""Improve this resume bullet point. Make it specific, metric-driven, and impactful.
{"Context: " + context if context else ""}
Original: "{original}"
Return ONLY JSON: {{"improved": "<improved version>", "why": "<brief explanation>"}}"""
        try:
            raw = self._call_claude(prompt) if self.anthropic_key else self._call_openai(prompt)
            return json.loads(raw.replace("```json", "").replace("```", "").strip())
        except:
            return {"original": original, "improved": original, "why": "Could not improve"}

    def rewrite_resume(self, resume: str, target_role: str) -> dict:
        if not self.use_ai:
            return {
                "rewritten_summary": f"Results-driven professional seeking {target_role} opportunities. Demonstrated expertise in technical problem-solving with a track record of delivering impactful solutions. Committed to continuous learning and contributing to team success.",
                "improved_bullets": [
                    {"original": "Worked on projects", "improved": "Engineered 3+ production-ready projects improving team efficiency by 25%"},
                    {"original": "Used Python", "improved": "Developed Python-based automation scripts reducing manual work by 40%"},
                    {"original": "Helped team", "improved": "Collaborated with 5-member cross-functional team delivering features 2 weeks ahead of schedule"}
                ],
                "keywords_to_add": ["agile", "problem-solving", "cross-functional", "scalable", "optimization"],
                "formatting_tips": ["Use bullet points for all experience", "Add metrics to every achievement", "Keep to 1 page for fresher"],
                "overall_verdict": "Resume rewritten with stronger action verbs and quantified achievements."
            }
        prompt = f"""You are an expert resume writer. Rewrite this resume to be stronger for {target_role} roles.

ORIGINAL RESUME:
{resume[:3000]}

Return ONLY JSON:
{{
  "rewritten_summary": "<powerful 3-4 sentence professional summary>",
  "improved_bullets": [
    {{"original": "<original bullet>", "improved": "<stronger version with metrics>"}},
    {{"original": "<original bullet>", "improved": "<stronger version>"}},
    {{"original": "<original bullet>", "improved": "<stronger version>"}}
  ],
  "keywords_to_add": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "formatting_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "overall_verdict": "<1 sentence on the rewrite>"
}}"""
        try:
            raw = self._call_claude(prompt) if self.anthropic_key else self._call_openai(prompt)
            return json.loads(raw.replace("```json", "").replace("```", "").strip())
        except:
            return {
                "rewritten_summary": f"Motivated {target_role} candidate with strong technical foundation.",
                "improved_bullets": [],
                "keywords_to_add": ["agile", "scalable", "cross-functional"],
                "formatting_tips": ["Add metrics", "Use action verbs", "Keep to 1 page"],
                "overall_verdict": "Resume needs more specific achievements."
            }

    def career_chat(self, message: str, resume_context: str, history: list) -> dict:
        history_text = "\n".join([f"{h['role']}: {h['content']}" for h in history[-6:]])
        if not self.use_ai:
            responses = {
                "salary": {"reply": "For fresher Software Engineers in India, expect 3-8 LPA at startups and 8-20 LPA at top product companies. Focus on DSA and projects to maximize your package.", "suggestions": ["Practice LeetCode daily", "Target product companies", "Build strong projects"]},
                "interview": {"reply": "For tech interviews, focus on DSA, system design basics, and your projects. Always use the STAR method for HR questions.", "suggestions": ["Practice on LeetCode", "Study system design basics", "Prepare project explanations"]},
                "resume": {"reply": "Your resume should be 1 page, have quantified achievements, strong action verbs, and relevant keywords. Tailor it for each job.", "suggestions": ["Add metrics to bullets", "Use action verbs", "Tailor for each role"]},
                "internship": {"reply": "Apply on LinkedIn, Internshala, and company websites. Have 2-3 good projects on GitHub and a clean resume.", "suggestions": ["Apply on Internshala", "Build GitHub projects", "Connect on LinkedIn"]},
                "github": {"reply": "Your GitHub should have at least 5 projects with good READMEs, descriptions, and consistent commits. Quality over quantity!", "suggestions": ["Add READMEs", "Write project descriptions", "Commit consistently"]},
            }
            for key, response in responses.items():
                if key in message.lower():
                    return response
            return {
                "reply": "Great question! Focus on building strong projects, keeping your resume updated with metrics, and applying consistently. Would you like specific advice on any area?",
                "suggestions": ["Build projects", "Update resume", "Apply consistently"]
            }

        prompt = f"""You are a helpful career coach and resume expert. Answer concisely and helpfully.

{f"USER RESUME CONTEXT: {resume_context[:500]}" if resume_context else ""}
{f"HISTORY:{chr(10)}{history_text}" if history_text else ""}

USER: {message}

Return ONLY JSON:
{{
  "reply": "<helpful friendly response in 2-4 sentences>",
  "suggestions": ["<quick tip 1>", "<quick tip 2>", "<quick tip 3>"]
}}"""
        try:
            raw = self._call_claude(prompt) if self.anthropic_key else self._call_openai(prompt)
            return json.loads(raw.replace("```json", "").replace("```", "").strip())
        except:
            return {
                "reply": "Great question! Focus on building strong projects and applying consistently.",
                "suggestions": ["Build projects", "Update resume", "Apply daily"]
            }

    def _rule_based_fallback(self, nlp: dict) -> dict:
        score = nlp["score"]
        level = nlp["level"]
        domain = nlp["domain"]
        skills = nlp["skills_found"]

        return {
            "verdict": f"Competent {level} {domain} candidate with room for improvement.",
            "summary": f"This {level} candidate demonstrates skills in {', '.join(skills[:3])}. Score: {score}/100.",
            "strengths": [
                f"Skills in {', '.join(skills[:2])}" if skills else "Technical background present",
                "Educational qualifications present" if nlp["sections_found"].get("education") else "Shows experience",
                "Projects demonstrate practical skills" if nlp["sections_found"].get("projects") else "Skills listed",
                "Skills section aids ATS parsing" if nlp["sections_found"].get("skills") else "Contact info present"
            ],
            "gaps": [
                "Missing quantified achievements",
                f"Add skills: {', '.join(nlp['skills_missing'][:3])}",
                "Add a professional summary section"
            ],
            "tips": [
                "Add metrics to every bullet point",
                f"Learn: {', '.join(nlp['skills_missing'][:2])}",
                "Replace weak verbs with strong action verbs",
                "Add GitHub link with active projects"
            ],
            "match_verdict": f"Resume matches {nlp['match_pct']}% of target role.",
            "match_suggestions": [
                "Add role-specific keywords",
                "Mirror exact JD terminology",
                "Highlight most relevant projects"
            ],
            "eligible_jobs": [
                {"title": f"{level} {domain} Engineer", "reason": f"Core skills in {', '.join(skills[:2])}"},
                {"title": "Software Developer", "reason": "General programming skills applicable"},
                {"title": f"{domain} Analyst", "reason": "Technical background suitable"},
                {"title": "Full Stack Developer", "reason": "Broad skill set applicable"},
                {"title": "Technology Intern", "reason": "Strong foundation for entry-level"}
            ],
            "company_types": [
                {"type": "Startup", "fit": "High", "reason": "Generalist skills valued"},
                {"type": "Product Company", "fit": "Medium", "reason": "Needs more depth"},
                {"type": "FAANG", "fit": "Low", "reason": "Needs stronger DSA and metrics"},
                {"type": "IT Services", "fit": "High", "reason": "Entry-level friendly"}
            ],
            "recruiter_sim": {
                "first_glance": "Recruiter sees contact info and first bullet",
                "strongest_section": "Skills" if nlp["sections_found"].get("skills") else "Education",
                "weakest_section": "Impact — no quantified achievements",
                "likely_skipped": "Generic summary section",
                "hire_probability": min(score + 10, 90),
                "recruiter_verdict": f"Potential for {level} roles but needs stronger impact.",
                "attention_flow": [
                    {"second": "0-3s", "action": "Scans name and contact", "verdict": "Neutral"},
                    {"second": "3-6s", "action": "Reads summary", "verdict": "Neutral"},
                    {"second": "6-15s", "action": "Skims experience", "verdict": "Neutral"},
                    {"second": "15-30s", "action": "Checks skills", "verdict": "Good"},
                    {"second": "30-60s", "action": "Reviews education", "verdict": "Neutral"}
                ]
            },
            "ats_verdict": f"ATS score: {nlp['ats']['total']}/100.",
            "ats_suggestions": nlp["ats"]["issues"][:3] or ["Add keywords", "Use standard headers", "Remove tables"],
            "skill_roadmap": [
                {"skill": s, "priority": "High", "why": f"In-demand for {domain}", "resources": ["Coursera", "Build a project"]}
                for s in nlp["skills_missing"][:4]
            ],
            "bullet_examples": [
                {"original": b, "improved": f"Engineered {b.lower().replace('worked on','').strip()}, improving efficiency by X%"}
                for b in nlp["bullet_quality"].get("weak", [])[:3]
            ],
            "interview_questions": [
                {"category": "Technical", "question": f"Explain how you used {skills[0]} in a project" if skills else "Describe a technical challenge"},
                {"category": "Technical", "question": "How do you approach debugging?"},
                {"category": "Technical", "question": "Explain your most complex project"},
                {"category": "HR", "question": "Tell me about yourself"},
                {"category": "HR", "question": "Where do you see yourself in 3 years?"},
                {"category": "Behavioral", "question": "Describe a time you worked in a team"},
                {"category": "Behavioral", "question": "Tell me about a project you are proud of"},
                {"category": "Project", "question": "Walk me through your best project"},
                {"category": "Project", "question": "What technologies did you choose and why?"}
            ],
            "genuine_strengths": [
                f"Hands-on experience with {skills[0]}" if skills else "Technical interest shown",
                "Academic background present" if nlp["sections_found"].get("education") else "Practical experience",
                "Projects show initiative" if nlp["sections_found"].get("projects") else "Relevant skills present"
            ],
            "multi_role": {
                "versions": [
                    {"role": "Software Engineer", "summary": f"Engineer with {domain} focus.", "key_skills": skills[:5], "headline_bullets": ["Built scalable systems", "Collaborated in agile teams", "Delivered production code"]},
                    {"role": "Data Analyst", "summary": f"Analytical professional with {domain} background.", "key_skills": skills[:5], "headline_bullets": ["Analyzed datasets", "Built dashboards", "Derived insights"]},
                    {"role": "Product Manager", "summary": "Tech-savvy PM candidate.", "key_skills": skills[:5], "headline_bullets": ["Defined requirements", "Coordinated teams", "Drove delivery"]},
                    {"role": "Backend Developer", "summary": f"Backend developer with {domain} skills.", "key_skills": skills[:5], "headline_bullets": ["Built REST APIs", "Optimized queries", "Implemented auth"]}
                ]
            },
            "internship_verdict": f"You are {nlp['internship_score']}% ready for {domain} internships.",
            "internship_roles": [
                {"title": f"{domain} Intern", "reason": "Core skills match intern requirements"},
                {"title": "Software Engineering Intern", "reason": "Programming foundation suitable"},
                {"title": "Research Intern", "reason": "Academic background suitable"}
            ],
            "internship_next_steps": [
                "Build and deploy one full-stack project",
                f"Get certified in {nlp['skills_missing'][0] if nlp['skills_missing'] else 'a cloud platform'}",
                "Apply to internships on LinkedIn and Internshala",
                "Prepare a 2-minute self introduction"
            ],
            "growth_potential": min(score + 20, 95),
            "growth_verdict": f"High growth potential for {level} {domain} candidate.",
            "growth_steps": [
                f"Master {nlp['skills_missing'][0] if nlp['skills_missing'] else 'a new framework'} in 30 days",
                "Complete one end-to-end project on GitHub",
                "Build a portfolio website",
                "Contribute to open-source projects"
            ]
        }
