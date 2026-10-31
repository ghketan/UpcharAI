import json
from pathlib import Path
from typing import Any, List
from fastapi import APIRouter, Depends

from api.roles import DemoRole, get_demo_role

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])

_HOSPITALS_PATH = Path(__file__).resolve().parent.parent.parent / "hospitals" / "hospitals.json"


@router.get("", response_model=List[dict])
def get_hospitals(_role: DemoRole = Depends(get_demo_role)) -> List[dict]:
    if not _HOSPITALS_PATH.exists():
        return []
    with open(_HOSPITALS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

