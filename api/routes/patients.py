import json
import uuid
from typing import Any, Dict
from fastapi import APIRouter, Depends, status

import api.config as config
from api.db import get_db, record_outbox, utc_now_iso
from api.errors import APIException
from api.models import CreatePatientRequest, PatientResponse
from api.roles import DemoRole, get_demo_role

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PatientResponse)
def create_patient(
    req: CreatePatientRequest,
    role: DemoRole = Depends(get_demo_role),
) -> PatientResponse:
    # Target mode restriction (SEC-007, 03 §6)
    if config.TARGET_MODE:
        raise APIException(
            status_code=403,
            code="sync_target_read_only",
            message="Target mode instances are read-only and cannot create patients directly.",
        )

    patient_id = req.id or str(uuid.uuid4())
    now = utc_now_iso()

    with get_db() as conn:
        # Check idempotency
        existing = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
        if existing:
            return PatientResponse(
                patient_id=existing["id"],
                display_code=existing["display_code"],
                age=existing["age"],
                sex=existing["sex"],
                pregnant=bool(existing["pregnant"]),
                arrived_at=existing["arrived_at"],
                created_by_role=existing["created_by_role"],
            )

        conn.execute(
            """
            INSERT INTO patients (id, display_code, age, sex, pregnant, arrived_at, created_by_role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                req.display_code,
                req.age,
                req.sex,
                1 if req.pregnant else 0,
                now,
                role.value,
            ),
        )

        outbox_payload = {
            "id": patient_id,
            "display_code": req.display_code,
            "age": req.age,
            "sex": req.sex,
            "pregnant": req.pregnant,
            "arrived_at": now,
            "created_by_role": role.value,
        }
        record_outbox(conn, "patient", patient_id, outbox_payload)

    return PatientResponse(
        patient_id=patient_id,
        display_code=req.display_code,
        age=req.age,
        sex=req.sex,
        pregnant=req.pregnant,
        arrived_at=now,
        created_by_role=role.value,
    )


@router.get("/{patient_id}")
def get_patient_history(patient_id: str) -> Dict[str, Any]:
    with get_db() as conn:
        patient = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
        if not patient:
            raise APIException(
                status_code=404,
                code="patient_not_found",
                message=f"Patient {patient_id} not found.",
            )

        assessments_rows = conn.execute(
            "SELECT * FROM assessments WHERE patient_id = ? ORDER BY seq ASC",
            (patient_id,),
        ).fetchall()

        assessments_list = []
        for a in assessments_rows:
            a_id = a["id"]
            findings_rows = conn.execute(
                """
                SELECT rule_id, tier, plain_message, observed_value FROM findings 
                WHERE assessment_id = ? 
                ORDER BY CASE tier WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END ASC, rule_id ASC
                """,
                (a_id,),
            ).fetchall()

            escalations_rows = conn.execute(
                "SELECT id, to_priority, reason, role, at FROM escalations WHERE assessment_id = ? ORDER BY at ASC",
                (a_id,),
            ).fetchall()

            finalisations_rows = conn.execute(
                "SELECT id, final_priority, reason, role, at FROM finalisations WHERE assessment_id = ? ORDER BY at ASC",
                (a_id,),
            ).fetchall()

            # Calculate effective priority for this assessment
            eff_priority = a["priority"]
            state = "PRELIMINARY"
            if finalisations_rows:
                state = "FINALISED"
                eff_priority = finalisations_rows[-1]["final_priority"]
            elif escalations_rows:
                # Upward escalation if higher
                p_ranks = {"EMERGENCY": 1, "URGENT": 2, "ROUTINE": 3}
                for esc in escalations_rows:
                    if p_ranks.get(esc["to_priority"], 9) < p_ranks.get(eff_priority, 9):
                        eff_priority = esc["to_priority"]

            assessments_list.append({
                "assessment_id": a_id,
                "seq": a["seq"],
                "inputs": json.loads(a["inputs_json"]),
                "confirmed_implausible": bool(a["confirmed_implausible"]),
                "news2_total": a["news2_total"],
                "news2_params_scored": a["news2_params_scored"],
                "priority": a["priority"],
                "effective_priority": eff_priority,
                "state": state,
                "flags": json.loads(a["flags_json"]),
                "missing": json.loads(a["missing_json"]),
                "rule_set_version": a["rule_set_version"],
                "clinical_review_status": a["clinical_review_status"],
                "suggested_action": a["suggested_action"],
                "created_at": a["created_at"],
                "role": a["role"],
                "findings": [dict(f) for f in findings_rows],
                "escalations": [dict(e) for e in escalations_rows],
                "finalisations": [dict(fn) for fn in finalisations_rows],
            })

    return {
        "patient": {
            "id": patient["id"],
            "display_code": patient["display_code"],
            "age": patient["age"],
            "sex": patient["sex"],
            "pregnant": bool(patient["pregnant"]),
            "arrived_at": patient["arrived_at"],
            "created_by_role": patient["created_by_role"],
        },
        "assessments": assessments_list,
    }
