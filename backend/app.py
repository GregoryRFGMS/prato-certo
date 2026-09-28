"""Authentication API. Production target: PostgreSQL; SQLite is used only in tests."""

import hashlib
import os
import secrets
import smtplib
import ssl
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from sqlalchemy import create_engine, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .models import AuthSession, PasswordReset, RateLimit, User

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("Configure DATABASE_URL before starting the API.")
APP_ENV = os.getenv("APP_ENV", "production")
if APP_ENV == "production" and not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError("Production requires PostgreSQL.")
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "http://localhost:5173").rstrip("/")
ALLOWED_ORIGINS = set(filter(None, os.getenv("ALLOWED_ORIGINS", PUBLIC_APP_URL).split(",")))
ALLOWED_ORIGINS = {origin.strip().rstrip("/") for origin in ALLOWED_ORIGINS}
if not ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
    raise RuntimeError("Configure explicit ALLOWED_ORIGINS.")
if APP_ENV == "production" and (
    not PUBLIC_APP_URL.startswith("https://")
    or any(not o.startswith("https://") for o in ALLOWED_ORIGINS)
):
    raise RuntimeError("Production requires HTTPS origins.")
COOKIE_NAME = "__Host-prato_session" if APP_ENV == "production" else "prato_session"
TERMS_VERSION = os.getenv("TERMS_VERSION", "2026-09-11-draft")
REGISTRATION_ENABLED = os.getenv("REGISTRATION_ENABLED", "false").lower() == "true"
if APP_ENV == "production" and REGISTRATION_ENABLED and TERMS_VERSION.endswith("-draft"):
    raise RuntimeError(
        "Publish the reviewed documents and set their matching version before public registration."
    )
SMTP_HOST, SMTP_FROM = os.getenv("SMTP_HOST"), os.getenv("SMTP_FROM")
SMTP_USER, SMTP_PASSWORD = os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
password_hasher = PasswordHash.recommended()
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(24))
app = FastAPI(
    title="Prato Certo — Contas",
    docs_url="/api/docs" if APP_ENV != "production" else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if APP_ENV != "production" else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def db_session():
    with Session(engine) as db:
        yield db


@app.middleware("http")
async def protect_requests(request: Request, call_next):
    if (
        request.method in {"POST", "PUT", "PATCH", "DELETE"}
        and request.headers.get("origin") not in ALLOWED_ORIGINS
    ):
        return JSONResponse({"detail": "Origem da solicitação não permitida."}, status_code=403)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(RequestValidationError)
async def invalid_payload(request, exc):
    # Do not reflect password input or full Pydantic error payloads to clients.
    return JSONResponse(
        {
            "detail": "Confira os campos informados. Use e-mail válido e senha de 12 a 128 caracteres para cadastro."
        },
        status_code=422,
    )


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).strip().lower()


class RegisterInput(LoginInput):
    name: str = Field(min_length=2, max_length=100)
    kitchen: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=12, max_length=128)
    accepted_terms: bool
    terms_version: str = Field(max_length=60)

    @field_validator("name", "kitchen")
    @classmethod
    def meaningful_text(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Informe pelo menos dois caracteres.")
        return value


class ForgotInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class ResetInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=12, max_length=128)


def user_output(user):
    return {"id": user.id, "name": user.name, "email": user.email, "kitchen": user.kitchen}


def rate_limit(db, request, action, email="", limit=10):
    # Atomic upsert; all workers share limits. No trust in client-supplied forwarded headers.
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert

    current = now()
    bucket = int(datetime.now(timezone.utc).timestamp()) // 900
    identities = [f'ip:{request.client.host if request.client else "unknown"}']
    if email:
        identities.append(f"email:{email.lower()}")
    insert = sqlite_insert if engine.dialect.name == "sqlite" else pg_insert
    db.execute(delete(RateLimit).where(RateLimit.expires_at < current))
    db.execute(delete(AuthSession).where(AuthSession.expires_at < current))
    db.execute(delete(PasswordReset).where(PasswordReset.expires_at < current))
    exceeded = False
    for identity in identities:
        key = digest(f"{action}:{identity}:{bucket}")
        stmt = insert(RateLimit).values(
            key=key, count=1, expires_at=current + timedelta(minutes=16)
        )
        count = db.execute(
            stmt.on_conflict_do_update(
                index_elements=["key"], set_={"count": RateLimit.count + 1}
            ).returning(RateLimit.count)
        ).scalar_one()
        exceeded = exceeded or count > limit
    db.commit()
    if exceeded:
        raise HTTPException(
            429,
            "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
            headers={"Retry-After": "900"},
        )


def create_session(db, user, response, request):
    old_token = request.cookies.get(COOKIE_NAME)
    if old_token:
        db.execute(delete(AuthSession).where(AuthSession.digest == digest(old_token)))
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(digest=digest(token), user_id=user.id, expires_at=now() + timedelta(hours=12))
    )
    db.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=43200,
        httponly=True,
        secure=APP_ENV == "production",
        samesite="lax",
        path="/",
    )


def current_user(request: Request, db: Session = Depends(db_session)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Entre na sua conta para continuar.")
    session = db.get(AuthSession, digest(token))
    if not session or session.expires_at <= now():
        raise HTTPException(401, "Sua sessão expirou. Entre novamente.")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Entre novamente.")
    return user


@app.get("/api/auth/status")
def status():
    return {
        "service": "prato-certo-auth",
        "registration": REGISTRATION_ENABLED,
        "password_reset": bool(SMTP_HOST and SMTP_FROM),
        "terms_version": TERMS_VERSION,
    }


@app.post("/api/auth/register", status_code=201)
def register(
    data: RegisterInput, request: Request, response: Response, db: Session = Depends(db_session)
):
    if not REGISTRATION_ENABLED:
        raise HTTPException(503, "Novos cadastros ainda não foram abertos.")
    rate_limit(db, request, "register", data.email, 5)
    if not data.accepted_terms or data.terms_version != TERMS_VERSION:
        raise HTTPException(400, "Leia e aceite a versão atual dos termos antes de continuar.")
    user = User(
        id=str(uuid.uuid4()),
        name=data.name,
        email=data.email,
        kitchen=data.kitchen,
        password_hash=password_hasher.hash(data.password),
        created_at=now(),
        accepted_terms_at=now(),
        terms_version=TERMS_VERSION,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Não foi possível cadastrar este e-mail. Tente entrar ou recuperar seu acesso."
        )
    create_session(db, user, response, request)
    return user_output(user)


@app.post("/api/auth/login")
def login(
    data: LoginInput, request: Request, response: Response, db: Session = Depends(db_session)
):
    rate_limit(db, request, "login", data.email)
    user = db.scalar(select(User).where(User.email == data.email))
    valid = password_hasher.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "E-mail ou senha incorretos.")
    create_session(db, user, response, request)
    return user_output(user)


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return user_output(user)


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(db_session)):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        db.execute(delete(AuthSession).where(AuthSession.digest == digest(token)))
        db.commit()
    response.delete_cookie(
        COOKIE_NAME, path="/", secure=APP_ENV == "production", httponly=True, samesite="lax"
    )
    return {"message": "Sessão encerrada."}


def send_reset_email(email, token):
    link = f"{PUBLIC_APP_URL}/#/redefinir-senha?token={token}"
    message = EmailMessage()
    message["Subject"] = "Redefina sua senha — Prato Certo"
    message["From"] = SMTP_FROM
    message["To"] = email
    message.set_content(
        f"Você solicitou uma nova senha para o Prato Certo.\n\nAbra este link em até 30 minutos: {link}\n\nSe não foi você, ignore esta mensagem. Nenhuma senha foi alterada."
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.starttls(context=ssl.create_default_context())
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD or "")
        server.send_message(message)


@app.post("/api/auth/forgot-password")
def forgot(data: ForgotInput, request: Request, db: Session = Depends(db_session)):
    if not SMTP_HOST or not SMTP_FROM:
        raise HTTPException(503, "A recuperação por e-mail ainda não está disponível.")
    email = str(data.email).strip().lower()
    rate_limit(db, request, "forgot", email, 5)
    user = db.scalar(select(User).where(User.email == email))
    if user:
        token = secrets.token_urlsafe(32)
        db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
        db.add(
            PasswordReset(
                digest=digest(token), user_id=user.id, expires_at=now() + timedelta(minutes=30)
            )
        )
        db.commit()
        try:
            send_reset_email(email, token)
        except (OSError, smtplib.SMTPException):
            db.execute(delete(PasswordReset).where(PasswordReset.digest == digest(token)))
            db.commit()
            raise HTTPException(
                503, "Não foi possível enviar o e-mail agora. Tente novamente mais tarde."
            )
    return {
        "message": "Se houver uma conta com esse e-mail, você receberá um link de recuperação. Confira também a pasta de spam."
    }


@app.post("/api/auth/reset-password")
def reset_password(
    data: ResetInput, request: Request, response: Response, db: Session = Depends(db_session)
):
    rate_limit(db, request, "reset", limit=10)
    # Claim by atomic DELETE so concurrent requests cannot reuse a token.
    user_id = db.execute(
        delete(PasswordReset)
        .where(PasswordReset.digest == digest(data.token), PasswordReset.expires_at > now())
        .returning(PasswordReset.user_id)
    ).scalar_one_or_none()
    if not user_id:
        raise HTTPException(400, "Link inválido ou expirado. Solicite um novo link.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(400, "Link inválido ou expirado.")
    user.password_hash = password_hasher.hash(data.password)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
    db.execute(delete(PasswordReset).where(PasswordReset.user_id == user_id))
    db.commit()
    response.delete_cookie(
        COOKIE_NAME, path="/", secure=APP_ENV == "production", httponly=True, samesite="lax"
    )
    return {"message": "Senha atualizada. Entre novamente."}
