"""Application settings loaded from environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend/ directory (one level up from app/)
load_dotenv(Path(__file__).parent.parent / ".env")


class Settings:
    APP_NAME: str = "AI Mock Interview API"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # LLM (Gemini)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")


    # Code execution (Judge0 via RapidAPI)
    JUDGE0_API_KEY: str = os.getenv("JUDGE0_API_KEY", "")
    JUDGE0_API_HOST: str = "judge0-ce.p.rapidapi.com"


settings = Settings()