import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = Path(os.getenv("UPCHARAI_DB_PATH", str(BASE_DIR / "upcharai.db")))
TARGET_MODE = os.getenv("TARGET_MODE", "0") == "1"
SYNC_TARGET_URL = os.getenv("SYNC_TARGET_URL", "http://localhost:8001")
GROQ_API_KEY = (
    os.getenv("GROQ_API_KEY")
    or os.getenv("LLM_API_KEY")
    or "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"
)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_API_KEY = GROQ_API_KEY or GEMINI_API_KEY or ""


def get_db_path() -> Path:
    return DB_PATH
