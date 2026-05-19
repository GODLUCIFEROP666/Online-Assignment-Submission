from fastapi import APIRouter, status
from pydantic import EmailStr

from app.services.notification_service import build_notification_context

router = APIRouter()


@router.post("/email-otp", status_code=status.HTTP_200_OK)
async def email_otp(email: EmailStr) -> dict[str, object]:
    return {
        "status": "scaffold",
        "route": "/api/notifications/email-otp",
        "context": build_notification_context(email, "Email OTP"),
    }


@router.post("/mobile-otp", status_code=status.HTTP_200_OK)
async def mobile_otp(phone: str) -> dict[str, object]:
    return {"status": "scaffold", "route": "/api/notifications/mobile-otp", "phone": phone}


@router.post("/password-reset", status_code=status.HTTP_200_OK)
async def password_reset(email: EmailStr) -> dict[str, object]:
    return {
        "status": "scaffold",
        "route": "/api/notifications/password-reset",
        "context": build_notification_context(email, "Password Reset"),
    }
