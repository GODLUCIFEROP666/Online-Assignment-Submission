from collections.abc import Callable

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, decode_refresh_token
from app.db.session import get_db


def get_bearer_token(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


def get_access_token_from_request(
    bearer_token: str | None = Depends(get_bearer_token),
    refresh_cookie: str | None = Cookie(default=None, alias="refresh_token"),
) -> str | None:
    return bearer_token or refresh_cookie


def get_current_claims(token: str | None = Depends(get_access_token_from_request)) -> dict:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        return decode_access_token(token)
    except ValueError as exc:
        if token:
            try:
                return decode_refresh_token(token)
            except ValueError as refresh_exc:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(refresh_exc)) from refresh_exc
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def db_session() -> Callable[[], Session]:
    return get_db
