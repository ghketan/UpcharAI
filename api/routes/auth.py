from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Header, status

from api.auth import (
    ROLE_CONFIG,
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    normalize_role,
)
from api.db import get_db
from api.errors import APIException
from api.models import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RoleInfo,
    UserResponse,
)
from api.roles import extract_token_from_headers, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest) -> LoginResponse:
    clean_username = req.username.strip()
    if not clean_username or not req.password:
        raise APIException(
            status_code=400,
            code="missing_credentials",
            message="Please provide both username and password.",
        )

    with get_db() as conn:
        user = authenticate_user(conn, clean_username, req.password)
        if not user:
            raise APIException(
                status_code=401,
                code="invalid_credentials",
                message="Invalid username/email or password.",
            )

        session = create_session(conn, user["id"], user["role"])

    return LoginResponse(
        access_token=session["access_token"],
        token_type=session["token_type"],
        role=session["role"],
        expires_at=session["expires_at"],
        user=UserResponse(**user),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=LoginResponse)
def register(req: RegisterRequest) -> LoginResponse:
    clean_username = req.username.strip().lower()
    if not clean_username:
        raise APIException(
            status_code=422,
            code="validation_error",
            message="Username cannot be blank.",
        )

    if not req.password:
        raise APIException(
            status_code=422,
            code="validation_error",
            message="Password cannot be blank.",
        )

    try:
        norm_role = normalize_role(req.role)
    except ValueError as e:
        raise APIException(status_code=422, code="validation_error", message=str(e))

    with get_db() as conn:
        # Check if username already exists
        existing_user = conn.execute(
            "SELECT id FROM users WHERE username = ?",
            (clean_username,),
        ).fetchone()

        if existing_user:
            raise APIException(
                status_code=409,
                code="user_conflict",
                message=f"Username '{clean_username}' already exists. Please sign in or choose another username.",
            )

        # Handle email validation & collision avoidance
        user_provided_email = bool(req.email and req.email.strip())
        if user_provided_email:
            clean_email = req.email.strip().lower()
            existing_email = conn.execute(
                "SELECT id FROM users WHERE email = ?",
                (clean_email,),
            ).fetchone()
            if existing_email:
                raise APIException(
                    status_code=409,
                    code="email_conflict",
                    message=f"Email '{clean_email}' is already registered. Please sign in or use another email.",
                )
        else:
            clean_email = f"{clean_username}@upchar.ai"
            if conn.execute("SELECT id FROM users WHERE email = ?", (clean_email,)).fetchone():
                import uuid
                clean_email = f"{clean_username}_{uuid.uuid4().hex[:4]}@upchar.ai"

        display_name = (req.full_name or "").strip() or clean_username.title()

        user = create_user(
            conn=conn,
            username=clean_username,
            password=req.password,
            role=norm_role,
            full_name=display_name,
            email=clean_email,
        )

        session = create_session(conn, user["id"], user["role"])

    return LoginResponse(
        access_token=session["access_token"],
        token_type=session["token_type"],
        role=session["role"],
        expires_at=session["expires_at"],
        user=UserResponse(**user),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    return UserResponse(**current_user)


@router.post("/logout")
def logout(
    authorization: str = Header(None, alias="Authorization"),
    x_auth_token: str = Header(None, alias="X-Auth-Token"),
) -> Dict[str, Any]:
    token = extract_token_from_headers(authorization, x_auth_token)
    if token:
        with get_db() as conn:
            delete_session(conn, token)
    return {"status": "success", "message": "Logged out successfully."}


@router.get("/roles", response_model=List[RoleInfo])
def get_roles_information() -> List[RoleInfo]:
    results = []
    for role_key, info in ROLE_CONFIG.items():
        results.append(
            RoleInfo(
                role=role_key,
                name=info["name"],
                description=info["description"],
                allowed_views=info["allowed_views"],
                permissions=info["permissions"],
                can_access_triage=info["can_access_triage"],
                can_access_referrals=info["can_access_referrals"],
                can_access_chatbot=info["can_access_chatbot"],
            )
        )
    return results
