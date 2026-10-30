from datetime import datetime, timezone
import json
from typing import Any, Dict, List
from fastapi import APIRouter

from api.db import get_db, utc_now_iso
from api.models import QueueItemResponse, QueueResponse

router = APIRouter(prefix="/api/queue", tags=["queue"])

PRIORITY_RANKS = {
    "EMERGENCY": 1,
    "URGENT": 2,
    "ROUTINE": 3,
}


@router.get("", response_model=QueueResponse)
def get_queue() -> QueueResponse:
    now_dt = datetime.now(timezone.utc)
    generated_at = now_dt.isoformat()

    items: List[QueueItemResponse] = []

    with get_db() as conn:
        patients = conn.execute("SELECT id, display_code, arrived_at FROM patients").fetchall()

        for p in patients:
            p_id = p["id"]
            arrived_str = p["arrived_at"]
            try:
                arrived_dt = datetime.fromisoformat(arrived_str)
                if arrived_dt.tzinfo is None:
                    arrived_dt = arrived_dt.replace(tzinfo=timezone.utc)
                wait_seconds = max(0, int((now_dt - arrived_dt).total_seconds()))
            except Exception:
                wait_seconds = 0

            # Get latest assessment for this patient
            latest_a = conn.execute(
                "SELECT * FROM assessments WHERE patient_id = ? ORDER BY seq DESC LIMIT 1",
                (p_id,),
            ).fetchone()

            if not latest_a:
                # Patient registered but no assessment yet
                items.append(QueueItemResponse(
                    patient_id=p_id,
                    display_code=p["display_code"],
                    effective_priority="ROUTINE",
                    state="PRELIMINARY",
                    flags=["INCOMPLETE"],
                    top_reason="Awaiting initial assessment",
                    arrived_at=arrived_str,
                    wait_seconds=wait_seconds,
                    latest_assessment_id=None,
                ))
                continue

            a_id = latest_a["id"]
            flags = json.loads(latest_a["flags_json"])

            # Check finalisation on latest assessment
            finalisation = conn.execute(
                "SELECT final_priority FROM finalisations WHERE assessment_id = ? ORDER BY at DESC LIMIT 1",
                (a_id,),
            ).fetchone()

            if finalisation:
                state = "FINALISED"
                effective_priority = finalisation["final_priority"]
            else:
                state = "PRELIMINARY"
                effective_priority = latest_a["priority"]
                # Apply any escalation on this assessment
                escalations = conn.execute(
                    "SELECT to_priority FROM escalations WHERE assessment_id = ?",
                    (a_id,),
                ).fetchall()
                for esc in escalations:
                    if PRIORITY_RANKS[esc["to_priority"]] < PRIORITY_RANKS[effective_priority]:
                        effective_priority = esc["to_priority"]

            # Top reason from findings (ordered by tier rank: EMERGENCY, URGENT, ROUTINE)
            findings = conn.execute(
                """
                SELECT plain_message FROM findings 
                WHERE assessment_id = ? 
                ORDER BY CASE tier WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END ASC, rule_id ASC 
                LIMIT 1
                """,
                (a_id,),
            ).fetchone()
            top_reason = findings["plain_message"] if findings else "No urgent signs found"

            items.append(QueueItemResponse(
                patient_id=p_id,
                display_code=p["display_code"],
                effective_priority=effective_priority,
                state=state,
                flags=flags,
                top_reason=top_reason,
                arrived_at=arrived_str,
                wait_seconds=wait_seconds,
                latest_assessment_id=a_id,
            ))

    # Sort key per 02 §5 / DEC-011:
    # 1. effective_priority rank: EMERGENCY (1), URGENT (2), ROUTINE (3)
    # 2. Within ROUTINE: flagged (INCOMPLETE or NEEDS_REVIEW) before unflagged
    # 3. arrived_at ascending (FIFO)
    # 4. patient_id ascending
    def sort_key(item: QueueItemResponse):
        p_rank = PRIORITY_RANKS.get(item.effective_priority, 9)
        routine_subrank = 0
        if item.effective_priority == "ROUTINE":
            is_flagged = any(f in ("INCOMPLETE", "NEEDS_REVIEW") for f in item.flags)
            routine_subrank = 0 if is_flagged else 1
        return (p_rank, routine_subrank, item.arrived_at, item.patient_id)

    items.sort(key=sort_key)

    return QueueResponse(
        generated_at=generated_at,
        items=items,
    )

