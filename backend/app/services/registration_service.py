from datetime import datetime, timedelta, timezone
from app.core.security import hash_password
from app.db.session import get_next_sequence_value
from app.services.otp_service import generate_otp

def build_course_year(course: str, sem: str) -> str:
    return f"{course} - {sem}"

async def create_pending_registration(db, payload) -> dict:
    pending_id = await get_next_sequence_value(db, "pending_registrations")
    pending = {
        "id": pending_id,
        "full_name": payload.full_name,
        "username": payload.username,
        "seat_no": payload.seat_no,
        "email": payload.email,
        "phone": payload.phone,
        "college": payload.college,
        "course": payload.course,
        "sem": payload.sem,
        "password_hash": hash_password(payload.password),
        "email_otp": generate_otp(),
        "phone_otp": generate_otp(),
        "email_verified": 0,
        "phone_verified": 0,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
    }
    await db.pending_registrations.insert_one(pending)
    return pending

async def get_pending_registration(db, registration_id: int) -> dict | None:
    return await db.pending_registrations.find_one({"id": int(registration_id)})

async def verify_pending_email(db, registration_id: int, otp: str) -> bool:
    pending = await get_pending_registration(db, registration_id)
    if not pending:
        return False
    expires_at = pending.get("expires_at")
    if expires_at:
        # Convert expires_at to timezone-aware if naive, or check with utcnow
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return False
    if pending.get("email_otp") != otp:
        return False
        
    await db.pending_registrations.update_one(
        {"id": int(registration_id)},
        {"$set": {"email_verified": 1}}
    )
    return True

async def verify_pending_phone(db, registration_id: int, otp: str) -> bool:
    pending = await get_pending_registration(db, registration_id)
    if not pending:
        return False
    expires_at = pending.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return False
    if pending.get("phone_otp") != otp:
        return False
        
    await db.pending_registrations.update_one(
        {"id": int(registration_id)},
        {"$set": {"phone_verified": 1}}
    )
    return True

async def complete_pending_registration(db, registration_id: int) -> dict | None:
    pending = await get_pending_registration(db, registration_id)
    if not pending or pending.get("email_verified") != 1 or pending.get("phone_verified") != 1:
        return None
    expires_at = pending.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None

    # Check duplicates in users collection
    existing = await db.users.find_one({
        "$or": [
            {"username": pending["username"]},
            {"email": pending["email"]},
            {"seat_no": pending["seat_no"]}
        ]
    })
    if existing:
        return None

    user_id = await get_next_sequence_value(db, "users")
    user = {
        "id": user_id,
        "full_name": pending["full_name"],
        "username": pending["username"],
        "email": pending["email"],
        "phone": pending["phone"],
        "college": pending["college"],
        "course_year": build_course_year(pending["course"], pending["sem"]),
        "seat_no": pending["seat_no"],
        "password": pending["password_hash"],
        "is_email_verified": 1,
        "is_phone_verified": 1,
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.users.insert_one(user)
    await db.pending_registrations.delete_one({"id": int(registration_id)})
    return user
