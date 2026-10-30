from enum import Enum
from typing import Optional
from fastapi import Header
from api.errors import APIException


class DemoRole(str, Enum):
    NURSE = "NURSE"
    DOCTOR = "DOCTOR"


def get_demo_role(x_demo_role: Optional[str] = Header(None, alias="X-Demo-Role")) -> DemoRole:
    """
    Extracts role from X-Demo-Role header.
    Defaults to NURSE if missing.
    Roles in Phase 1 are a selector, not authentication (DEC-005, SEC-004).
    """
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

