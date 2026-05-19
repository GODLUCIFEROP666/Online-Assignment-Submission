from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    if hashed.startswith("$2a$") or hashed.startswith("$2b$") or hashed.startswith("$2y$"):
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    return pwd_context.verify(password, hashed)


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expires_minutes),
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_refresh_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expires_days),
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_refresh_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise ValueError("Invalid access token")
        return payload
    except JWTError as exc:
        raise ValueError("Invalid access token") from exc


def decode_refresh_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_refresh_secret, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")
        return payload
    except JWTError as exc:
        raise ValueError("Invalid refresh token") from exc


def auth_cookie_kwargs() -> dict[str, object]:
    settings = get_settings()
    same_site = "none" if settings.cookie_secure else "lax"
    return {
        "httponly": True,
        "samesite": same_site,
        "secure": settings.cookie_secure,
        "path": "/",
    }
