import json
from pathlib import Path
from typing import Any, Dict
import uuid
from fastapi import APIRouter, Depends, status

import api.config as config
from api.db import get_db, record_outbox, utc_now_iso
from api.errors import APIException
from api.models import ReferralRequest
from api.roles import DemoRole, get_demo_role

router = APIRouter(prefix="/api/referrals", tags=["referrals"])

_HOSPITALS_PATH = Path(__file__).resolve().parent.parent.parent / "hospitals" / "hospitals.json"


@router.post("", status_code=status.HTTP_201_CREATED)
def create_referral(
    req: ReferralRequest,
    role: DemoRole = Depends(get_demo_role),
) -> Dict[str, Any]:
    if config.TARGET_MODE:
        raise APIException(
            status_code=403,
            code="sync_target_read_only",
            message="Target mode instances are read-only.",
        )

    with get_db() as conn:
        assessment = conn.execute("SELECT * FROM assessments WHERE id = ?", (req.assessment_id,)).fetchone()
        if not assessment:
            raise APIException(status_code=404, code="not_found", message="Assessment not found.")

        patient = conn.execute("SELECT * FROM patients WHERE id = ?", (assessment["patient_id"],)).fetchone()
        if not patient:
            raise APIException(status_code=404, code="not_found", message="Patient not found.")

        # Find hospital
        hospital_info = None
        if _HOSPITALS_PATH.exists():
            with open(_HOSPITALS_PATH, "r", encoding="utf-8") as f:
                hospitals = json.load(f)
                for h in hospitals:
                    if h.get("id") == req.hospital_id:
                        hospital_info = h
                        break

        if not hospital_info:
            hospital_info = {
                "id": req.hospital_id,
                "name": "Simulated Referral Center",
                "phone": "+91-11-00000000",
                "area": "Simulated Area",
                "fictional": True,
                "source": "simulated",
            }

        # Findings
        findings_rows = conn.execute(
            "SELECT rule_id, plain_message FROM findings WHERE assessment_id = ?",
            (req.assessment_id,),
        ).fetchall()
        fired_rules = [f"{r['rule_id']}: {r['plain_message']}" for r in findings_rows]

        # Effective priority and state
        finalisation = conn.execute(
            "SELECT final_priority FROM finalisations WHERE assessment_id = ? ORDER BY at DESC LIMIT 1",
            (req.assessment_id,),
        ).fetchone()

        if finalisation:
            finalisation_state = "FINALISED"
            effective_priority = finalisation["final_priority"]
        else:
            finalisation_state = "PRELIMINARY"
            effective_priority = assessment["priority"]
            escalations = conn.execute(
                "SELECT to_priority FROM escalations WHERE assessment_id = ?",
                (req.assessment_id,),
            ).fetchall()
            p_ranks = {"EMERGENCY": 1, "URGENT": 2, "ROUTINE": 3}
            for esc in escalations:
                if p_ranks.get(esc["to_priority"], 9) < p_ranks.get(effective_priority, 9):
                    effective_priority = esc["to_priority"]

        inputs = json.loads(assessment["inputs_json"])
        now = utc_now_iso()
        referral_id = str(uuid.uuid4())

        summary = {
            "referral_id": referral_id,
            "assessment_id": req.assessment_id,
            "display_code": patient["display_code"],
            "age": patient["age"],
            "sex": patient["sex"],
            "pregnant": bool(patient["pregnant"]),
            "symptoms": inputs.get("symptom_codes", []),
            "free_text": inputs.get("free_text"),
            "vitals": {
                "temp_c": inputs.get("temp_c"),
                "sbp": inputs.get("sbp"),
                "dbp": inputs.get("dbp"),
                "spo2": inputs.get("spo2"),
                "pulse": inputs.get("pulse"),
                "rr": inputs.get("rr"),
                "avpu": inputs.get("avpu"),
                "on_oxygen": inputs.get("on_oxygen"),
                "recorded_at": assessment["created_at"],
            },
            "news2_total": assessment["news2_total"],
            "fired_rules": fired_rules,
            "effective_priority": effective_priority,
            "finalisation_state": finalisation_state,
            "hospital": hospital_info,
            "generated_at": now,
            "simulated": True,
            "disclaimer": "SIMULATED — not transmitted to anyone",
        }

        conn.execute(
            """
            INSERT INTO referrals (id, assessment_id, hospital_id, summary_json, simulated, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
            """,
            (referral_id, req.assessment_id, req.hospital_id, json.dumps(summary), now),
        )

        record_outbox(conn, "referral", referral_id, summary)

    return summary
