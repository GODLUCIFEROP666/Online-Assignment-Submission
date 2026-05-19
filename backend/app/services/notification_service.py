from app.services.email_service import build_otp_email
from app.services.otp_service import generate_otp


def build_notification_context(recipient: str, purpose: str) -> dict[str, str]:
    otp = generate_otp()
    email = build_otp_email(recipient, otp, purpose)
    return {
        "otp": otp,
        "recipient": email.to,
        "subject": email.subject,
    }
