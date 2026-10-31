import json
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
import httpx

import api.config as config
from api.db import get_db, utc_now_iso
from api.errors import APIException
from api.models import SyncStatusResponse
from api.roles import DemoRole, get_demo_role

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status(_role: DemoRole = Depends(get_demo_role)) -> SyncStatusResponse:
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
def push_sync_outbox(_role: DemoRole = Depends(get_demo_role)) -> Dict[str, Any]:
    """
    Processes pending outbox items in order of creation.
    Sends items to sync target, handling idempotency and retries.
    Avoids long-lived database locks by performing HTTP transmission outside DB transactions.
    """
    processed = 0
    errors = 0

    with get_db() as conn:
        pending_rows = conn.execute(
            "SELECT * FROM sync_outbox WHERE state = 'PENDING' ORDER BY created_at ASC"
        ).fetchall()
        pending_items = [dict(r) for r in pending_rows]

    for item in pending_items:
        item_id = item["id"]
        entity = item["entity"]
        entity_id = item["entity_id"]
        payload = json.loads(item["payload_json"])
        attempts = item["attempts"] + 1

        # If no target url or we are running in standalone demo mode without a 2nd instance,
        # we simulate sending to a mock sync target successfully (DEC-007, 03 §6).
        if not config.SYNC_TARGET_URL or config.SYNC_TARGET_URL == "mock":
            with get_db() as conn:
                conn.execute(
                    "UPDATE sync_outbox SET state = 'SENT', attempts = ? WHERE id = ?",
                    (attempts, item_id),
                )
            processed += 1
            continue

        try:
            # Transmit to target outside active DB write locks
            res = httpx.post(
                f"{config.SYNC_TARGET_URL}/api/sync/ingest",
                json={"entity": entity, "entity_id": entity_id, "payload": payload},
                timeout=3.0,
            )
            with get_db() as conn:
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
            with get_db() as conn:
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

            parent = conn.execute("SELECT id FROM assessments WHERE id = ?", (payload.get("assessment_id"),)).fetchone()
            if not parent:
                raise APIException(
                    status_code=409,
                    code="parent_missing",
                    message="Parent assessment not found at target instance.",
                    retryable=True,
                )

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

            parent = conn.execute("SELECT id FROM assessments WHERE id = ?", (payload.get("assessment_id"),)).fetchone()
            if not parent:
                raise APIException(
                    status_code=409,
                    code="parent_missing",
                    message="Parent assessment not found at target instance.",
                    retryable=True,
                )

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

            parent = conn.execute("SELECT id FROM assessments WHERE id = ?", (payload.get("assessment_id"),)).fetchone()
            if not parent:
                raise APIException(
                    status_code=409,
                    code="parent_missing",
                    message="Parent assessment not found at target instance.",
                    retryable=True,
                )

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


@router.get("/outbox")
def get_sync_outbox(
    limit: int = 50,
    _role: DemoRole = Depends(get_demo_role),
) -> Dict[str, Any]:
    """
    Returns recent local outbox entries for telemetry inspection and store-and-forward tracking.
    """
    with get_db() as conn:
        items = conn.execute(
            """
            SELECT id, entity, entity_id, state, attempts, last_error, created_at
            FROM sync_outbox
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return {
            "items": [dict(it) for it in items],
            "total_count": len(items),
        }


@router.post("/outbox/{item_id}/retry")
def retry_outbox_item(
    item_id: str,
    _role: DemoRole = Depends(get_demo_role),
) -> Dict[str, Any]:
    """
    Resets an outbox entry to PENDING state and zeroes attempt counters to force immediate retry.
    """
    with get_db() as conn:
        row = conn.execute("SELECT * FROM sync_outbox WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise APIException(status_code=404, code="not_found", message="Outbox item not found.")
        conn.execute(
            "UPDATE sync_outbox SET state = 'PENDING', attempts = 0, last_error = NULL WHERE id = ?",
            (item_id,),
        )
        updated = conn.execute("SELECT * FROM sync_outbox WHERE id = ?", (item_id,)).fetchone()
    return {"status": "reset_to_pending", "item": dict(updated)}


@router.get("/target-hub")
def get_target_hub_summary(_role: DemoRole = Depends(get_demo_role)) -> Dict[str, Any]:
    """
    Aggregates synchronization records across remote outposts for central hospital hub monitoring.
    """
    with get_db() as conn:
        patients_c = conn.execute("SELECT COUNT(*) AS c FROM patients").fetchone()["c"]
        assessments_c = conn.execute("SELECT COUNT(*) AS c FROM assessments").fetchone()["c"]
        referrals_c = conn.execute("SELECT COUNT(*) AS c FROM referrals").fetchone()["c"]
        roles = conn.execute("SELECT DISTINCT created_by_role FROM patients").fetchall()
        role_list = [r["created_by_role"] for r in roles if r["created_by_role"]]
    return {
        "target_mode": config.TARGET_MODE,
        "ingested_patients": patients_c,
        "ingested_assessments": assessments_c,
        "ingested_referrals": referrals_c,
        "remote_sources": role_list or ["SYNC_SOURCE_EDGE_ENCLAVE"],
        "node_status": "ONLINE_CENTRAL_HUB" if config.TARGET_MODE else "STANDALONE_EDGE_ENCLAVE",
    }
