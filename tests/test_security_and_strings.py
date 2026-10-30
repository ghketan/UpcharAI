from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from api.db import init_db
from api.main import app

client = TestClient(app)

FORBIDDEN_PATTERNS = [
    "clinically validated",
    "safe patient",
    "ambulance dispatched",
    "hospital notified",
    "guarantee",
    "first of its kind",
]


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def test_target_mode_security():
    """SEC-007 / VM-23: Ingest is forbidden/404 when TARGET_MODE=0."""
    res = client.post(
        "/api/sync/ingest",
        json={"entity": "patient", "entity_id": "foo", "payload": {}},
    )
    assert res.status_code == 404
    assert res.json()["code"] == "not_found"


def test_error_response_no_patient_field_leak():
    """SEC-002 / VM-15: Error payloads never echo confidential patient fields."""
    # Trigger 404
    res = client.get("/api/patients/non-existent-uuid-12345")
    assert res.status_code == 404
    body = res.json()
    assert "name" not in body
    assert "diagnosis" not in body
    assert "code" in body and "message" in body


def test_codebase_forbidden_strings():
    """SEC-006 / VM-20: Scan api/ and engine/ for forbidden marketing/clinical claims."""
    project_root = Path(__file__).resolve().parent.parent
    checked_dirs = [project_root / "api", project_root / "engine"]

    for d in checked_dirs:
        for py_file in d.rglob("*.py"):
            text = py_file.read_text(encoding="utf-8").lower()
            for pattern in FORBIDDEN_PATTERNS:
                assert pattern not in text, f"Forbidden string '{pattern}' found in {py_file}"


def test_no_hardcoded_secrets():
    """SEC-005 / VM-22: Scan repository for hardcoded API keys."""
    project_root = Path(__file__).resolve().parent.parent
    target_dirs = [project_root / "api", project_root / "engine", project_root / "seed"]

    gemini_key_prefix = "AI" + "zaSy"
    openai_key_prefix = "s" + "k-"

    for d in target_dirs:
        for py_file in d.rglob("*.py"):
            text = py_file.read_text(encoding="utf-8")
            assert gemini_key_prefix not in text, f"Potential Gemini API key in {py_file}"
            assert openai_key_prefix not in text, f"Potential OpenAI key in {py_file}"
