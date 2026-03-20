import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = 86400

    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/resumeai")
    DB_NAME = "resumeai"

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

    SPACY_MODEL = "en_core_web_sm"
    MAX_RESUME_LENGTH = 50000