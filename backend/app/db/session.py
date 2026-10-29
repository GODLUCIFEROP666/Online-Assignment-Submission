import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument

from app.core.config import get_settings

logger = logging.getLogger("app.db")


class MongoDBManager:
    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.db = None

    def init_db(self, mongodb_uri: str, db_name: str) -> None:
        """
        Initialize the shared AsyncIOMotorClient with tuned connection pooling
        and resilient timeouts suited for MongoDB Atlas free tier (M0).
        """
        self.client = AsyncIOMotorClient(
            mongodb_uri,
            minPoolSize=1,
            maxPoolSize=15,
            maxIdleTimeMS=45000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        self.db = self.client[db_name]

    def close_db(self) -> None:
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

    async def ping(self) -> bool:
        """Lightweight database connectivity check."""
        if self.client is None or self.db is None:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception as exc:
            logger.warning("Database ping failed: %s", exc)
            return False


mongodb_manager = MongoDBManager()


async def init_db() -> None:
    settings = get_settings()
    diag = settings.mongodb_diagnostics

    logger.info(
        "MongoDB Startup Diagnostics: selected_var=%s | scheme=%s | host=%s | path_db=%s | auth_source=%s | user_present=%s | pass_len=%s | placeholder_brackets=%s",
        diag.get("selected_var"),
        diag.get("scheme"),
        diag.get("host"),
        diag.get("database_path"),
        diag.get("auth_source"),
        diag.get("has_username"),
        diag.get("password_length"),
        diag.get("has_placeholder_brackets"),
    )
    if diag.get("other_configured_vars"):
        logger.info("Other database env vars detected (ignored): %s", diag.get("other_configured_vars"))

    if diag.get("had_whitespace_or_quotes"):
        logger.warning("Sanitized accidental leading/trailing quotes or whitespace from %s.", diag.get("selected_var"))

    if diag.get("has_placeholder_brackets"):
        logger.error(
            "CRITICAL ATLAS AUTH ISSUE: Detected placeholder angle brackets '<' or '>' in %s credentials! "
            "Please remove the '<' and '>' brackets around your username/password in Render environment variables. "
            "Example: mongodb+srv://myuser:mypassword123@... (NOT :<mypassword123>@)",
            diag.get("selected_var"),
        )

    if diag.get("selected_var") == "fallback_localhost":
        logger.warning(
            "WARNING: Neither MONGODB_URI nor DATABASE_URL was set in environment. Falling back to localhost:27017."
        )

    mongodb_manager.init_db(settings.effective_mongodb_uri, settings.mongodb_db_name)


async def ensure_database_indexes(db) -> None:
    """
    Ensure required MongoDB indexes in parallel using asyncio.gather
    without blocking application startup or health check availability.
    """
    index_tasks = [
        db.users.create_index("username", unique=True),
        db.users.create_index("email", unique=True),
        db.users.create_index("seat_no", unique=True),
        db.admins.create_index("username", unique=True),
        db.admins.create_index("email", unique=True),
        db.assignments.create_index("user_id"),
        db.assignments.create_index("status"),
        db.colleges.create_index("name_normalized", unique=True),
        db.notifications.create_index("recipient_user_id"),
        db.notifications.create_index("recipient_role"),
        db.notifications.create_index("is_read"),
        db.notifications.create_index("created_at"),
        db.pending_registrations.create_index("username"),
        db.pending_registrations.create_index("id", unique=True),
        db.pending_registrations.create_index("expires_at", expireAfterSeconds=0),
    ]
    results = await asyncio.gather(*index_tasks, return_exceptions=True)
    failures = [r for r in results if isinstance(r, Exception)]
    if failures:
        logger.warning("Some database indexes could not be created: %s", failures)
    else:
        logger.info("All MongoDB indexes verified successfully in parallel.")


async def close_db() -> None:
    mongodb_manager.close_db()


async def get_mongodb_db():
    if mongodb_manager.db is None:
        raise RuntimeError("Database not initialized. Call init_db first.")
    return mongodb_manager.db


async def get_next_sequence_value(db, sequence_name: str) -> int:
    """
    Emulate SQL auto-increment behavior using a counters collection with atomic updates.
    """
    sequence_document = await db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return sequence_document["sequence_value"]
