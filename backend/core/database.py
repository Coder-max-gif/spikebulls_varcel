from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from core.config import settings
import logging
import certifi

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        # Connection options optimized for MongoDB Atlas
        client_options = {
            "serverSelectionTimeoutMS": 5000,
            "maxPoolSize": 50,
            "minPoolSize": 5,
            "maxIdleTimeMS": 30000,
        }
        if settings.MONGO_TLS:
            client_options["tls"] = True
            client_options["tlsAllowInvalidCertificates"] = False
            client_options["tlsCAFile"] = certifi.where()
        _client = AsyncIOMotorClient(
            settings.MONGO_URL,
            **client_options
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.DB_NAME]


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.licenses.create_index("key", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.contact_submissions.create_index("created_at")
    await db.email_outbox.create_index("created_at")
    await db.download_logs.create_index("user_id")
    await db.download_logs.create_index("product_id")
    await db.download_logs.create_index("created_at")
