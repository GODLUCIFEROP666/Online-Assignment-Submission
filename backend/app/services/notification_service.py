from __future__ import annotations

from datetime import datetime, timezone

from app.db.session import get_next_sequence_value
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


async def create_notification(
    db,
    *,
    title: str,
    body: str,
    recipient_user_id: int | None = None,
    recipient_role: str | None = None,
    college: str | None = None,
    category: str = "system",
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> dict[str, object]:
    notification_id = await get_next_sequence_value(db, "notifications")
    notification = {
        "id": notification_id,
        "recipient_user_id": recipient_user_id,
        "recipient_role": recipient_role,
        "college": college,
        "title": title,
        "body": body,
        "category": category,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "is_read": 0,
        "created_at": datetime.now(timezone.utc),
        "read_at": None,
    }
    await db.notifications.insert_one(notification)
    return notification


def serialize_notification(notification: dict) -> dict[str, object]:
    created_at = notification.get("created_at")
    read_at = notification.get("read_at")
    return {
        "id": notification.get("id"),
        "recipient_user_id": notification.get("recipient_user_id"),
        "recipient_role": notification.get("recipient_role"),
        "college": notification.get("college"),
        "title": notification.get("title"),
        "body": notification.get("body"),
        "category": notification.get("category"),
        "entity_type": notification.get("entity_type"),
        "entity_id": notification.get("entity_id"),
        "is_read": bool(notification.get("is_read")),
        "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
        "read_at": read_at.isoformat() if hasattr(read_at, "isoformat") else read_at,
    }


def build_notification_query(claims: dict) -> dict[str, object]:
    role = claims.get("role")
    if role == "student":
        return {
            "$or": [
                {"recipient_user_id": claims.get("user_id")},
                {"recipient_role": "student", "college": None},
                {"recipient_role": "student", "college": claims.get("college")},
            ]
        }
    elif role in {"teacher", "superadmin"}:
        return {
            "$or": [
                {"recipient_user_id": claims.get("admin_id")},
                {"recipient_role": role},
                {"recipient_role": "teacher", "college": claims.get("college")},
                {"recipient_role": "superadmin", "college": None},
            ]
        }
    return {"recipient_user_id": claims.get("user_id")}


async def list_notifications_for_claims(db, claims: dict, *, limit: int = 20, unread_only: bool = False) -> list[dict[str, object]]:
    query = build_notification_query(claims)
    if unread_only:
        query["is_read"] = 0

    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    notifications = await cursor.to_list(length=None)
    return [serialize_notification(notification) for notification in notifications]


async def mark_notification_read(db, notification_id: int, claims: dict) -> dict[str, object] | None:
    notification = await db.notifications.find_one({"id": notification_id})
    if not notification:
        return None

    role = claims.get("role")
    allowed = False
    if role == "student":
        allowed = notification.get("recipient_user_id") == claims.get("user_id")
    elif role in {"teacher", "superadmin"}:
        allowed = (
            notification.get("recipient_user_id") == claims.get("admin_id")
            or notification.get("recipient_role") == role
            or (notification.get("recipient_role") == "teacher" and notification.get("college") == claims.get("college"))
        )

    if not allowed:
        return None

    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": 1, "read_at": datetime.now(timezone.utc)}},
    )
    updated = await db.notifications.find_one({"id": notification_id})
    return serialize_notification(updated) if updated else None


async def mark_all_notifications_read(db, claims: dict) -> int:
    query = build_notification_query(claims)
    query["is_read"] = 0

    result = await db.notifications.update_many(query, {"$set": {"is_read": 1, "read_at": datetime.now(timezone.utc)}})
    return int(result.modified_count)
