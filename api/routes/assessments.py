import json
import uuid
from typing import Any, Dict
from fastapi import APIRouter, Depends, status

import api.config as config
from api.db import get_db, record_outbox, utc_now_iso
from api.errors import APIException
from api.models import (
    AssessmentFindingResponse,
    AssessmentResponse,
    CreateAssessmentRequest,
    EscalateRequest,
    FinaliseRequest,
)
from api.roles import DemoRole, get_demo_role, require_doctor
from engine.config import load_config
from engine.models import AssessmentInputs
from engine.plausibility import PlausibilityError
from engine.triage import evaluate_triage

router = APIRouter(prefix="/api", tags=["assessments"])

PRIORITY_RANKS = {
    "EMERGENCY": 1,
    "URGENT": 2,
    "ROUTINE": 3,
}


@router.post("/patients/{patient_id}/assessments", status_code=status.HTTP_201_CREATED, response_model=AssessmentResponse)
def create_assessment(
    patient_id: str,
    req: CreateAssessmentRequest,
    role: DemoRole = Depends(get_demo_role),
) -> AssessmentResponse:
    if config.TARGET_MODE:
        raise APIException(
            status_code=403,
            code="sync_target_read_only",
            message="Target mode instances are read-only and cannot create assessments directly.",
        )

    with get_db() as conn:
        # Check idempotency
        if req.id:
            existing = conn.execute("SELECT * FROM assessments WHERE id = ?", (req.id,)).fetchone()
            if existing:
                findings_rows = conn.execute(
                    "SELECT rule_id, tier, plain_message, observed_value FROM findings WHERE assessment_id = ?",
                    (existing["id"],),
                ).fetchall()
                inputs_data = json.loads(existing["inputs_json"])
                rule_cfg = load_config()
                # Reconstruct NEWS2 params
                news2_eval = evaluate_triage(
                    AssessmentInputs(**inputs_data, confirm_implausible=True),
                    rule_cfg,
                )
                return AssessmentResponse(
                    assessment_id=existing["id"],
                    patient_id=existing["patient_id"],
                    seq=existing["seq"],
                    priority=existing["priority"],
                    flags=json.loads(existing["flags_json"]),
                    missing=json.loads(existing["missing_json"]),
                    news2=news2_eval.news2.model_dump(),
                    findings=[AssessmentFindingResponse(**dict(f)) for f in findings_rows],
                    state="PRELIMINARY",
                    rule_set_version=existing["rule_set_version"],
                    clinical_review_status=existing["clinical_review_status"],
                    suggested_action=existing["suggested_action"],
                    created_at=existing["created_at"],
                    role=existing["role"],
                )

        # Check patient exists
        patient = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
        if not patient:
            raise APIException(
                status_code=404,
                code="patient_not_found",
                message=f"Patient {patient_id} not found.",
            )

        # Prepare inputs for triage engine
        engine_inputs = AssessmentInputs(
            age=patient["age"],
            sex=patient["sex"],
            pregnant=bool(patient["pregnant"]),
            temp_c=req.temp_c,
            sbp=req.sbp,
            dbp=req.dbp,
            spo2=req.spo2,
            pulse=req.pulse,
            rr=req.rr,
            avpu=req.avpu,
            on_oxygen=req.on_oxygen,
            symptom_codes=req.symptom_codes,
            duration_days=req.duration_days,
            history_codes=req.history_codes,
            free_text=req.free_text,
            confirm_implausible=req.confirm_implausible,
        )

        rule_cfg = load_config()
        try:
            triage_res = evaluate_triage(engine_inputs, rule_cfg)
        except PlausibilityError as e:
            raise APIException(
                status_code=422,
                code="implausible_value_needs_confirmation",
                message=str(e),
                retryable=True,
            )

        # Calculate seq
        seq_row = conn.execute(
            "SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM assessments WHERE patient_id = ?",
            (patient_id,),
        ).fetchone()
        seq = seq_row["next_seq"]

        assessment_id = req.id or str(uuid.uuid4())
        now = utc_now_iso()

        inputs_to_store = {
            "age": patient["age"],
            "sex": patient["sex"],
            "pregnant": bool(patient["pregnant"]),
            "temp_c": req.temp_c,
            "sbp": req.sbp,
            "dbp": req.dbp,
            "spo2": req.spo2,
            "pulse": req.pulse,
            "rr": req.rr,
            "avpu": req.avpu,
            "on_oxygen": req.on_oxygen,
            "symptom_codes": req.symptom_codes,
            "duration_days": req.duration_days,
            "history_codes": req.history_codes,
            "free_text": req.free_text,
        }

        conn.execute(
            """
            INSERT INTO assessments (
                id, patient_id, seq, inputs_json, confirmed_implausible,
                news2_total, news2_params_scored, priority, flags_json,
                missing_json, rule_set_version, clinical_review_status,
                suggested_action, created_at, role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                assessment_id,
                patient_id,
                seq,
                json.dumps(inputs_to_store),
                1 if req.confirm_implausible else 0,
                triage_res.news2.total,
                triage_res.news2.params_scored,
                triage_res.priority.value,
                json.dumps(triage_res.flags),
                json.dumps(triage_res.missing),
                triage_res.rule_set_version,
                triage_res.clinical_review_status,
                triage_res.suggested_action,
                now,
                role.value,
            ),
        )

        # Store findings
        for f in triage_res.findings:
            f_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO findings (id, assessment_id, rule_id, tier, plain_message, observed_value)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (f_id, assessment_id, f.rule_id, f.tier.value, f.plain_message, f.observed_value),
            )

        # Outbox row
        outbox_payload = {
            "id": assessment_id,
            "patient_id": patient_id,
            "seq": seq,
            "inputs": inputs_to_store,
            "confirmed_implausible": req.confirm_implausible,
            "news2_total": triage_res.news2.total,
            "news2_params_scored": triage_res.news2.params_scored,
            "priority": triage_res.priority.value,
            "flags": triage_res.flags,
            "missing": triage_res.missing,
            "findings": [f.model_dump() for f in triage_res.findings],
            "rule_set_version": triage_res.rule_set_version,
            "clinical_review_status": triage_res.clinical_review_status,
            "suggested_action": triage_res.suggested_action,
            "created_at": now,
            "role": role.value,
        }
        record_outbox(conn, "assessment", assessment_id, outbox_payload)

    return AssessmentResponse(
        assessment_id=assessment_id,
        patient_id=patient_id,
        seq=seq,
        priority=triage_res.priority.value,
        flags=triage_res.flags,
        missing=triage_res.missing,
        news2=triage_res.news2.model_dump(),
        findings=[
            AssessmentFindingResponse(
                rule_id=f.rule_id,
                tier=f.tier.value,
                plain_message=f.plain_message,
                observed_value=f.observed_value,
            )
            for f in triage_res.findings
        ],
        state="PRELIMINARY",
        rule_set_version=triage_res.rule_set_version,
        clinical_review_status=triage_res.clinical_review_status,
        suggested_action=triage_res.suggested_action,
        created_at=now,
        role=role.value,
    )


@router.post("/assessments/{assessment_id}/escalate")
def escalate_assessment(
    assessment_id: str,
    req: EscalateRequest,
    role: DemoRole = Depends(get_demo_role),
) -> Dict[str, Any]:
    if config.TARGET_MODE:
        raise APIException(
            status_code=403,
            code="sync_target_read_only",
            message="Target mode instances are read-only and cannot escalate assessments directly.",
        )

    with get_db() as conn:
        assessment = conn.execute("SELECT * FROM assessments WHERE id = ?", (assessment_id,)).fetchone()
        if not assessment:
            raise APIException(status_code=404, code="not_found", message="Assessment not found.")

        # Invariant: Only the latest assessment can be escalated
        max_seq_row = conn.execute(
            "SELECT MAX(seq) AS max_seq FROM assessments WHERE patient_id = ?",
            (assessment["patient_id"],),
        ).fetchone()
        if assessment["seq"] != max_seq_row["max_seq"]:
            raise APIException(
                status_code=409,
                code="stale_assessment",
                message="Cannot escalate an older assessment. Only the latest assessment can be escalated.",
            )

        # Compute current effective priority before this escalation
        finalisation = conn.execute(
            "SELECT final_priority FROM finalisations WHERE assessment_id = ? ORDER BY at DESC LIMIT 1",
            (assessment_id,),
        ).fetchone()

        if finalisation:
            if role == DemoRole.NURSE:
                raise APIException(
                    status_code=403,
                    code="role_forbidden",
                    message="Cannot escalate an assessment already finalised by a clinician. A doctor may re-finalise, or create a new assessment.",
                )
            current_effective = finalisation["final_priority"]
        else:
            current_effective = assessment["priority"]
            past_escalations = conn.execute(
                "SELECT to_priority FROM escalations WHERE assessment_id = ?",
                (assessment_id,),
            ).fetchall()
            for esc in past_escalations:
                if PRIORITY_RANKS[esc["to_priority"]] < PRIORITY_RANKS[current_effective]:
                    current_effective = esc["to_priority"]

        # to_priority must be STRICTLY higher than current effective priority (EMERGENCY=1 < URGENT=2 < ROUTINE=3)
        if PRIORITY_RANKS[req.to_priority] >= PRIORITY_RANKS[current_effective]:
            raise APIException(
                status_code=409,
                code="not_an_escalation",
                message=f"Target priority '{req.to_priority}' must be higher than current effective priority '{current_effective}'.",
            )

        escalation_id = str(uuid.uuid4())
        now = utc_now_iso()

        conn.execute(
            """
            INSERT INTO escalations (id, assessment_id, to_priority, reason, role, at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (escalation_id, assessment_id, req.to_priority, req.reason, role.value, now),
        )

        outbox_payload = {
            "id": escalation_id,
            "assessment_id": assessment_id,
            "to_priority": req.to_priority,
            "reason": req.reason,
            "role": role.value,
            "at": now,
        }
        record_outbox(conn, "escalation", escalation_id, outbox_payload)

    return {
        "status": "escalated",
        "assessment_id": assessment_id,
        "effective_priority": req.to_priority,
        "reason": req.reason,
        "role": role.value,
        "at": now,
    }


@router.post("/assessments/{assessment_id}/finalise")
def finalise_assessment(
    assessment_id: str,
    req: FinaliseRequest,
    role: DemoRole = Depends(get_demo_role),
) -> Dict[str, Any]:
    # Role check: Only DOCTOR can finalise (01 §2, SEC-004)
    require_doctor(role)

    if config.TARGET_MODE:
        raise APIException(
            status_code=403,
            code="sync_target_read_only",
            message="Target mode instances are read-only and cannot finalise assessments directly.",
        )

    with get_db() as conn:
        assessment = conn.execute("SELECT * FROM assessments WHERE id = ?", (assessment_id,)).fetchone()
        if not assessment:
            raise APIException(status_code=404, code="not_found", message="Assessment not found.")

        # Invariant: Only the latest assessment can be finalised
        max_seq_row = conn.execute(
            "SELECT MAX(seq) AS max_seq FROM assessments WHERE patient_id = ?",
            (assessment["patient_id"],),
        ).fetchone()
        if assessment["seq"] != max_seq_row["max_seq"]:
            raise APIException(
                status_code=409,
                code="stale_assessment",
                message="Cannot finalise an older assessment. Only the latest assessment can be finalised.",
            )

        # Compute current effective priority before finalising
        finalisation = conn.execute(
            "SELECT final_priority FROM finalisations WHERE assessment_id = ? ORDER BY at DESC LIMIT 1",
            (assessment_id,),
        ).fetchone()

        if finalisation:
            current_effective = finalisation["final_priority"]
        else:
            current_effective = assessment["priority"]
            past_escalations = conn.execute(
                "SELECT to_priority FROM escalations WHERE assessment_id = ?",
                (assessment_id,),
            ).fetchall()
            for esc in past_escalations:
                if PRIORITY_RANKS[esc["to_priority"]] < PRIORITY_RANKS[current_effective]:
                    current_effective = esc["to_priority"]

        # Reason is required when final_priority differs from original priority OR effective priority (03 §3, 03 §4)
        if req.final_priority != current_effective or req.final_priority != assessment["priority"]:
            if not req.reason or len(req.reason.strip()) == 0:
                raise APIException(
                    status_code=422,
                    code="reason_required",
                    message=f"Reason is required when final priority ({req.final_priority}) differs from original priority ({assessment['priority']}) or effective priority ({current_effective}).",
                )

        finalisation_id = str(uuid.uuid4())
        now = utc_now_iso()

        conn.execute(
            """
            INSERT INTO finalisations (id, assessment_id, final_priority, reason, role, at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (finalisation_id, assessment_id, req.final_priority, req.reason, role.value, now),
        )

        outbox_payload = {
            "id": finalisation_id,
            "assessment_id": assessment_id,
            "final_priority": req.final_priority,
            "reason": req.reason,
            "role": role.value,
            "at": now,
        }
        record_outbox(conn, "finalisation", finalisation_id, outbox_payload)

    return {
        "status": "finalised",
        "assessment_id": assessment_id,
        "final_priority": req.final_priority,
        "reason": req.reason,
        "role": role.value,
        "at": now,
    }
