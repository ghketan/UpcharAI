from datetime import datetime, timedelta, timezone
import hashlib
from pathlib import Path
import secrets
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
import uuid

# Role capability configuration
ROLE_CONFIG: Dict[str, Dict[str, Any]] = {
    "auth": {
        "name": "Clinical & Triage Staff",
        "description": "Full access to triage queue, vital assessments, emergency referrals, telemetry sync, and informational chatbot.",
        "allowed_views": ["overview", "triage", "emergency", "sahayak", "telemetry"],
        "permissions": [
            "triage_queue:read",
            "patient:create",
            "patient:read",
            "assessment:create",
            "assessment:escalate",
            "assessment:finalise",
            "referral:create",
            "referral:read",
            "sync:manage",
            "chatbot:access",
        ],
        "can_access_triage": True,
        "can_access_referrals": True,
        "can_access_chatbot": True,
    },
    "user": {
        "name": "Citizen / Patient",
        "description": "Restricted access to the Sahayak Multilingual Informational Chatbot only.",
        "allowed_views": ["sahayak"],
        "permissions": [
            "chatbot:access",
        ],
        "can_access_triage": False,
        "can_access_referrals": False,
        "can_access_chatbot": True,
    },
}

DEFAULT_CREDENTIALS = [
    {
        "username": "doctor",
        "email": "doctor@upchar.ai",
        "password": "doctor123",
        "role": "auth",
        "full_name": "Dr. Ananya Sharma (Clinician)",
    },
    {
        "username": "staff",
        "email": "staff@upchar.ai",
        "password": "staff123",
        "role": "auth",
        "full_name": "Pooja Devi (Triage Nurse)",
    },
    {
        "username": "patient",
        "email": "patient@upchar.ai",
        "password": "user123",
        "role": "user",
        "full_name": "Rahul Verma (Patient)",
    },
    {
        "username": "user",
        "email": "user@upchar.ai",
        "password": "user123",
        "role": "user",
        "full_name": "Sita Devi (Citizen)",
    },
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """Generates a salted PBKDF2-HMAC-SHA256 password hash."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=100_000,
    ).hex()
    return hashed, salt


def verify_password(plain_password: str, hashed_password: str, salt: str) -> bool:
    """Verifies a plain password against the stored hash and salt in constant time."""
    computed_hash, _ = hash_password(plain_password, salt)
    return secrets.compare_digest(computed_hash, hashed_password)


def generate_token() -> str:
    """Generates a cryptographically strong session token."""
    return secrets.token_urlsafe(32)


def normalize_role(role_raw: str) -> str:
    """Normalizes role strings to either 'auth' or 'user'."""
    clean = (role_raw or "").strip().lower()
    if clean in ("auth", "clinical", "clinician", "doctor", "nurse", "staff", "admin"):
        return "auth"
    if clean in ("user", "patient", "public", "citizen"):
        return "user"
    raise ValueError(f"Invalid role '{role_raw}'. Supported roles: 'auth' (staff/triage access) and 'user' (chatbot only).")


def build_user_response(user_row: sqlite3.Row) -> Dict[str, Any]:
    role = user_row["role"]
    config = ROLE_CONFIG.get(role, ROLE_CONFIG["user"])
    return {
        "id": user_row["id"],
        "username": user_row["username"],
        "email": user_row["email"],
        "role": role,
        "full_name": user_row["full_name"],
        "allowed_views": config["allowed_views"],
        "permissions": config["permissions"],
        "created_at": user_row["created_at"],
    }


def create_user(
    conn: sqlite3.Connection,
    username: str,
    password: str,
    role: str = "user",
    full_name: str = "",
    email: Optional[str] = None,
) -> Dict[str, Any]:
    normalized_role = normalize_role(role)
    clean_username = username.strip().lower()
    clean_email = (email or f"{clean_username}@upchar.ai").strip().lower()
    display_name = full_name.strip() or clean_username.title()

    pwd_hash, salt = hash_password(password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    now = utc_now_iso()

    conn.execute(
        """
        INSERT INTO users (id, username, email, password_hash, salt, role, full_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, clean_username, clean_email, pwd_hash, salt, normalized_role, display_name, now, now),
    )

    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return build_user_response(row)


def authenticate_user(
    conn: sqlite3.Connection,
    username_or_email: str,
    password: str,
) -> Optional[Dict[str, Any]]:
    clean_identifier = username_or_email.strip().lower()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (clean_identifier, clean_identifier),
    ).fetchone()

    if not row:
        return None

    if not verify_password(password, row["password_hash"], row["salt"]):
        return None

    return build_user_response(row)


def create_session(
    conn: sqlite3.Connection,
    user_id: str,
    role: str,
    expiry_days: int = 7,
) -> Dict[str, Any]:
    token = generate_token()
    now_dt = datetime.now(timezone.utc)
    expires_dt = now_dt + timedelta(days=expiry_days)
    now_iso = now_dt.isoformat()
    expires_iso = expires_dt.isoformat()

    conn.execute(
        """
        INSERT INTO auth_sessions (token, user_id, role, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (token, user_id, role, now_iso, expires_iso),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "expires_at": expires_iso,
    }


def get_user_from_token(
    conn: sqlite3.Connection,
    token: str,
) -> Optional[Dict[str, Any]]:
    clean_token = token.strip()
    session = conn.execute(
        "SELECT * FROM auth_sessions WHERE token = ?",
        (clean_token,),
    ).fetchone()

    if not session:
        return None

    # Check expiry
    try:
        expires_dt = datetime.fromisoformat(session["expires_at"])
        if expires_dt.tzinfo is None:
            expires_dt = expires_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_dt:
            # Delete expired session
            conn.execute("DELETE FROM auth_sessions WHERE token = ?", (clean_token,))
            return None
    except Exception:
        return None

    user = conn.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
    if not user:
        conn.execute("DELETE FROM auth_sessions WHERE token = ?", (clean_token,))
        return None

    return build_user_response(user)


def delete_session(conn: sqlite3.Connection, token: str) -> bool:
    cursor = conn.execute("DELETE FROM auth_sessions WHERE token = ?", (token.strip(),))
    return cursor.rowcount > 0


def seed_default_users(conn: sqlite3.Connection) -> None:
    """Seeds default accounts if the users table does not have them."""
    for cred in DEFAULT_CREDENTIALS:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (cred["username"],),
        ).fetchone()
        if not existing:
            pwd_hash, salt = hash_password(cred["password"])
            user_id = f"usr_{uuid.uuid4().hex[:12]}"
            now = utc_now_iso()
            conn.execute(
                """
                INSERT INTO users (id, username, email, password_hash, salt, role, full_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    cred["username"],
                    cred["email"],
                    pwd_hash,
                    salt,
                    cred["role"],
                    cred["full_name"],
                    now,
                    now,
                ),
            )
