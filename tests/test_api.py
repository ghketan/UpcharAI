import hashlib
import json
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from api.config import DB_PATH
from api.db import init_db, reset_db
from api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Run tests on an isolated temporary SQLite database."""
    test_db = tmp_path / "test_upcharai.db"
    monkeypatch.setattr("api.config.DB_PATH", test_db)
    init_db(test_db)
    yield
    reset_db(test_db)


def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "UpcharAI API"
    assert "Assists the clinician" in data["notice"]


def test_patient_registration_and_assessment():
    # 1. Register patient
    p_res = client.post(
        "/api/patients",
        headers={"X-Demo-Role": "NURSE"},
        json={
            "display_code": "P-TEST-01",
            "age": 42,
            "sex": "M",
            "pregnant": False,
        },
    )
    assert p_res.status_code == 201
    p_data = p_res.json()
    patient_id = p_data["patient_id"]
    assert p_data["display_code"] == "P-TEST-01"

    # 2. Add assessment
    a_res = client.post(
        f"/api/patients/{patient_id}/assessments",
        headers={"X-Demo-Role": "NURSE"},
        json={
            "temp_c": 37.0,
            "sbp": 120,
            "dbp": 80,
            "spo2": 98,
            "pulse": 80,
            "symptom_codes": ["FEVER"],
            "duration_days": 1,
        },
    )
    assert a_res.status_code == 201
    a_data = a_res.json()
    assert a_data["priority"] == "ROUTINE"
    assert a_data["state"] == "PRELIMINARY"
    assert a_data["seq"] == 1
    assessment_id = a_data["assessment_id"]

    # 3. Check history
    h_res = client.get(f"/api/patients/{patient_id}")
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert len(h_data["assessments"]) == 1
    assert h_data["assessments"][0]["assessment_id"] == assessment_id


def test_implausible_value_requires_confirmation():
    # Register patient
    p_res = client.post(
        "/api/patients",
        json={"display_code": "P-TEST-02", "age": 30, "sex": "F"},
    )
    patient_id = p_res.json()["patient_id"]

    # Attempt assessment with impossible temp 46.0 C
    a_res = client.post(
        f"/api/patients/{patient_id}/assessments",
        json={
            "temp_c": 46.0,
            "sbp": 120,
            "dbp": 80,
            "spo2": 98,
            "pulse": 80,
            "confirm_implausible": False,
        },
    )
    assert a_res.status_code == 422
    err = a_res.json()
    assert err["code"] == "implausible_value_needs_confirmation"
    assert err["retryable"] is True

    # Retry with confirm_implausible = True
    a_res2 = client.post(
        f"/api/patients/{patient_id}/assessments",
        json={
            "temp_c": 46.0,
            "sbp": 120,
            "dbp": 80,
            "spo2": 98,
            "pulse": 80,
            "confirm_implausible": True,
        },
    )
    assert a_res2.status_code == 201
    assert a_res2.json()["priority"] in ("EMERGENCY", "URGENT", "ROUTINE")


def test_role_enforcement_and_clinician_finalisation():
    # Register patient
    p_res = client.post(
        "/api/patients",
        headers={"X-Demo-Role": "NURSE"},
        json={"display_code": "P-TEST-03", "age": 50, "sex": "M"},
    )
    patient_id = p_res.json()["patient_id"]

    # Routine assessment
    a_res = client.post(
        f"/api/patients/{patient_id}/assessments",
        headers={"X-Demo-Role": "NURSE"},
        json={
            "temp_c": 37.0,
            "sbp": 120,
            "dbp": 80,
            "spo2": 98,
            "pulse": 75,
        },
    )
    a_id = a_res.json()["assessment_id"]

    # 1. Nurse attempts to finalise -> 403 Forbidden
    nurse_finalise = client.post(
        f"/api/assessments/{a_id}/finalise",
        headers={"X-Demo-Role": "NURSE"},
        json={"final_priority": "ROUTINE"},
    )
    assert nurse_finalise.status_code == 403
    assert nurse_finalise.json()["code"] == "role_forbidden"

    # 2. Nurse escalates to URGENT with valid reason
    nurse_esc = client.post(
        f"/api/assessments/{a_id}/escalate",
        headers={"X-Demo-Role": "NURSE"},
        json={"to_priority": "URGENT", "reason": "Patient appears very pale and weak"},
    )
    assert nurse_esc.status_code == 200
    assert nurse_esc.json()["effective_priority"] == "URGENT"

    # 3. Nurse attempts downward escalation (URGENT -> ROUTINE) -> 409
    nurse_down = client.post(
        f"/api/assessments/{a_id}/escalate",
        headers={"X-Demo-Role": "NURSE"},
        json={"to_priority": "URGENT", "reason": "Invalid escalation"},
    )
    assert nurse_down.status_code == 409
    assert nurse_down.json()["code"] == "not_an_escalation"

    # 4. Doctor finalises with changed priority WITHOUT reason -> 422 reason_required
    doc_finalise_no_reason = client.post(
        f"/api/assessments/{a_id}/finalise",
        headers={"X-Demo-Role": "DOCTOR"},
        json={"final_priority": "ROUTINE", "reason": ""},
    )
    assert doc_finalise_no_reason.status_code == 422
    assert doc_finalise_no_reason.json()["code"] == "reason_required"

    # 5. Doctor finalises with changed priority WITH reason -> 200
    doc_finalise = client.post(
        f"/api/assessments/{a_id}/finalise",
        headers={"X-Demo-Role": "DOCTOR"},
        json={"final_priority": "ROUTINE", "reason": "Examined by clinician; vitals stable, no pallor."},
    )
    assert doc_finalise.status_code == 200
    assert doc_finalise.json()["status"] == "finalised"

    # 5b. Nurse cannot escalate a finalised assessment -> 403 role_forbidden
    nurse_esc_finalised = client.post(
        f"/api/assessments/{a_id}/escalate",
        headers={"X-Demo-Role": "NURSE"},
        json={"to_priority": "EMERGENCY", "reason": "Attempting override of doctor"},
    )
    assert nurse_esc_finalised.status_code == 403
    assert nurse_esc_finalised.json()["code"] == "role_forbidden"

    # 6. Reassessment creates new seq and returns status to PRELIMINARY
    new_a = client.post(
        f"/api/patients/{patient_id}/assessments",
        headers={"X-Demo-Role": "NURSE"},
        json={"temp_c": 37.0, "sbp": 120, "dbp": 80, "spo2": 98, "pulse": 75},
    )
    assert new_a.status_code == 201
    assert new_a.json()["seq"] == 2
    assert new_a.json()["state"] == "PRELIMINARY"

    # 7. Escalating the older assessment (a_id) returns 409 stale_assessment
    stale_esc = client.post(
        f"/api/assessments/{a_id}/escalate",
        headers={"X-Demo-Role": "NURSE"},
        json={"to_priority": "EMERGENCY", "reason": "Late escalation attempt"},
    )
    assert stale_esc.status_code == 409
    assert stale_esc.json()["code"] == "stale_assessment"


def test_queue_ordering_dec_011():
    # Create 3 patients:
    # P1: Routine, flagged with INCOMPLETE (arrived 10:00)
    # P2: Emergency (arrived 10:05)
    # P3: Routine, unflagged (arrived 09:55)
    # P4: Urgent (arrived 10:10)

    # Emergency patient
    p_emerg = client.post(
        "/api/patients",
        json={"display_code": "P-EMERG", "age": 60, "sex": "M"},
    ).json()["patient_id"]
    client.post(
        f"/api/patients/{p_emerg}/assessments",
        json={"temp_c": 37.0, "sbp": 85, "dbp": 55, "spo2": 98, "pulse": 80},  # SBP <= 90 -> RF-E01 Emergency
    )

    # Urgent patient
    p_urg = client.post(
        "/api/patients",
        json={"display_code": "P-URG", "age": 8, "sex": "M"},  # Child -> FLOOR-01 Urgent
    ).json()["patient_id"]
    client.post(
        f"/api/patients/{p_urg}/assessments",
        json={"temp_c": 37.0, "sbp": 110, "dbp": 70, "spo2": 98, "pulse": 80},
    )

    # Routine incomplete
    p_rout_incomp = client.post(
        "/api/patients",
        json={"display_code": "P-ROUT-INCOMP", "age": 30, "sex": "M"},
    ).json()["patient_id"]
    client.post(
        f"/api/patients/{p_rout_incomp}/assessments",
        json={"temp_c": 37.0, "sbp": None, "dbp": None, "spo2": 98, "pulse": 80},  # missing SBP/DBP -> INCOMPLETE
    )

    # Routine complete
    p_rout_comp = client.post(
        "/api/patients",
        json={"display_code": "P-ROUT-COMP", "age": 30, "sex": "M"},
    ).json()["patient_id"]
    client.post(
        f"/api/patients/{p_rout_comp}/assessments",
        json={"temp_c": 37.0, "sbp": 120, "dbp": 80, "spo2": 98, "pulse": 80},
    )

    # Fetch queue
    q_res = client.get("/api/queue")
    assert q_res.status_code == 200
    items = q_res.json()["items"]
    display_codes = [it["display_code"] for it in items]

    # Verification:
    # 1. EMERGENCY (P-EMERG)
    # 2. URGENT (P-URG)
    # 3. ROUTINE flagged (P-ROUT-INCOMP) before ROUTINE unflagged (P-ROUT-COMP)
    assert display_codes == ["P-EMERG", "P-URG", "P-ROUT-INCOMP", "P-ROUT-COMP"]


def test_referral_generation_and_hospitals():
    h_res = client.get("/api/hospitals")
    assert h_res.status_code == 200
    hospitals = h_res.json()
    assert len(hospitals) >= 1
    hosp_id = hospitals[0]["id"]

    # Register and assess an emergency patient
    p_id = client.post(
        "/api/patients",
        json={"display_code": "P-SOS", "age": 55, "sex": "F"},
    ).json()["patient_id"]

    a_id = client.post(
        f"/api/patients/{p_id}/assessments",
        json={
            "temp_c": 37.0,
            "sbp": 120,
            "dbp": 80,
            "spo2": 88,
            "pulse": 105,
            "symptom_codes": ["CHEST_PAIN"],
        },
    ).json()["assessment_id"]

    ref_res = client.post(
        "/api/referrals",
        json={"assessment_id": a_id, "hospital_id": hosp_id},
    )
    assert ref_res.status_code == 201
    summary = ref_res.json()
    assert summary["display_code"] == "P-SOS"
    assert summary["simulated"] is True
    assert "SIMULATED — not transmitted to anyone" in summary["disclaimer"]
    assert summary["effective_priority"] == "EMERGENCY"


def test_demo_reset_and_repeatable_hash():
    """VM-09 / T-015: Reset and seed three times -> identical output hashes."""
    hashes = []
    for _ in range(3):
        reset_res = client.post("/api/demo/reset")
        assert reset_res.status_code == 200
        assert reset_res.json()["seeded_scenarios"] == 4

        q_res = client.get("/api/queue")
        dumped = json.dumps(q_res.json()["items"], sort_keys=True)
        h = hashlib.sha256(dumped.encode("utf-8")).hexdigest()
        hashes.append(h)

    assert hashes[0] == hashes[1] == hashes[2]


def test_chatbot_guardrails_prefilter():
    """VM-18 / T-013: Red flag phrases in Hindi and English trigger immediate fixed escalation text."""
    # English red flag
    en_res = client.post(
        "/api/chat",
        json={"message": "I have severe chest pain and cannot breathe"},
    )
    assert en_res.status_code == 200
    en_data = en_res.json()
    assert en_data["escalated"] is True
    assert "EMERGENCY ALERT" in en_data["reply"]

    # Hindi red flag
    hi_res = client.post(
        "/api/chat",
        json={"message": "सीने में दर्द बहुत तेज है और सांस लेने में तकलीफ हो रही है"},
    )
    assert hi_res.status_code == 200
    hi_data = hi_res.json()
    assert hi_data["escalated"] is True
    assert "आपातकालीन सूचना" in hi_data["reply"]

    # Non-emergency general question (offline static fallback)
    gen_res = client.post(
        "/api/chat",
        json={"message": "How much water should I drink daily?"},
    )
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["escalated"] is False
    assert "general health" in gen_data["reply"].lower()

    # Rate limiting test: up to 10 requests allowed, 11th triggers 429
    hit_limit = False
    for _ in range(12):
        r = client.post("/api/chat", json={"message": "How much water should I drink daily?"})
        if r.status_code == 429:
            hit_limit = True
            assert r.json()["code"] == "rate_limit_exceeded"
            break
    assert hit_limit is True


def test_preview_and_rules_config_endpoints():
    # 1. Rules config
    cfg_res = client.get("/api/rules/config")
    assert cfg_res.status_code == 200
    cfg_data = cfg_res.json()
    assert cfg_data["rule_set_version"] == "v1"
    assert "temp_c" in cfg_data["plausibility"]
    assert "CHEST_PAIN" in cfg_data["symptom_codes"]

    # 2. Preview assessment (stateless dry-run)
    prev_res = client.post(
        "/api/assessments/preview",
        json={
            "age": 55,
            "sex": "M",
            "temp_c": 37.0,
            "sbp": 88,
            "dbp": 55,
            "spo2": 89,
            "pulse": 115,
            "symptom_codes": ["CHEST_PAIN"],
        },
    )
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert prev_data["priority"] == "EMERGENCY"
    assert prev_data["news2_total"] >= 7
    assert len(prev_data["findings"]) >= 1


def test_sync_outbox_inspection_and_protocols():
    # 1. Chat protocols endpoint
    proto_res = client.get("/api/chat/protocols")
    assert proto_res.status_code == 200
    protocols = proto_res.json()
    assert len(protocols) == 4
    assert protocols[0]["id"] == "chest_pain"

    # 2. Outbox inspection endpoint
    # Create patient to create an outbox record
    client.post("/api/patients", json={"display_code": "P-OUTBOX-TEST", "age": 40, "sex": "F"})
    outbox_res = client.get("/api/sync/outbox")
    assert outbox_res.status_code == 200
    items = outbox_res.json()["items"]
    assert len(items) >= 1
    first_item = items[0]

    # 3. Retry endpoint
    retry_res = client.post(f"/api/sync/outbox/{first_item['id']}/retry")
    assert retry_res.status_code == 200
    assert retry_res.json()["status"] == "reset_to_pending"
    assert retry_res.json()["item"]["state"] == "PENDING"

