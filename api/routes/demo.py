from typing import Any, Dict
from fastapi import APIRouter

from api.db import reset_db
from seed.seed_data import seed_database

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/reset")
def reset_and_seed_demo() -> Dict[str, Any]:
    reset_db()
    count = seed_database()
    return {
        "status": "reset_successful",
        "seeded_scenarios": count,
        "message": "All tables truncated and 4 canonical scenarios re-seeded.",
    }

