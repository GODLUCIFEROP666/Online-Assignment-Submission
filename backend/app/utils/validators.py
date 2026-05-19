import re


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^\d{10}$")


def is_valid_email(value: str) -> bool:
    return bool(EMAIL_RE.match(value))


def is_valid_phone(value: str) -> bool:
    return bool(PHONE_RE.match(value))
