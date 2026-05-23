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
_DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "https://mock-with-ai.is-a.dev,"
    "https://mock-with-ai.vercel.app"
)


def _truthy(val: str) -> bool:
    return val.lower() in ("1", "true", "yes", "on")


class Settings:
    APP_NAME: str = "AI Mock Interview API"

    # CORS — comma-separated string in env, parsed to list here.
    CORS_ORIGINS: list[str] = _parse_origins(
        os.getenv("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS)
    )

    # ---- LLM providers (all optional individually; router picks whichever is set) ----
    # Order in the router is: Groq → Cerebras → OpenRouter → Gemini.

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    CEREBRAS_MODEL: str = os.getenv("CEREBRAS_MODEL", "llama-3.3-70b")

    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv(
        "OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"
    )

    # Existing Gemini config (kept for last-resort fallback).
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # ---- LLM cache ----
    LLM_CACHE_ENABLED: bool = _truthy(os.getenv("LLM_CACHE_ENABLED", "true"))
    LLM_CACHE_DB_PATH: str = os.getenv(
        "LLM_CACHE_DB_PATH",
        str(Path(__file__).parent.parent / "data" / "llm_cache.db"),
    )
    # Cosine similarity floor for a semantic cache hit. Tuned conservatively.
    LLM_CACHE_THRESHOLD: float = float(os.getenv("LLM_CACHE_THRESHOLD", "0.92"))
    # Skip semantic match for queries shorter than this many characters
    # (one-word queries are too generic to safely match).
    LLM_CACHE_MIN_QUERY_LEN: int = int(os.getenv("LLM_CACHE_MIN_QUERY_LEN", "8"))
    # Embedder model used for semantic match.
    LLM_CACHE_EMBED_MODEL: str = os.getenv(
        "LLM_CACHE_EMBED_MODEL", "BAAI/bge-small-en-v1.5"
    )

    # ---- Code execution (Judge0 via RapidAPI) ----
    JUDGE0_API_KEY: str = os.getenv("JUDGE0_API_KEY", "")
    JUDGE0_API_HOST: str = os.getenv("JUDGE0_API_HOST", "judge0-ce.p.rapidapi.com")


settings = Settings()
