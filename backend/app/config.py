"""Application settings loaded from environment variables."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend/ directory (one level up from app/)
load_dotenv(Path(__file__).parent.parent / ".env")


def _parse_origins(raw: str) -> list[str]:
    """Split a comma-separated origins string into a clean list."""
    return [o.strip() for o in raw.split(",") if o.strip()]


# Default origins cover local dev + the two prod hosts.
# Override in Railway by setting CORS_ORIGINS="https://a.com,https://b.com".
_DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "https://mock-with-ai.is-a.dev,"
    "https://mock-with-ai.vercel.app"
)


class Settings:
    APP_NAME: str = "AI Mock Interview API"

    # CORS — comma-separated string in env, parsed to list here.
    CORS_ORIGINS: list[str] = _parse_origins(
        os.getenv("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS)
    )

    # LLM (Gemini)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

    # Code execution (Judge0 via RapidAPI)
    JUDGE0_API_KEY: str = os.getenv("JUDGE0_API_KEY", "")
    JUDGE0_API_HOST: str = os.getenv("JUDGE0_API_HOST", "judge0-ce.p.rapidapi.com")


settings = Settings()