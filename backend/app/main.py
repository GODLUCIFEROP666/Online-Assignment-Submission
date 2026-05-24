from fastapi import FastAPI

from app.core.cors import configure_cors
from app.db.session import init_db, close_db, get_mongodb_db
from app.routers import admin, analytics, assignments, auth, files, notifications, users
from app.services.demo_service import (
    ensure_demo_admin,
    ensure_demo_colleges,
    ensure_demo_notifications,
    ensure_demo_student,
    ensure_demo_superadmin,
)

app = FastAPI(title="FINAL2 API", version="0.1.0")
configure_cors(app)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "FINAL2 API"}


@app.on_event("startup")
async def startup() -> None:
    await init_db()
    db = await get_mongodb_db()
    try:
        await ensure_demo_student(db)
        await ensure_demo_admin(db)
        await ensure_demo_superadmin(db)
        await ensure_demo_colleges(db)
        await ensure_demo_notifications(db)
    except Exception as e:
        print(f"Error during seeding: {e}")


@app.on_event("shutdown")
async def shutdown() -> None:
    await close_db()
