from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings

class MongoDBManager:
    def __init__(self):
        self.client = None
        self.db = None

    def init_db(self, mongodb_uri: str, db_name: str):
        self.client = AsyncIOMotorClient(mongodb_uri)
        self.db = self.client[db_name]

    def close_db(self):
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

mongodb_manager = MongoDBManager()

async def init_db() -> None:
    settings = get_settings()
    mongodb_manager.init_db(settings.mongodb_uri, settings.mongodb_db_name)
    
    # Initialize indexes and sequence counter seed on startup
    db = mongodb_manager.db
    # Create required indexes
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("seat_no", unique=True)
    await db.admins.create_index("username", unique=True)
    await db.admins.create_index("email", unique=True)
    await db.assignments.create_index("user_id")
    await db.assignments.create_index("status")
    await db.pending_registrations.create_index("username")

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
        return_document=True
    )
    return sequence_document["sequence_value"]
