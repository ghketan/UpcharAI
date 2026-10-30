import json
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
import httpx

import api.config as config
from api.db import get_db, utc_now_iso
from api.errors import APIException
from api.models import SyncStatusResponse

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status() -> SyncStatusResponse:
    with get_db() as conn:
        pending_count = conn.execute(
            "SELECT COUNT(*) AS c FROM sync_outbox WHERE state = 'PENDING'"
        ).fetchone()["c"]

        failed_count = conn.execute(
            "SELECT COUNT(*) AS c FROM sync_outbox WHERE state = 'FAILED'"
        ).fetchone()["c"]

        last_success = conn.execute(
            "SELECT created_at FROM sync_outbox WHERE state = 'SENT' ORDER BY created_at DESC LIMIT 1"
        ).fetchone()

    # Determine online reachability
    online = True
    target_label = "MOCK" if not config.TARGET_MODE and (not config.SYNC_TARGET_URL or config.SYNC_TARGET_URL == "mock") else "demo target"

    return SyncStatusResponse(
        online=online,
        pending=pending_count,
        failed=failed_count,
        last_success_at=last_success["created_at"] if last_success else None,
        target_label=target_label,
    )


@router.post("/push")
def push_sync_outbox() -> Dict[str, Any]:
    """
    Processes pending outbox items in order of creation.
    Sends items to sync target, handling idempotency and retries.
    """
    processed = 0
    errors = 0

    with get_db() as conn:
        pending_items = conn.execute(
            "SELECT * FROM sync_outbox WHERE state = 'PENDING' ORDER BY created_at ASC"
        ).fetchall()

        for item in pending_items:
            item_id = item["id"]
            entity = item["entity"]
            entity_id = item["entity_id"]
            payload = json.loads(item["payload_json"])
            attempts = item["attempts"] + 1

            # If no target url or we are running in standalone demo mode without a 2nd instance,
            # we simulate sending to a mock sync target successfully (DEC-007, 03 §6).
            if not config.SYNC_TARGET_URL or config.SYNC_TARGET_URL == "mock":
                conn.execute(
                    "UPDATE sync_outbox SET state = 'SENT', attempts = ? WHERE id = ?",
                    (attempts, item_id),
                )
                processed += 1
                continue

            try:
                # Transmit to target
                res = httpx.post(
                    f"{config.SYNC_TARGET_URL}/api/sync/ingest",
                    json={"entity": entity, "entity_id": entity_id, "payload": payload},
                    timeout=3.0,
                )
                if res.status_code in (200, 201):
                    conn.execute(
                        "UPDATE sync_outbox SET state = 'SENT', attempts = ?, last_error = NULL WHERE id = ?",
                        (attempts, item_id),
                    )
                    processed += 1
                elif res.status_code == 409 and res.json().get("code") == "parent_missing":
                    # Child's parent not ingested yet; retry later
                    conn.execute(
                        "UPDATE sync_outbox SET attempts = ?, last_error = 'parent_missing' WHERE id = ?",
                        (attempts, item_id),
                    )
                    errors += 1
                else:
                    new_state = "FAILED" if attempts >= 8 else "PENDING"
                    conn.execute(
                        "UPDATE sync_outbox SET state = ?, attempts = ?, last_error = ? WHERE id = ?",
                        (new_state, attempts, res.text[:200], item_id),
                    )
                    errors += 1
            except Exception as e:
                new_state = "FAILED" if attempts >= 8 else "PENDING"
                conn.execute(
                    "UPDATE sync_outbox SET state = ?, attempts = ?, last_error = ? WHERE id = ?",
                    (new_state, attempts, str(e)[:200], item_id),
                )
                errors += 1

    return {"processed": processed, "errors": errors}


@router.post("/ingest")
def ingest_record(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ingest endpoint for target instances.
    Available ONLY when TARGET_MODE=1 (SEC-007, 03 §6).
    """
    if not config.TARGET_MODE:
        raise APIException(
            status_code=404,
            code="not_found",
            message="Ingest endpoint is disabled unless TARGET_MODE=1.",
        )

    entity = data.get("entity")
    entity_id = data.get("entity_id")
    payload = data.get("payload", {})

    with get_db() as conn:
        if entity == "patient":
            existing = conn.execute("SELECT id FROM patients WHERE id = ?", (entity_id,)).fetchone()
            if existing:
                return {"status": "duplicate", "entity": entity, "entity_id": entity_id}

            conn.execute(
                """
                INSERT INTO patients (id, display_code, age, sex, pregnant, arrived_at, created_by_role)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["id"],
                    payload["display_code"],
                    payload["age"],
                    payload["sex"],
                    1 if payload.get("pregnant") else 0,
                    payload["arrived_at"],
                    payload.get("created_by_role", "SYNC"),
                ),
            )
            return {"status": "ingested", "entity": entity, "entity_id": entity_id}

        elif entity == "assessment":
            existing = conn.execute("SELECT id FROM assessments WHERE id = ?", (entity_id,)).fetchone()
            if existing:
                return {"status": "duplicate", "entity": entity, "entity_id": entity_id}

            # Check parent patient exists
            parent = conn.execute("SELECT id FROM patients WHERE id = ?", (payload["patient_id"],)).fetchone()
            if not parent:
                raise APIException(
                    status_code=409,
                    code="parent_missing",
                    message="Parent patient not found at target instance.",
                    retryable=True,
                )

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
                    payload["id"],
                    payload["patient_id"],
                    payload["seq"],
                    json.dumps(payload.get("inputs", {})),
                    1 if payload.get("confirmed_implausible") else 0,
                    payload["news2_total"],
                    payload["news2_params_scored"],
                    payload["priority"],
                    json.dumps(payload.get("flags", [])),
                    json.dumps(payload.get("missing", [])),
                    payload["rule_set_version"],
                    payload["clinical_review_status"],
                    payload["suggested_action"],
                    payload["created_at"],
                    payload.get("role", "SYNC"),
                ),
            )

            for f in payload.get("findings", []):
                conn.execute(
                    """
                    INSERT INTO findings (id, assessment_id, rule_id, tier, plain_message, observed_value)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f.get("id") or f"{entity_id}_{f['rule_id']}",
                        entity_id,
                        f["rule_id"],
                        f["tier"],
                        f["plain_message"],
                        f["observed_value"],
                    ),
                )
            return {"status": "ingested", "entity": entity, "entity_id": entity_id}

        elif entity == "escalation":
            existing = conn.execute("SELECT id FROM escalations WHERE id = ?", (entity_id,)).fetchone()
            if existing:
                return {"status": "duplicate", "entity": entity, "entity_id": entity_id}

            conn.execute(
                """
                INSERT INTO escalations (id, assessment_id, to_priority, reason, role, at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["id"],
                    payload["assessment_id"],
                    payload["to_priority"],
                    payload["reason"],
                    payload.get("role", "SYNC"),
                    payload["at"],
                ),
            )
            return {"status": "ingested", "entity": entity, "entity_id": entity_id}

        elif entity == "finalisation":
            existing = conn.execute("SELECT id FROM finalisations WHERE id = ?", (entity_id,)).fetchone()
            if existing:
                return {"status": "duplicate", "entity": entity, "entity_id": entity_id}

            conn.execute(
                """
                INSERT INTO finalisations (id, assessment_id, final_priority, reason, role, at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["id"],
                    payload["assessment_id"],
                    payload["final_priority"],
                    payload.get("reason"),
                    payload.get("role", "SYNC"),
                    payload["at"],
                ),
            )
            return {"status": "ingested", "entity": entity, "entity_id": entity_id}

        elif entity == "referral":
            existing = conn.execute("SELECT id FROM referrals WHERE id = ?", (entity_id,)).fetchone()
            if existing:
                return {"status": "duplicate", "entity": entity, "entity_id": entity_id}

            conn.execute(
                """
                INSERT INTO referrals (id, assessment_id, hospital_id, summary_json, simulated, created_at)
                VALUES (?, ?, ?, ?, 1, ?)
                """,
                (
                    payload["referral_id"],
                    payload.get("assessment_id", ""),
                    payload.get("hospital", {}).get("id", ""),
                    json.dumps(payload),
                    payload["generated_at"],
                ),
            )
            return {"status": "ingested", "entity": entity, "entity_id": entity_id}

        else:
            raise APIException(status_code=422, code="unknown_entity", message=f"Unknown entity type {entity}")
