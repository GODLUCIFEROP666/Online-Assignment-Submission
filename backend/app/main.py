import asyncio
from contextlib import asynccontextmanager
import logging
import time
from fastapi import FastAPI, Response, status

from app.core.cors import configure_cors
from app.core.middleware import TimingLoggingMiddleware
from app.db.session import (
    close_db,
    ensure_database_indexes,
    get_mongodb_db,
    init_db,
    mongodb_manager,
)
from app.routers import admin, analytics, assignments, auth, files, notifications, users
from app.services.demo_service import (
    ensure_demo_admin,
    ensure_demo_colleges,
    ensure_demo_notifications,
    ensure_demo_student,
    ensure_demo_superadmin,
)

logger = logging.getLogger("app.main")


async def _run_background_seeding(db) -> None:
    """Non-blocking background index check and demo accounts verification."""
    try:
        t0 = time.perf_counter()
        await ensure_database_indexes(db)
        await asyncio.gather(
            ensure_demo_student(db),
            ensure_demo_admin(db),
            ensure_demo_superadmin(db),
            ensure_demo_colleges(db),
            return_exceptions=True,
        )
        await ensure_demo_notifications(db)
        logger.info(
            "Background indexing and demo initialization completed in %.2fs",
            time.perf_counter() - t0,
        )
    except Exception as exc:
        logger.warning("Background seeding encountered non-fatal error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_start = time.perf_counter()
    logger.info("Initializing database connection...")
    await init_db()
    db = await get_mongodb_db()

    # Pre-warm connection with a quick ping
    is_connected = await mongodb_manager.ping()
    startup_ms = (time.perf_counter() - startup_start) * 1000.0
    logger.info(
        "Application startup ready in %.2fms (Database ping: %s)",
        startup_ms,
        "success" if is_connected else "pending",
    )

    # Launch background index creation & demo seeding asynchronously
    asyncio.create_task(_run_background_seeding(db))

    yield

    logger.info("Closing database connections...")
    await close_db()
    logger.info("Application shutdown complete.")


app = FastAPI(title="FINAL2 API", version="0.1.0", lifespan=lifespan)
configure_cors(app)
app.add_middleware(TimingLoggingMiddleware)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """
    Lightweight health check for Render free-tier probes and uptime pingers.
    Does NOT execute database queries to guarantee instant response (< 5ms).
    """
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def readiness_check(response: Response) -> dict[str, str]:
    """
    Readiness probe that checks database connectivity with a safe timeout.
    """
    is_ready = await mongodb_manager.ping()
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "database": "disconnected"}
    return {"status": "ok", "database": "connected"}
