from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.db.models import PendingRegistration, User
from app.services.otp_service import generate_otp


def build_course_year(course: str, sem: str) -> str:
    return f"{course} - {sem}"


def create_pending_registration(db: Session, payload) -> PendingRegistration:
    pending = PendingRegistration(
        full_name=payload.full_name,
        username=payload.username,
        seat_no=payload.seat_no,
        email=payload.email,
        phone=payload.phone,
        college=payload.college,
        course=payload.course,
        sem=payload.sem,
        password_hash=hash_password(payload.password),
        email_otp=generate_otp(),
        phone_otp=generate_otp(),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(pending)
    db.commit()
    db.refresh(pending)
    return pending


def get_pending_registration(db: Session, registration_id: int) -> PendingRegistration | None:
    return db.get(PendingRegistration, registration_id)


def verify_pending_email(db: Session, registration_id: int, otp: str) -> bool:
    pending = get_pending_registration(db, registration_id)
    if not pending or (pending.expires_at and pending.expires_at < datetime.now(timezone.utc)) or pending.email_otp != otp:
        return False
    pending.email_verified = 1
    db.commit()
    return True


def verify_pending_phone(db: Session, registration_id: int, otp: str) -> bool:
    pending = get_pending_registration(db, registration_id)
    if not pending or (pending.expires_at and pending.expires_at < datetime.now(timezone.utc)) or pending.phone_otp != otp:
        return False
    pending.phone_verified = 1
    db.commit()
    return True


def complete_pending_registration(db: Session, registration_id: int) -> User | None:
    pending = get_pending_registration(db, registration_id)
    if not pending or (pending.expires_at and pending.expires_at < datetime.now(timezone.utc)) or pending.email_verified != 1 or pending.phone_verified != 1:
        return None

    existing = db.execute(
        select(User).where((User.username == pending.username) | (User.email == pending.email) | (User.seat_no == pending.seat_no))
    ).scalar_one_or_none()
    if existing:
        return None

    user = User(
        full_name=pending.full_name,
        username=pending.username,
        email=pending.email,
        phone=pending.phone,
        college=pending.college,
        course_year=build_course_year(pending.course, pending.sem),
        seat_no=pending.seat_no,
        password=pending.password_hash,
        is_email_verified=1,
        is_phone_verified=1,
    )
    db.add(user)
    db.execute(delete(PendingRegistration).where(PendingRegistration.id == registration_id))
    db.commit()
    db.refresh(user)
    return user
