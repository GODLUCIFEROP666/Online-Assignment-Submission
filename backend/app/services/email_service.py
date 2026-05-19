from dataclasses import dataclass


@dataclass(slots=True)
class EmailPayload:
    to: str
    subject: str
    html: str


def build_otp_email(recipient: str, otp: str, purpose: str) -> EmailPayload:
    return EmailPayload(
        to=recipient,
        subject=f"FINAL2 {purpose}",
        html=f"<p>Your verification code is <strong>{otp}</strong>.</p>",
    )
