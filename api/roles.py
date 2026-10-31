from enum import Enum
from typing import Any, Dict, Optional
from fastapi import Header

from api.auth import get_user_from_token
from api.db import get_db
from api.errors import APIException


class DemoRole(str, Enum):
    NURSE = "NURSE"
    DOCTOR = "DOCTOR"


class AuthRole(str, Enum):
    AUTH = "auth"   # Clinical / Triage / Staff / Referrals / Options
    USER = "user"   # Citizen / Patient / Chatbot only


def extract_token_from_headers(
    authorization: Optional[str] = None,
    x_auth_token: Optional[str] = None,
) -> Optional[str]:
    """Extracts bearer token from Authorization header or X-Auth-Token header."""
    if authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        return authorization.strip()
    if x_auth_token:
        return x_auth_token.strip()
    return None


def get_current_user_optional(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> Optional[Dict[str, Any]]:
    """
    Returns user dict if valid session token is provided; otherwise None.
    Raises 401 if a token was supplied but is expired or invalid.
    """
    token = extract_token_from_headers(authorization, x_auth_token)
    if not token:
        return None

    with get_db() as conn:
        user = get_user_from_token(conn, token)

    if not user:
        raise APIException(
            status_code=401,
            code="unauthorized",
            message="Invalid or expired session token. Please log in again.",
        )
    return user


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> Dict[str, Any]:
    """Requires an authenticated session. Raises 401 if missing or invalid."""
    user = get_current_user_optional(authorization, x_auth_token)
    if not user:
        raise APIException(
            status_code=401,
            code="unauthorized",
            message="Authentication credentials required. Please log in.",
        )
    return user


def get_demo_role(
    x_demo_role: Optional[str] = Header(None, alias="X-Demo-Role"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> DemoRole:
    """
    Role dependency for clinical endpoints.
    - If a session token is supplied:
        - If role is 'user', access is strictly blocked with 403 Forbidden.
        - If role is 'auth', maps to DOCTOR (if username indicates doctor) or NURSE.
    - If no session token is supplied:
        - Uses X-Demo-Role header (or defaults to NURSE) for backward compatibility with existing tests.
    """
    token = extract_token_from_headers(authorization, x_auth_token)
    if token:
        with get_db() as conn:
            user = get_user_from_token(conn, token)

        if not user:
            raise APIException(
                status_code=401,
                code="unauthorized",
                message="Invalid or expired session token.",
            )

        if user["role"] == "user":
            raise APIException(
                status_code=403,
                code="role_forbidden",
                message="Access restricted: 'user' role is limited to the Sahayak Chatbot only. Access to Triage, Assessments, and Referrals requires 'auth' credentials.",
            )

        # 'auth' role
        username_lower = user.get("username", "").lower()
        if "doctor" in username_lower or (x_demo_role and x_demo_role.strip().upper() == "DOCTOR"):
            return DemoRole.DOCTOR
        return DemoRole.NURSE

    # Fallback to demo role header for unauthenticated test requests
    if not x_demo_role:
        return DemoRole.NURSE
    role_str = x_demo_role.strip().upper()
    try:
        return DemoRole(role_str)
    except ValueError:
        raise APIException(
            status_code=422,
            code="validation_error",
            message=f"Invalid demo role '{role_str}'. Allowed roles: NURSE, DOCTOR.",
        )


def require_doctor(role: DemoRole) -> None:
    if role != DemoRole.DOCTOR:
        raise APIException(
            status_code=403,
            code="role_forbidden",
            message="Only DOCTOR role can perform clinician finalisation.",
        )


def require_triage_access(
    role: DemoRole = get_demo_role,
) -> DemoRole:
    """Convenience alias for requiring triage/clinical staff access."""
    return role
