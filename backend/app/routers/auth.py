from datetime import datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.core.security import auth_cookie_kwargs, decode_refresh_token
from app.db.models import Admin, User
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    OTPVerifyRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RegisterRequest,
    RegistrationCompleteRequest,
)
from app.services.auth_service import build_token_pair
from app.services.registration_service import complete_pending_registration, create_pending_registration, verify_pending_email, verify_pending_phone
from app.services.otp_service import generate_otp

router = APIRouter()


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie("refresh_token", token, **auth_cookie_kwargs())


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie("refresh_token", path="/")


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(or_(User.username == payload.identifier, User.email == payload.identifier)).first()
    if user and verify_password(payload.password, user.password):
        claims = {"role": "student", "user_id": user.id, "username": user.username}
        tokens = build_token_pair(str(user.id), claims)
        _set_refresh_cookie(response, tokens["refresh_token"])
        return {
            "status": "success",
            "role": "student",
            "user": {"id": user.id, "username": user.username, "full_name": user.full_name},
            "access_token": tokens["access_token"],
        }

    admin = db.query(Admin).filter(or_(Admin.username == payload.identifier, Admin.email == payload.identifier)).first()
    if admin and verify_password(payload.password, admin.password):
        claims = {"role": admin.role, "admin_id": admin.id, "username": admin.username, "college": admin.college, "course": admin.course}
        tokens = build_token_pair(str(admin.id), claims)
        _set_refresh_cookie(response, tokens["refresh_token"])
        return {
            "status": "success",
            "role": admin.role,
            "admin": {"id": admin.id, "username": admin.username, "name": admin.name},
            "access_token": tokens["access_token"],
        }

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_session(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
) -> dict[str, object]:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    try:
        claims = decode_refresh_token(refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    subject = str(claims.get("sub") or "")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    payload = {key: value for key, value in claims.items() if key not in {"exp", "iat", "nbf", "type"}}
    tokens = build_token_pair(subject, payload)
    _set_refresh_cookie(response, tokens["refresh_token"])
    return {"status": "success", "access_token": tokens["access_token"], "role": claims.get("role")}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response) -> dict[str, str]:
    _clear_refresh_cookie(response)
    return {"status": "success", "message": "Logged out"}


@router.post("/register/start", status_code=status.HTTP_200_OK)
async def register_start(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    existing_user = db.query(User).filter(or_(User.username == payload.username, User.email == payload.email, User.seat_no == payload.seat_no)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username, email, or seat number already exists")

    pending = create_pending_registration(db, payload)
    return {
        "status": "success",
        "registration_id": pending.id,
        "email_otp": pending.email_otp,
        "phone_otp": pending.phone_otp,
        "message": "OTP codes generated for verification",
    }


@router.post("/register/verify-email-otp", status_code=status.HTTP_200_OK)
async def verify_email_otp(payload: OTPVerifyRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    if not verify_pending_email(db, payload.registration_id, payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email OTP")
    return {"status": "success", "message": "Email verified"}


@router.post("/register/verify-phone-otp", status_code=status.HTTP_200_OK)
async def verify_phone_otp(payload: OTPVerifyRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    if not verify_pending_phone(db, payload.registration_id, payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone OTP")
    return {"status": "success", "message": "Phone verified"}


@router.post("/register/complete", status_code=status.HTTP_200_OK)
async def register_complete(payload: RegistrationCompleteRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    user = complete_pending_registration(db, payload.registration_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration is not verified or could not be completed")
    return {"status": "success", "user_id": user.id, "username": user.username}


@router.post("/password/forgot", status_code=status.HTTP_200_OK)
async def password_forgot(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    return {"status": "success", "email": user.email, "otp": otp}


@router.post("/password/reset", status_code=status.HTTP_200_OK)
async def password_reset(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset request")
    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
    if user.otp != payload.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
    user.password = hash_password(payload.new_password)
    user.otp = None
    user.otp_expiry = None
    db.commit()
    return {"status": "success", "message": "Password updated"}


@router.get("/username-available", status_code=status.HTTP_200_OK)
async def username_available(username: str, db: Session = Depends(get_db)) -> dict[str, object]:
    exists = db.query(User.id).filter(User.username == username).first()
    return {"status": "success", "available": exists is None, "username": username}


@router.get("/contact-available", status_code=status.HTTP_200_OK)
async def contact_available(email: str | None = None, phone: str | None = None, db: Session = Depends(get_db)) -> dict[str, object]:
    exists = None
    if email:
        exists = db.query(User.id).filter(User.email == email).first()
    if not exists and phone:
        exists = db.query(User.id).filter(User.phone == phone).first()
    return {"status": "success", "available": exists is None, "email": email, "phone": phone}
