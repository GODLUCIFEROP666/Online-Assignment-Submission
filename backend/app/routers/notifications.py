from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_claims
from app.db.session import get_mongodb_db
from app.services.notification_service import (
    build_notification_query,
    list_notifications_for_claims,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def list_notifications(
    claims: dict = Depends(get_current_claims),
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    items = await list_notifications_for_claims(db, claims, limit=limit, unread_only=unread_only)
    unread_query = build_notification_query(claims)
    unread_query["is_read"] = 0
    unread_count = await db.notifications.count_documents(unread_query)
    return {"status": "success", "items": items, "count": len(items), "unread_count": unread_count}


@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def read_notification(
    notification_id: int,
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    updated = await mark_notification_read(db, notification_id, claims)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"status": "success", "notification": updated}


@router.patch("/read-all", status_code=status.HTTP_200_OK)
async def read_all_notifications(
    claims: dict = Depends(get_current_claims),
    db = Depends(get_mongodb_db),
) -> dict[str, object]:
    modified_count = await mark_all_notifications_read(db, claims)
    return {"status": "success", "updated": modified_count}
