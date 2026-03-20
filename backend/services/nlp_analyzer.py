import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk

try:
    from nltk.tokenize import word_tokenize, sent_tokenize
except:
    def word_tokenize(text): return text.split()
    def sent_tokenize(text): return text.split('.')
from nltk.stem import WordNetLemmatizer

for pkg in ["stopwords", "punkt", "wordnet", "averaged_perceptron_tagger"]:
    try:
        nltk.download(pkg, quiet=True)
    except:
        pass

try:
    from nltk.corpus import stopwords
    STOP_WORDS = set(stopwords.words("english"))
except:
    STOP_WORDS = set()

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except:
    nlp = None

SKILL_DATABASE = {
    "programming": ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "kotlin", "swift", "php", "ruby", "scala", "r", "matlab", "bash"],
    "web_frontend": ["react", "next.js", "vue.js", "angular", "svelte", "html", "css", "tailwind", "bootstrap", "redux", "graphql", "webpack"],
    "web_backend": ["node.js", "express", "flask", "django", "fastapi", "spring boot", "laravel", "rest api", "microservices"],
    "data_ml": ["machine learning", "deep learning", "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "matplotlib", "nlp", "computer vision"],
    "data_analysis": ["sql", "mysql", "postgresql", "mongodb", "power bi", "tableau", "excel", "statistics", "regression analysis"],
    "devops_cloud": ["docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "jenkins", "github actions", "terraform", "linux", "nginx"],
    "tools": ["git", "github", "jira", "figma", "postman", "vs code", "jupyter notebook"],
    "soft_skills": ["leadership", "communication", "teamwork", "problem solving", "agile", "scrum"]
}

ALL_SKILLS = []
for category, skills in SKILL_DATABASE.items():
    ALL_SKILLS.extend(skills)

ATS_KEYWORDS = {
    "action_verbs": ["developed", "built", "designed", "implemented", "created", "led", "managed", "optimized", "improved", "increased", "reduced", "achieved", "delivered", "engineered", "deployed", "automated", "analyzed", "launched"],
    "weak_verbs": ["worked", "helped", "assisted", "participated", "was responsible for", "involved in", "did", "made", "used", "tried"],
    "buzzwords_red_flags": ["passionate", "guru", "ninja", "rockstar", "wizard", "synergy", "think outside the box", "go-getter", "self-starter", "hardworking", "detail-oriented"]
}

SECTION_PATTERNS = {
    "education":    r"(education|academic|qualification|degree|university|college)",
    "experience":   r"(experience|employment|work history|professional|internship)",
    "skills":       r"(skills|technologies|technical|competencies|tools|stack)",
    "projects":     r"(projects|portfolio|work|applications|systems)",
    "achievements": r"(achievement|award|certification|honor|recognition)",
    "summary":      r"(summary|objective|profile|about|introduction|overview)",
    "contact":      r"(contact|email|phone|linkedin|github|address)"
}


class NLPAnalyzer:
    def __init__(self, resume_text: str, job_description: str = ""):
        self.resume = resume_text.strip()
        self.jd = job_description.strip()
        self.resume_lower = self.resume.lower()
        self.doc = nlp(self.resume) if nlp else None

    def analyze(self) -> dict:
        skills_found = self.extract_skills()
        skills_missing = self.get_missing_skills(skills_found)
        sections = self.detect_sections()
        match_pct, matched_skills, weak_sections = self.compute_job_match(skills_found)
        ats = self.ats_check(sections, skills_found)
        score, breakdown = self.compute_score(sections, skills_found, ats, match_pct)
        level = self.detect_level()
        domain = self.detect_domain(skills_found)
        bullet_quality = self.analyze_bullets()
        fake_flags = self.detect_weak_content()
        internship_score = self.internship_readiness(sections, skills_found, level)

        return {
            "score": score,
            "breakdown": breakdown,
            "level": level,
            "domain": domain,
            "skills_found": skills_found,
            "skills_missing": skills_missing[:6],
            "sections_found": sections,
            "match_pct": match_pct,
            "matched_skills": matched_skills,
            "weak_sections": weak_sections,
            "ats": ats,
            "bullet_quality": bullet_quality,
            "fake_flags": fake_flags,
            "internship_score": internship_score,
            "word_count": len(self.resume.split()),
            "sentence_count": len(sent_tokenize(self.resume)),
        }

    def extract_skills(self) -> list:
        found = []
        for skill in ALL_SKILLS:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, self.resume_lower):
                found.append(skill)
        if self.doc:
            for ent in self.doc.ents:
                if ent.label_ in ["ORG", "PRODUCT"] and len(ent.text) > 2:
                    if ent.text.lower() not in [s.lower() for s in found]:
                        found.append(ent.text)
        return list(set(found))[:20]

    def get_missing_skills(self, found: list) -> list:
        found_lower = {s.lower() for s in found}
        domain = self.detect_domain(found)
        priority_map = {
            "Software Engineering": ["docker", "kubernetes", "aws", "sql", "git", "system design"],
            "Data Science": ["sql", "tensorflow", "pytorch", "power bi", "tableau", "spark"],
            "Web Development": ["docker", "typescript", "graphql", "redis", "postgresql", "aws"],
            "Data Analysis": ["power bi", "tableau", "sql", "excel", "python", "r"],
            "General": ["git", "sql", "docker", "aws", "python", "rest api"]
        }
        missing_pool = priority_map.get(domain, priority_map["General"])
        return [s for s in missing_pool if s.lower() not in found_lower]

    def detect_sections(self) -> dict:
        sections = {}
        for section, pattern in SECTION_PATTERNS.items():
            sections[section] = bool(re.search(pattern, self.resume_lower, re.IGNORECASE))
        return sections

    def compute_job_match(self, skills_found: list):
        if not self.jd:
            base = min(40 + len(skills_found) * 3, 75)
            return base, skills_found[:5], []
        try:
            vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=500)
            tfidf_matrix = vectorizer.fit_transform([self.resume, self.jd])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            match_pct = round(similarity * 100)
            jd_lower = self.jd.lower()
            matched = [s for s in skills_found if s.lower() in jd_lower]
            weak = []
            if "experience" in self.jd.lower() and self.resume.lower().count("year") < 1:
                weak.append("Experience: No years of experience mentioned")
            if re.search(r'\d+%|\d+ percent', self.jd) and not re.search(r'\d+%|\d+ percent', self.resume):
                weak.append("Impact: JD expects metrics but resume has none")
            return match_pct, matched[:8], weak
        except:
            return 50, skills_found[:5], []

    def ats_check(self, sections: dict, skills_found: list) -> dict:
        score_parts = {}
        if self.jd:
            jd_words = set(word_tokenize(self.jd.lower())) - STOP_WORDS
            resume_words = set(word_tokenize(self.resume_lower)) - STOP_WORDS
            overlap = len(jd_words & resume_words)
            score_parts["keyword_match"] = min(int((overlap / max(len(jd_words), 1)) * 200), 100)
        else:
            score_parts["keyword_match"] = min(len(skills_found) * 8, 90)

        format_score = 100
        if len(self.resume) < 300:
            format_score -= 25
        if not sections.get("experience"):
            format_score -= 20
        if not sections.get("skills"):
            format_score -= 15
        score_parts["formatting"] = max(format_score, 0)
        section_count = sum(1 for v in sections.values() if v)
        score_parts["section_clarity"] = min(section_count * 15, 100)
        strong_verbs = [v for v in ATS_KEYWORDS["action_verbs"] if v in self.resume_lower]
        weak_verbs = [v for v in ATS_KEYWORDS["weak_verbs"] if v in self.resume_lower]
        verb_score = min(len(strong_verbs) * 10, 80) - min(len(weak_verbs) * 8, 40)
        score_parts["action_verbs"] = max(verb_score, 0)
        metric_patterns = [r'\d+%', r'\$\d+', r'\d+ (users|clients|projects)', r'(increased|reduced|improved).{1,30}\d+']
        metrics_found = sum(1 for p in metric_patterns if re.search(p, self.resume, re.IGNORECASE))
        score_parts["quantified_results"] = min(metrics_found * 20, 100)
        total = round(sum(score_parts.values()) / len(score_parts))
        issues = []
        if score_parts["keyword_match"] < 50:
            issues.append("Low keyword overlap — add more role-specific terms")
        if len(weak_verbs) > 2:
            issues.append(f"Weak verbs found: {', '.join(weak_verbs[:3])} — replace with stronger verbs")
        if score_parts["quantified_results"] < 40:
            issues.append("No quantified achievements — add metrics like improved speed by 40%")
        if not sections.get("skills"):
            issues.append("No Skills section found — ATS may miss your technical skills")
        return {
            "total": total,
            "breakdown": score_parts,
            "issues": issues,
            "strong_verbs_found": strong_verbs[:5],
            "weak_verbs_found": weak_verbs[:5],
            "metrics_found": metrics_found
        }

    def compute_score(self, sections, skills, ats, match_pct) -> tuple:
        breakdown = {
            "content": self._score_content(sections),
            "impact": self._score_impact(),
            "skills": min(len(skills) * 6, 100),
            "formatting": ats["breakdown"].get("formatting", 50),
            "keywords": ats["breakdown"].get("keyword_match", 50),
        }
        weights = {"content": 0.25, "impact": 0.25, "skills": 0.20, "formatting": 0.15, "keywords": 0.15}
        total = round(sum(breakdown[k] * weights[k] for k in breakdown))
        return total, breakdown

    def _score_content(self, sections) -> int:
        score = 0
        if sections.get("experience"): score += 30
        if sections.get("education"):  score += 20
        if sections.get("skills"):     score += 20
        if sections.get("projects"):   score += 20
        if sections.get("summary"):    score += 10
        words = len(self.resume.split())
        if 400 <= words <= 1200:       score += 10
        return min(score, 100)

    def _score_impact(self) -> int:
        score = 0
        metric_patterns = [r'\d+%', r'\$\d+', r'\d+ (users|clients|projects)', r'(increased|reduced|improved).{1,30}\d+']
        for p in metric_patterns:
            matches = len(re.findall(p, self.resume, re.IGNORECASE))
            score += matches * 15
        action_verbs = sum(1 for v in ATS_KEYWORDS["action_verbs"] if v in self.resume_lower)
        score += action_verbs * 5
        return min(score, 100)

    def detect_level(self) -> str:
        years_matches = re.findall(r'(\d+)\+?\s*years?\s*(of\s+)?(experience|exp)', self.resume_lower)
        max_years = max([int(m[0]) for m in years_matches], default=0)
        if max_years == 0:
            return "Fresher"
        elif max_years <= 2: return "Junior"
        elif max_years <= 5: return "Mid-Level"
        elif max_years <= 8: return "Senior"
        else: return "Lead/Principal"

    def detect_domain(self, skills_found: list) -> str:
        skills_lower = [s.lower() for s in skills_found]
        domain_scores = {}
        domain_keywords = {
            "Data Science": ["machine learning", "deep learning", "tensorflow", "pytorch"],
            "Data Analysis": ["sql", "tableau", "power bi", "excel", "statistics"],
            "Web Development": ["react", "next.js", "vue", "angular", "html", "css"],
            "Backend Engineering": ["node.js", "flask", "django", "spring", "api"],
            "Software Engineering": ["java", "c++", "algorithms", "data structures"],
            "DevOps": ["docker", "kubernetes", "aws", "ci/cd", "linux"],
        }
        for domain, keywords in domain_keywords.items():
            domain_scores[domain] = sum(1 for kw in keywords if kw in skills_lower or kw in self.resume_lower)
        best = max(domain_scores, key=domain_scores.get)
        return best if domain_scores[best] > 0 else "Software Engineering"

    def analyze_bullets(self) -> dict:
        bullets = re.findall(r'[•\-\*]\s*(.+)', self.resume)
        if not bullets:
            sentences = sent_tokenize(self.resume)
            bullets = [s for s in sentences if len(s.split()) > 5][:10]
        strong, weak, vague = [], [], []
        for bullet in bullets[:15]:
            bl = bullet.lower()
            has_metric = bool(re.search(r'\d+%|\d+ (users|clients|projects)|\$\d+', bl))
            has_strong_verb = any(v in bl for v in ATS_KEYWORDS["action_verbs"])
            has_weak_verb = any(v in bl for v in ATS_KEYWORDS["weak_verbs"])
            if has_metric and has_strong_verb:
                strong.append(bullet.strip())
            elif has_weak_verb or len(bullet.split()) < 5:
                weak.append(bullet.strip())
            else:
                vague.append(bullet.strip())
        return {"strong": strong[:3], "weak": weak[:3], "vague": vague[:3]}

    def detect_weak_content(self) -> list:
        flags = []
        for buzzword in ATS_KEYWORDS["buzzwords_red_flags"]:
            if buzzword in self.resume_lower:
                flags.append({"type": "Buzzword", "text": buzzword, "reason": "Generic buzzword — replace with specific evidence"})
        vague_patterns = [
            (r"responsible for \w+ing", "Vague", "Replace with a strong action verb"),
            (r"worked (with|on) .{3,30}", "Weak", "Say what you built or achieved"),
            (r"good knowledge of", "Generic", "Prove knowledge with projects"),
            (r"familiar with", "Weak", "Show usage instead of claiming familiarity"),
        ]
        for pattern, flag_type, reason in vague_patterns:
            matches = re.findall(pattern, self.resume_lower)
            for match in matches[:1]:
                flags.append({"type": flag_type, "text": match, "reason": reason})
        return flags[:6]

    def internship_readiness(self, sections, skills_found, level) -> int:
        score = 0
        if sections.get("projects"):     score += 30
        if sections.get("skills"):       score += 20
        if sections.get("education"):    score += 15
        if sections.get("experience"):   score += 10
        if sections.get("achievements"): score += 10
        score += min(len(skills_found) * 2, 15)
        if level in ["Fresher", "Junior"]: score = min(score + 10, 100)
        return min(score, 100)