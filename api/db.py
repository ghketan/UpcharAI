"""
UpcharAI SQLite Database Layer
CTBF-AI-02 · Revision: REV-001
Conforms to 03-architecture-data-api.md §3 & §5
"""

import sqlite3
import json
import uuid
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "upchar.db")

def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: str = DB_PATH):
    """Initialize database tables with schema invariants."""
    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS patient (
        id TEXT PRIMARY KEY,
        display_code TEXT NOT NULL,
        age INTEGER,
        sex TEXT NOT NULL,
        pregnant BOOLEAN DEFAULT 0,
        history_codes TEXT,
        arrived_at TEXT NOT NULL,
        created_by_role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assessment (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patient(id),
        seq INTEGER NOT NULL,
        inputs_json TEXT NOT NULL,
        confirmed_implausible BOOLEAN DEFAULT 0,
        news2_total INTEGER NOT NULL,
        news2_params_json TEXT NOT NULL,
        priority TEXT NOT NULL,
        effective_priority TEXT NOT NULL,
        state TEXT NOT NULL, -- 'PRELIMINARY' | 'FINALISED'
        flags_json TEXT,
        missing_json TEXT,
        rule_set_version TEXT NOT NULL,
        clinical_review_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finding (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessment(id),
        rule_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        plain_message TEXT NOT NULL,
        observed_value TEXT
    );

    CREATE TABLE IF NOT EXISTS escalation (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessment(id),
        to_priority TEXT NOT NULL,
        reason TEXT NOT NULL,
        role TEXT NOT NULL,
        at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finalisation (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessment(id),
        final_priority TEXT NOT NULL,
        reason TEXT,
        role TEXT NOT NULL,
        at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS referral (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessment(id),
        hospital_id TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        simulated BOOLEAN DEFAULT 1,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | FAILED
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

def reset_and_seed_db(db_path: str = DB_PATH):
    """Truncates all tables and re-seeds the 4 demo scenarios identically (REQ-011, REQ-020)."""
    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.executescript("""
    DROP TABLE IF EXISTS referral;
    DROP TABLE IF EXISTS finalisation;
    DROP TABLE IF EXISTS escalation;
    DROP TABLE IF EXISTS finding;
    DROP TABLE IF EXISTS assessment;
    DROP TABLE IF EXISTS patient;
    DROP TABLE IF EXISTS sync_outbox;
    """)
    conn.commit()
    conn.close()

    init_db(db_path)
    seed_canonical_scenarios(db_path)

def seed_canonical_scenarios(db_path: str = DB_PATH):
    """Seeds Scenarios 1–4 from files/01-product-and-acceptance.md."""
    from engine.triage import evaluate_triage

    scenarios = [
        {
            "display_code": "P-8419",
            "age": 42,
            "sex": "M",
            "pregnant": False,
            "history_codes": ["COPD_ASTHMA"],
            "vitals": {
                "temp_c": 37.1, "sbp": 125, "dbp": 82, "spo2": 86, "pulse": 120, "rr": 26, "avpu": "A", "on_oxygen": False,
                "symptom_codes": ["SEVERE_BREATHING_DIFFICULTY"], "duration_days": 1,
                "free_text": "Severe wheezing, unable to speak in full sentences"
            }
        },
        {
            "display_code": "P-9134",
            "age": 54,
            "sex": "F",
            "pregnant": False,
            "history_codes": ["HYPERTENSION", "DIABETES"],
            "vitals": {
                "temp_c": 36.8, "sbp": 138, "dbp": 88, "spo2": 92, "pulse": 102, "rr": 18, "avpu": "A", "on_oxygen": False,
                "symptom_codes": ["CHEST_PAIN"], "duration_days": 1,
                "free_text": "Substernal crushing pain radiating to left shoulder"
            }
        },
        {
            "display_code": "P-4277",
            "age": 31,
            "sex": "M",
            "pregnant": False,
            "history_codes": [],
            "vitals": {
                "temp_c": 37.9, "sbp": 118, "dbp": 76, "spo2": 98, "pulse": 78, "rr": 16, "avpu": "A", "on_oxygen": False,
                "symptom_codes": ["FEVER", "COUGH"], "duration_days": 2,
                "free_text": ""
            }
        },
        {
            "display_code": "P-6120",
            "age": 9,
            "sex": "F",
            "pregnant": False,
            "history_codes": [],
            "vitals": {
                "temp_c": 38.3, "sbp": 104, "dbp": 66, "spo2": 99, "pulse": 92, "rr": 20, "avpu": "A", "on_oxygen": False,
                "symptom_codes": ["FEVER"], "duration_days": 1,
                "free_text": "Pediatric assessment requested by parent"
            }
        }
    ]

    now = datetime.now(timezone.utc)
    for i, sc in enumerate(scenarios):
        # Stagger arrival timestamps
        arrived_at = datetime.fromtimestamp(now.timestamp() - (len(scenarios) - i) * 600, tz=timezone.utc).isoformat()
        patient_data = {
            "display_code": sc["display_code"],
            "age": sc["age"],
            "sex": sc["sex"],
            "pregnant": sc["pregnant"],
            "history_codes": sc["history_codes"],
            "arrived_at": arrived_at,
            "created_by_role": "NURSE"
        }
        create_patient_with_assessment(patient_data, sc["vitals"], role="NURSE", db_path=db_path)

def create_patient_with_assessment(patient_data: Dict[str, Any], assessment_inputs: Dict[str, Any], role: str = "NURSE", db_path: str = DB_PATH) -> Dict[str, Any]:
    from engine.triage import evaluate_triage

    conn = get_connection(db_path)
    cur = conn.cursor()

    patient_id = patient_data.get("id") or str(uuid.uuid4())
    display_code = patient_data.get("display_code") or f"P-{uuid.uuid4().hex[:4].upper()}"
    arrived_at = patient_data.get("arrived_at") or datetime.now(timezone.utc).isoformat()

    cur.execute("""
    INSERT INTO patient (id, display_code, age, sex, pregnant, history_codes, arrived_at, created_by_role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        patient_id, display_code, patient_data.get("age"), patient_data.get("sex", "OTHER"),
        bool(patient_data.get("pregnant", False)), json.dumps(patient_data.get("history_codes") or []),
        arrived_at, role
    ))

    # Evaluate triage
    combined_inputs = {
        **assessment_inputs,
        "age": patient_data.get("age"),
        "sex": patient_data.get("sex", "OTHER"),
        "pregnant": patient_data.get("pregnant", False),
        "history_codes": patient_data.get("history_codes") or []
    }
    triage = evaluate_triage(combined_inputs)

    assessment_id = str(uuid.uuid4())
    cur.execute("""
    INSERT INTO assessment (
        id, patient_id, seq, inputs_json, confirmed_implausible, news2_total,
        news2_params_json, priority, effective_priority, state, flags_json,
        missing_json, rule_set_version, clinical_review_status, created_at, role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        assessment_id, patient_id, 1, json.dumps(combined_inputs),
        bool(assessment_inputs.get("confirm_implausible", False)),
        triage["news2"]["total"], json.dumps(triage["news2"]["params"]),
        triage["priority"], triage["priority"], "PRELIMINARY",
        json.dumps(triage["flags"]), json.dumps(triage["missing"]),
        triage["rule_set_version"], triage["clinical_review_status"],
        arrived_at, role
    ))

    # Insert findings
    for f in triage["findings"]:
        cur.execute("""
        INSERT INTO finding (id, assessment_id, rule_id, tier, plain_message, observed_value)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (str(uuid.uuid4()), assessment_id, f["rule_id"], f["tier"], f["plain_message"], f["observed_value"]))

    # Transactional outbox entry
    cur.execute("""
    INSERT INTO sync_outbox (id, entity, entity_id, payload_json, state, created_at)
    VALUES (?, ?, ?, ?, 'PENDING', ?);
    """, (str(uuid.uuid4()), "patient", patient_id, json.dumps(patient_data), arrived_at))

    cur.execute("""
    INSERT INTO sync_outbox (id, entity, entity_id, payload_json, state, created_at)
    VALUES (?, ?, ?, ?, 'PENDING', ?);
    """, (str(uuid.uuid4()), "assessment", assessment_id, json.dumps(triage), arrived_at))

    conn.commit()
    conn.close()

    return {
        "patient_id": patient_id,
        "assessment_id": assessment_id,
        "display_code": display_code,
        "priority": triage["priority"],
        "triage": triage
    }

def get_live_queue(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Returns sorted live queue per 02 §5 & DEC-011."""
    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.execute("""
    SELECT 
        p.id as patient_id,
        p.display_code,
        p.age,
        p.sex,
        p.pregnant,
        p.arrived_at,
        a.id as assessment_id,
        a.priority,
        a.effective_priority,
        a.state,
        a.flags_json,
        a.news2_total,
        (SELECT plain_message FROM finding WHERE assessment_id = a.id ORDER BY tier = 'EMERGENCY' DESC, tier = 'URGENT' DESC LIMIT 1) as top_reason
    FROM patient p
    JOIN assessment a ON a.patient_id = p.id
    WHERE a.seq = (SELECT MAX(seq) FROM assessment WHERE patient_id = p.id)
    """)

    rows = cur.fetchall()
    conn.close()

    now = datetime.now(timezone.utc)
    items = []
    for r in rows:
        try:
            arr_time = datetime.fromisoformat(r["arrived_at"])
            wait_sec = max(0, int((now - arr_time).total_seconds()))
        except Exception:
            wait_sec = 0

        flags = json.loads(r["flags_json"]) if r["flags_json"] else []
        items.append({
            "patient_id": r["patient_id"],
            "assessment_id": r["assessment_id"],
            "display_code": r["display_code"],
            "age": r["age"],
            "sex": r["sex"],
            "pregnant": bool(r["pregnant"]),
            "effective_priority": r["effective_priority"],
            "state": r["state"],
            "flags": flags,
            "top_reason": r["top_reason"] or "Assessment recorded",
            "news2_total": r["news2_total"],
            "arrived_at": r["arrived_at"],
            "wait_seconds": wait_sec
        })

    # Sort key per 02 §5:
    # 1. effective_priority rank: EMERGENCY, URGENT, ROUTINE
    # 2. Within ROUTINE: INCOMPLETE or NEEDS_REVIEW before unflagged ROUTINE
    # 3. arrived_at ascending
    # 4. patient_id ascending
    priority_rank = {"EMERGENCY": 1, "URGENT": 2, "ROUTINE": 3}

    def sort_key(item):
        pr = priority_rank.get(item["effective_priority"], 99)
        flagged_routine = 0
        if item["effective_priority"] == "ROUTINE":
            has_flag = any(f.get("id") in ("INCOMPLETE", "NEEDS_REVIEW") if isinstance(f, dict) else f in ("INCOMPLETE", "NEEDS_REVIEW") for f in item["flags"])
            flagged_routine = 0 if has_flag else 1
        return (pr, flagged_routine, item["arrived_at"], item["patient_id"])

    items.sort(key=sort_key)
    return items

def escalate_assessment(assessment_id: str, to_priority: str, reason: str, role: str = "NURSE", db_path: str = DB_PATH) -> Dict[str, Any]:
    """Escalates priority upward with mandatory reason."""
    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.execute("SELECT * FROM assessment WHERE id = ?;", (assessment_id,))
    a = cur.fetchone()
    if not a:
        conn.close()
        raise ValueError("Assessment not found")

    priority_rank = {"ROUTINE": 1, "URGENT": 2, "EMERGENCY": 3}
    cur_rank = priority_rank.get(a["effective_priority"], 1)
    target_rank = priority_rank.get(to_priority, 1)

    if target_rank <= cur_rank:
        conn.close()
        raise ValueError("Escalation must be to a higher priority level.")

    if not reason or len(reason.strip()) < 5:
        conn.close()
        raise ValueError("A clinical reason of at least 5 characters is required for escalation.")

    esc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    cur.execute("""
    INSERT INTO escalation (id, assessment_id, to_priority, reason, role, at)
    VALUES (?, ?, ?, ?, ?, ?);
    """, (esc_id, assessment_id, to_priority, reason.strip(), role, now))

    cur.execute("""
    UPDATE assessment SET effective_priority = ? WHERE id = ?;
    """, (to_priority, assessment_id))

    conn.commit()
    conn.close()
    return {"id": esc_id, "to_priority": to_priority, "at": now}

def finalise_assessment(assessment_id: str, final_priority: str, reason: str, role: str = "DOCTOR", db_path: str = DB_PATH) -> Dict[str, Any]:
    """Doctor finalisation of assessment."""
    if role != "DOCTOR":
        raise PermissionError("Only a DOCTOR can finalise an assessment (01 §2).")

    conn = get_connection(db_path)
    cur = conn.cursor()

    cur.execute("SELECT * FROM assessment WHERE id = ?;", (assessment_id,))
    a = cur.fetchone()
    if not a:
        conn.close()
        raise ValueError("Assessment not found")

    if final_priority != a["effective_priority"] and (not reason or len(reason.strip()) < 5):
        conn.close()
        raise ValueError("A clinical justification is required when overriding the triage priority.")

    fin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    cur.execute("""
    INSERT INTO finalisation (id, assessment_id, final_priority, reason, role, at)
    VALUES (?, ?, ?, ?, ?, ?);
    """, (fin_id, assessment_id, final_priority, reason.strip(), role, now))

    cur.execute("""
    UPDATE assessment SET effective_priority = ?, state = 'FINALISED' WHERE id = ?;
    """, (final_priority, assessment_id))

    conn.commit()
    conn.close()
    return {"id": fin_id, "final_priority": final_priority, "state": "FINALISED", "at": now}
