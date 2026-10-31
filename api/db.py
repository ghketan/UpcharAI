from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from typing import Any, Dict, Generator, Optional
import uuid

import api.config as config
from api.auth import seed_default_users


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_INITIALIZED_PATHS = set()


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    path = db_path or config.DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")

    # Ensure tables are initialized for this path
    str_path = str(path.resolve())
    if str_path not in _INITIALIZED_PATHS:
        init_db(path)
        _INITIALIZED_PATHS.add(str_path)

    return conn


@contextmanager
def get_db(db_path: Optional[Path] = None) -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None) -> None:
    path = db_path or config.DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    try:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            display_code TEXT NOT NULL,
            age INTEGER NOT NULL,
            sex TEXT NOT NULL,
            pregnant INTEGER NOT NULL DEFAULT 0,
            arrived_at TEXT NOT NULL,
            created_by_role TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assessments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id),
            seq INTEGER NOT NULL,
            inputs_json TEXT NOT NULL,
            confirmed_implausible INTEGER NOT NULL DEFAULT 0,
            news2_total INTEGER NOT NULL,
            news2_params_scored INTEGER NOT NULL,
            priority TEXT NOT NULL,
            flags_json TEXT NOT NULL,
            missing_json TEXT NOT NULL,
            rule_set_version TEXT NOT NULL,
            clinical_review_status TEXT NOT NULL,
            suggested_action TEXT NOT NULL,
            created_at TEXT NOT NULL,
            role TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS findings (
            id TEXT PRIMARY KEY,
            assessment_id TEXT NOT NULL REFERENCES assessments(id),
            rule_id TEXT NOT NULL,
            tier TEXT NOT NULL,
            plain_message TEXT NOT NULL,
            observed_value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS escalations (
            id TEXT PRIMARY KEY,
            assessment_id TEXT NOT NULL REFERENCES assessments(id),
            to_priority TEXT NOT NULL,
            reason TEXT NOT NULL,
            role TEXT NOT NULL,
            at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS finalisations (
            id TEXT PRIMARY KEY,
            assessment_id TEXT NOT NULL REFERENCES assessments(id),
            final_priority TEXT NOT NULL,
            reason TEXT,
            role TEXT NOT NULL,
            at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            assessment_id TEXT NOT NULL REFERENCES assessments(id),
            hospital_id TEXT NOT NULL,
            summary_json TEXT NOT NULL,
            simulated INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_outbox (
            id TEXT PRIMARY KEY,
            entity TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'PENDING',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            next_attempt_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL COLLATE NOCASE,
            email TEXT NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS auth_sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_assessments_patient_seq ON assessments(patient_id, seq);
        CREATE INDEX IF NOT EXISTS idx_findings_assessment ON findings(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_escalations_assessment ON escalations(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_finalisations_assessment ON finalisations(assessment_id);
        CREATE INDEX IF NOT EXISTS idx_outbox_state ON sync_outbox(state, created_at);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON auth_sessions(expires_at);
        """)
        seed_default_users(conn)
        conn.commit()
    finally:
        conn.close()


def record_outbox(
    conn: sqlite3.Connection,
    entity: str,
    entity_id: str,
    payload: Dict[str, Any],
) -> str:
    outbox_id = str(uuid.uuid4())
    now = utc_now_iso()
    conn.execute(
        """
        INSERT INTO sync_outbox (id, entity, entity_id, payload_json, state, attempts, created_at)
        VALUES (?, ?, ?, ?, 'PENDING', 0, ?)
        """,
        (outbox_id, entity, entity_id, json.dumps(payload), now),
    )
    return outbox_id


def reset_db(db_path: Optional[Path] = None) -> None:
    path = db_path or config.DB_PATH
    with get_db(path) as conn:
        conn.execute("PRAGMA foreign_keys = OFF;")
        conn.execute("DELETE FROM auth_sessions;")
        conn.execute("DELETE FROM users;")
        conn.execute("DELETE FROM referrals;")
        conn.execute("DELETE FROM finalisations;")
        conn.execute("DELETE FROM escalations;")
        conn.execute("DELETE FROM findings;")
        conn.execute("DELETE FROM assessments;")
        conn.execute("DELETE FROM patients;")
        conn.execute("DELETE FROM sync_outbox;")
        conn.execute("PRAGMA foreign_keys = ON;")
        seed_default_users(conn)
