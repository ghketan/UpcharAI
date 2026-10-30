import json
import uuid
import pytest
from fastapi.testclient import TestClient

import api.config as config
from api.db import init_db, record_outbox, reset_db
from api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_sync.db"
    monkeypatch.setattr(config, "DB_PATH", test_db)
    init_db(test_db)
    yield
    reset_db(test_db)


def test_sync_status_and_push(monkeypatch):
    # Set mock sync target
    monkeypatch.setattr(config, "SYNC_TARGET_URL", "mock")

    # Initially 0 pending
    res = client.get("/api/sync/status")
    assert res.status_code == 200
    assert res.json()["pending"] == 0

    # Create a patient (which writes an outbox row)
    client.post("/api/patients", json={"display_code": "P-SYNC-1", "age": 30, "sex": "M"})

    # Check pending is now 1
    res = client.get("/api/sync/status")
    assert res.status_code == 200
    assert res.json()["pending"] == 1

    # Push sync outbox
    push_res = client.post("/api/sync/push")
    assert push_res.status_code == 200
    assert push_res.json()["processed"] == 1

    # Now pending is 0
    res = client.get("/api/sync/status")
    assert res.status_code == 200
    assert res.json()["pending"] == 0
    assert res.json()["last_success_at"] is not None


def test_target_mode_ingest_lifecycle(monkeypatch):
    # Enable TARGET_MODE
    monkeypatch.setattr(config, "TARGET_MODE", True)

    # 1. Target mode refuses creation endpoints (SEC-007, 03 §6)
    create_p = client.post("/api/patients", json={"display_code": "P-FORBIDDEN", "age": 30, "sex": "M"})
    assert create_p.status_code == 403
    assert create_p.json()["code"] == "sync_target_read_only"

    p_uuid = str(uuid.uuid4())
    a_uuid = str(uuid.uuid4())

    # 2. Ingest assessment before parent patient -> 409 parent_missing
    a_payload = {
        "id": a_uuid,
        "patient_id": p_uuid,
        "seq": 1,
        "inputs": {"temp_c": 37.0},
        "news2_total": 0,
        "news2_params_scored": 1,
        "priority": "ROUTINE",
        "flags": ["INCOMPLETE"],
        "missing": ["sbp", "dbp", "spo2", "pulse"],
        "findings": [],
        "rule_set_version": "v1",
        "clinical_review_status": "NONE",
        "suggested_action": "Routine check",
        "created_at": "2026-10-30T12:00:00Z",
    }
    ingest_a_fail = client.post(
        "/api/sync/ingest",
        json={"entity": "assessment", "entity_id": a_uuid, "payload": a_payload},
    )
    assert ingest_a_fail.status_code == 409
    assert ingest_a_fail.json()["code"] == "parent_missing"

    # 3. Ingest parent patient -> success
    p_payload = {
        "id": p_uuid,
        "display_code": "P-TARGET-01",
        "age": 45,
        "sex": "F",
        "pregnant": False,
        "arrived_at": "2026-10-30T11:50:00Z",
    }
    ingest_p = client.post(
        "/api/sync/ingest",
        json={"entity": "patient", "entity_id": p_uuid, "payload": p_payload},
    )
    assert ingest_p.status_code == 200
    assert ingest_p.json()["status"] == "ingested"

    # 4. Repeat ingest of patient -> duplicate (idempotent)
    ingest_p_dup = client.post(
        "/api/sync/ingest",
        json={"entity": "patient", "entity_id": p_uuid, "payload": p_payload},
    )
    assert ingest_p_dup.status_code == 200
    assert ingest_p_dup.json()["status"] == "duplicate"

    # 5. Ingest assessment now that parent exists -> success
    ingest_a = client.post(
        "/api/sync/ingest",
        json={"entity": "assessment", "entity_id": a_uuid, "payload": a_payload},
    )
    assert ingest_a.status_code == 200
    assert ingest_a.json()["status"] == "ingested"

    # 6. Ingest escalation
    esc_uuid = str(uuid.uuid4())
    esc_payload = {
        "id": esc_uuid,
        "assessment_id": a_uuid,
        "to_priority": "URGENT",
        "reason": "Escalated on target",
        "at": "2026-10-30T12:05:00Z",
    }
    ingest_esc = client.post(
        "/api/sync/ingest",
        json={"entity": "escalation", "entity_id": esc_uuid, "payload": esc_payload},
    )
    assert ingest_esc.status_code == 200
    assert ingest_esc.json()["status"] == "ingested"

    # 7. Ingest finalisation
    fn_uuid = str(uuid.uuid4())
    fn_payload = {
        "id": fn_uuid,
        "assessment_id": a_uuid,
        "final_priority": "URGENT",
        "reason": "Doctor confirmed urgent",
        "at": "2026-10-30T12:10:00Z",
    }
    ingest_fn = client.post(
        "/api/sync/ingest",
        json={"entity": "finalisation", "entity_id": fn_uuid, "payload": fn_payload},
    )
    assert ingest_fn.status_code == 200
    assert ingest_fn.json()["status"] == "ingested"

    # 8. Ingest referral
    ref_uuid = str(uuid.uuid4())
    ref_payload = {
        "referral_id": ref_uuid,
        "assessment_id": a_uuid,
        "hospital": {"id": "HOSP-001"},
        "generated_at": "2026-10-30T12:15:00Z",
    }
    ingest_ref = client.post(
        "/api/sync/ingest",
        json={"entity": "referral", "entity_id": ref_uuid, "payload": ref_payload},
    )
    assert ingest_ref.status_code == 200
    assert ingest_ref.json()["status"] == "ingested"

