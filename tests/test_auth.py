import pytest
from fastapi.testclient import TestClient

from api.config import DB_PATH
from api.db import init_db, reset_db
from api.main import app
from api.routes.chat import _CHAT_REQUEST_HISTORY

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Run tests on an isolated temporary SQLite database."""
    _CHAT_REQUEST_HISTORY.clear()
    test_db = tmp_path / "test_auth_upcharai.db"
    monkeypatch.setattr("api.config.DB_PATH", test_db)
    init_db(test_db)
    yield
    reset_db(test_db)
    _CHAT_REQUEST_HISTORY.clear()


def test_login_auth_role_credentials():
    """Auth role (Doctor / Staff) logs in and gets triage and referral access."""
    res = client.post(
        "/api/auth/login",
        json={"username": "doctor", "password": "doctor123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "auth"
    assert "triage" in data["user"]["allowed_views"]
    assert "emergency" in data["user"]["allowed_views"]
    assert "sahayak" in data["user"]["allowed_views"]


def test_login_user_role_credentials():
    """User role (Citizen / Patient) logs in and gets chatbot-only access."""
    res = client.post(
        "/api/auth/login",
        json={"username": "patient", "password": "user123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "user"
    assert data["user"]["allowed_views"] == ["sahayak"]
    assert "triage" not in data["user"]["allowed_views"]


def test_login_invalid_password():
    res = client.post(
        "/api/auth/login",
        json={"username": "doctor", "password": "wrongpassword"},
    )
    assert res.status_code == 401
    assert res.json()["code"] == "invalid_credentials"


def test_login_unknown_user():
    res = client.post(
        "/api/auth/login",
        json={"username": "nonexistent_user", "password": "anypassword"},
    )
    assert res.status_code == 401
    assert res.json()["code"] == "invalid_credentials"


def test_register_and_login_new_user():
    # Register new user role account
    res = client.post(
        "/api/auth/register",
        json={
            "username": "new_patient",
            "password": "patient_pass_123",
            "role": "user",
            "full_name": "New Patient User",
            "email": "new_patient@example.com",
        },
    )
    assert res.status_code == 201
    reg_data = res.json()
    assert reg_data["user"]["username"] == "new_patient"
    assert reg_data["user"]["role"] == "user"
    token = reg_data["access_token"]

    # Verify /me endpoint
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "new_patient"


def test_register_with_client_role_alias():
    """Verify that registering with role='client' succeeds and normalizes to 'user'."""
    res = client.post(
        "/api/auth/register",
        json={
            "username": "client_sarah",
            "password": "sarahpassword",
            "role": "client",
            "full_name": "Sarah Client",
        },
    )
    assert res.status_code == 201
    reg_data = res.json()
    assert reg_data["user"]["username"] == "client_sarah"
    assert reg_data["user"]["role"] == "user"
    assert reg_data["user"]["allowed_views"] == ["sahayak"]
    token = reg_data["access_token"]

    # Verify chatbot allowed
    chat_res = client.post(
        "/api/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Can I drink coconut water?", "language": "en"},
    )
    assert chat_res.status_code == 200

    # Verify triage forbidden
    q_res = client.get(
        "/api/queue",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert q_res.status_code == 403


def test_register_with_auth_role():
    """Verify that registering with role='auth' creates a clinician account with triage access."""
    res = client.post(
        "/api/auth/register",
        json={
            "username": "new_clinician",
            "password": "clinicianpass123",
            "role": "auth",
            "full_name": "Dr. New Clinician",
        },
    )
    assert res.status_code == 201
    reg_data = res.json()
    assert reg_data["user"]["username"] == "new_clinician"
    assert reg_data["user"]["role"] == "auth"
    token = reg_data["access_token"]

    # Verify triage allowed
    q_res = client.get(
        "/api/queue",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert q_res.status_code == 200


def test_register_duplicate_username_fails():
    res = client.post(
        "/api/auth/register",
        json={
            "username": "doctor",  # Already exists in seeded DB
            "password": "password123",
            "role": "auth",
        },
    )
    assert res.status_code == 409
    assert res.json()["code"] == "user_conflict"


def test_logout_invalidates_session():
    # Login as doctor
    login_res = client.post(
        "/api/auth/login",
        json={"username": "doctor", "password": "doctor123"},
    )
    token = login_res.json()["access_token"]

    # Access /me
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200

    # Logout
    logout_res = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # Access /me again -> should fail 401
    me_after_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_after_res.status_code == 401


def test_roles_endpoint_descriptions():
    res = client.get("/api/auth/roles")
    assert res.status_code == 200
    roles = {r["role"]: r for r in res.json()}
    assert "auth" in roles
    assert "user" in roles
    assert roles["auth"]["can_access_triage"] is True
    assert roles["auth"]["can_access_referrals"] is True
    assert roles["user"]["can_access_triage"] is False
    assert roles["user"]["can_access_chatbot"] is True


def test_role_enforcement_user_cannot_access_triage_or_referrals():
    """Verify that 'user' role is blocked from triage queue, patients, referrals, and sync."""
    login_res = client.post(
        "/api/auth/login",
        json={"username": "patient", "password": "user123"},
    )
    user_token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Triage queue -> 403 Forbidden
    q_res = client.get("/api/queue", headers=user_headers)
    assert q_res.status_code == 403
    assert q_res.json()["code"] == "role_forbidden"

    # 2. Patient registration -> 403 Forbidden
    p_res = client.post(
        "/api/patients",
        headers=user_headers,
        json={"display_code": "P-RESTRICTED", "age": 30, "sex": "M"},
    )
    assert p_res.status_code == 403
    assert p_res.json()["code"] == "role_forbidden"

    # 3. Hospitals list -> 403 Forbidden
    h_res = client.get("/api/hospitals", headers=user_headers)
    assert h_res.status_code == 403
    assert h_res.json()["code"] == "role_forbidden"

    # 4. Sync status -> 403 Forbidden
    s_res = client.get("/api/sync/status", headers=user_headers)
    assert s_res.status_code == 403
    assert s_res.json()["code"] == "role_forbidden"

    # 5. Sahayak Chatbot -> 200 OK (Allowed for user role)
    c_res = client.post(
        "/api/chat",
        headers=user_headers,
        json={"message": "What are common signs of dehydration in summer?", "language": "en"},
    )
    assert c_res.status_code == 200
    assert "reply" in c_res.json()


def test_role_enforcement_auth_role_has_full_clinical_access():
    """Verify that 'auth' role can access triage queue, patients, referrals, and chatbot."""
    login_res = client.post(
        "/api/auth/login",
        json={"username": "doctor", "password": "doctor123"},
    )
    auth_token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Triage queue -> 200 OK
    q_res = client.get("/api/queue", headers=auth_headers)
    assert q_res.status_code == 200

    # 2. Patient registration -> 201 Created
    p_res = client.post(
        "/api/patients",
        headers=auth_headers,
        json={"display_code": "P-AUTH-OK", "age": 45, "sex": "F"},
    )
    assert p_res.status_code == 201
    p_id = p_res.json()["patient_id"]

    # 3. Assessment creation -> 201 Created
    a_res = client.post(
        f"/api/patients/{p_id}/assessments",
        headers=auth_headers,
        json={"temp_c": 36.8, "sbp": 120, "dbp": 80, "pulse": 72, "spo2": 99},
    )
    assert a_res.status_code == 201

    # 4. Hospitals list -> 200 OK
    h_res = client.get("/api/hospitals", headers=auth_headers)
    assert h_res.status_code == 200

    # 5. Sahayak Chatbot -> 200 OK
    c_res = client.post(
        "/api/chat",
        headers=auth_headers,
        json={"message": "What is the recommended ORS mixing ratio?", "language": "en"},
    )
    assert c_res.status_code == 200
