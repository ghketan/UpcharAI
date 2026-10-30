import json
from pathlib import Path
from typing import Any, List
from fastapi import APIRouter

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])

_HOSPITALS_PATH = Path(__file__).resolve().parent.parent.parent / "hospitals" / "hospitals.json"


@router.get("", response_model=List[dict])
def get_hospitals() -> List[dict]:
    if not _HOSPITALS_PATH.exists():
        return []
    with open(_HOSPITALS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

