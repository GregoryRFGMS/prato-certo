import importlib
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select


@pytest.fixture()
def auth(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/test.sqlite")
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("REGISTRATION_ENABLED", "true")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("PUBLIC_APP_URL", "http://localhost:5173")
    import backend.app as module

    module = importlib.reload(module)
    from backend.models import Base

    Base.metadata.create_all(module.engine)
    with TestClient(module.app, headers={"Origin": "http://localhost:5173"}) as client:
        yield module, client
    module.engine.dispose()


DATA = {
    "name": "Gregory",
    "email": "gregory@example.com",
    "kitchen": "Cozinha de Teste",
    "password": "senha-exclusiva-123",
    "accepted_terms": True,
    "terms_version": "2026-09-11-draft",
}


def test_registration_session_logout(auth):
    module, c = auth
    assert c.get("/api/auth/me").status_code == 401
    r = c.post("/api/auth/register", json=DATA)
    assert r.status_code == 201
    assert "password" not in r.text
    assert "httponly" in r.headers["set-cookie"].lower()
    assert c.get("/api/auth/me").json()["kitchen"] == "Cozinha de Teste"
    cookie = c.cookies.get(module.COOKIE_NAME)
    c.post("/api/auth/logout", json={})
    assert c.get("/api/auth/me").status_code == 401
    c.cookies.set(module.COOKIE_NAME, cookie)
    assert c.get("/api/auth/me").status_code == 401
    with Session(module.engine) as db:
        u = db.scalar(select(module.User))
        assert u.password_hash != DATA["password"]
        assert module.password_hasher.verify(DATA["password"], u.password_hash)


def test_invalid_origin_terms_duplicate_and_login(auth):
    module, c = auth
    assert (
        c.post(
            "/api/auth/register", json=DATA, headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
    assert c.post("/api/auth/register", json={**DATA, "accepted_terms": False}).status_code == 400
    assert c.post("/api/auth/register", json=DATA).status_code == 201
    assert (
        c.post("/api/auth/register", json={**DATA, "email": "GREGORY@example.com"}).status_code
        == 409
    )
    assert (
        c.post("/api/auth/login", json={"email": DATA["email"], "password": "wrong"}).status_code
        == 401
    )
    assert (
        c.post(
            "/api/auth/login", json={"email": DATA["email"], "password": DATA["password"]}
        ).status_code
        == 200
    )


def test_user_isolation(auth):
    module, c = auth
    first = c.post("/api/auth/register", json=DATA).json()
    c.post("/api/auth/logout", json={})
    second = c.post(
        "/api/auth/register", json={**DATA, "email": "second@example.com", "name": "Second"}
    ).json()
    assert first["id"] != second["id"]
    assert c.get("/api/auth/me").json()["id"] == second["id"]


def test_expired_session_and_rate_limit(auth):
    module, c = auth
    c.post("/api/auth/register", json=DATA)
    with Session(module.engine) as db:
        s = db.scalar(select(module.AuthSession))
        s.expires_at = module.now() - timedelta(seconds=1)
        db.commit()
    assert c.get("/api/auth/me").status_code == 401
    for _ in range(10):
        assert (
            c.post(
                "/api/auth/login", json={"email": DATA["email"], "password": "wrong"}
            ).status_code
            == 401
        )
    assert (
        c.post("/api/auth/login", json={"email": DATA["email"], "password": "wrong"}).status_code
        == 429
    )


def test_reset_is_single_use_and_revokes_sessions(auth):
    module, c = auth
    c.post("/api/auth/register", json=DATA)
    with Session(module.engine) as db:
        u = db.scalar(select(module.User))
        db.add(
            module.PasswordReset(
                digest=module.digest("test-token-with-enough-length"),
                user_id=u.id,
                expires_at=module.now() + timedelta(minutes=5),
            )
        )
        db.commit()
    payload = {"token": "test-token-with-enough-length", "password": "outra-senha-exclusiva-123"}
    assert c.post("/api/auth/reset-password", json=payload).status_code == 200
    assert c.get("/api/auth/me").status_code == 401
    assert c.post("/api/auth/reset-password", json=payload).status_code == 400
    assert (
        c.post(
            "/api/auth/login", json={"email": DATA["email"], "password": DATA["password"]}
        ).status_code
        == 401
    )
    assert (
        c.post(
            "/api/auth/login", json={"email": DATA["email"], "password": payload["password"]}
        ).status_code
        == 200
    )


def test_reset_unavailable_does_not_claim_email_sent(auth, monkeypatch):
    module, c = auth
    monkeypatch.setattr(module, "SMTP_HOST", None)
    assert c.post("/api/auth/forgot-password", json={"email": DATA["email"]}).status_code == 503


def test_validation_does_not_echo_password(auth):
    module, c = auth
    r = c.post("/api/auth/register", json={**DATA, "password": "secret"})
    assert r.status_code == 422
    assert "secret" not in r.text
