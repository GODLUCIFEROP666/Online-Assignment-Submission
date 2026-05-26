from collections.abc import Callable

from fastapi import Cookie, Depends, Header, HTTPException, status

from app.core.security import decode_access_token, decode_refresh_token
from app.db.session import get_mongodb_db


def get_bearer_token(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


def get_access_token_from_request(
    bearer_token: str | None = Depends(get_bearer_token),
    refresh_cookie: str | None = Cookie(default=None, alias="refresh_token"),
    access_cookie: str | None = Cookie(default=None, alias="final2_access_token"),
) -> str | None:
    return bearer_token or access_cookie or refresh_cookie


def get_current_claims(
    token: str | None = Depends(get_access_token_from_request),
    access_cookie: str | None = Cookie(default=None, alias="final2_access_token"),
    refresh_cookie: str | None = Cookie(default=None, alias="refresh_token"),
) -> dict:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        return decode_access_token(token)
    except ValueError as exc:
        # If the access token is missing/expired but the refresh cookie is still valid,
        # fall back to the refresh cookie instead of re-decoding the expired access token.
        refresh_token = token if token == refresh_cookie else refresh_cookie
        if refresh_token:
            try:
                return decode_refresh_token(refresh_token)
            except ValueError as refresh_exc:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(refresh_exc)) from refresh_exc
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def db_session() -> Callable:
    return get_mongodb_db


async def find_assignment_by_id_or_objectid(db, assignment_id: str | int) -> dict | None:
    from bson import ObjectId

    # 1. Try querying by id as integer
    try:
        val = int(assignment_id)
        res = await db.assignments.find_one({"id": val})
        if res:
            return res
    except (ValueError, TypeError):
        pass

    # 2. Try querying by id as string
    try:
        res = await db.assignments.find_one({"id": str(assignment_id)})
        if res:
            return res
    except Exception:
        pass

    # 3. Try querying by _id as ObjectId
    try:
        res = await db.assignments.find_one({"_id": ObjectId(str(assignment_id))})
        if res:
            return res
    except Exception:
        pass

    # 4. Try querying by _id as string
    try:
        res = await db.assignments.find_one({"_id": str(assignment_id)})
        if res:
            return res
    except Exception:
        pass

    return None


async def find_user_by_id_or_objectid(db, user_id: str | int) -> dict | None:
    from bson import ObjectId

    try:
        val = int(user_id)
        res = await db.users.find_one({"id": val})
        if res:
            return res
    except (ValueError, TypeError):
        pass

    try:
        res = await db.users.find_one({"id": str(user_id)})
        if res:
            return res
    except Exception:
        pass

    try:
        res = await db.users.find_one({"_id": ObjectId(str(user_id))})
        if res:
            return res
    except Exception:
        pass

    try:
        res = await db.users.find_one({"_id": str(user_id)})
        if res:
            return res
    except Exception:
        pass

    return None


async def find_admin_by_id_or_objectid(db, admin_id: str | int) -> dict | None:
    from bson import ObjectId

    try:
        val = int(admin_id)
        res = await db.admins.find_one({"id": val})
        if res:
            return res
    except (ValueError, TypeError):
        pass

    try:
        res = await db.admins.find_one({"id": str(admin_id)})
        if res:
            return res
    except Exception:
        pass

    try:
        res = await db.admins.find_one({"_id": ObjectId(str(admin_id))})
        if res:
            return res
    except Exception:
        pass

    try:
        res = await db.admins.find_one({"_id": str(admin_id)})
        if res:
            return res
    except Exception:
        pass

    return None

