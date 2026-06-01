import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.database import close_db, ensure_indexes, get_db
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from routes.checkout import router as checkout_router, orders_router
from routes.contact import router as contact_router
from routes.downloads import router as downloads_router
from routes.licenses import router as licenses_router
from routes.payments import router as payments_router
from routes.products import router as products_router, testimonials_router
from routes.user import router as user_router
from services.seed import seed_database

limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("Starting SpikeBulls backend...")
    logger.info("=" * 60)
    
    try:
        logger.info("[1/7] Initializing FastAPI app...")
        
        logger.info("[2/7] Connecting to MongoDB Atlas...")
        db = get_db()
        await db.command("ping")
        logger.info("✓ MongoDB connection established successfully")
        
        logger.info("[3/7] Creating storage directories...")
        STORAGE_DIR = Path(__file__).parent / "storage"
        PRODUCT_IMAGES_DIR = STORAGE_DIR / "product-images"
        PRODUCTS_DIR = STORAGE_DIR / "products"
        PAYMENT_PROOFS_DIR = STORAGE_DIR / "payment_proofs"
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
        PAYMENT_PROOFS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info("✓ Storage directories created")
        
        logger.info("[4/7] Setting up database indexes...")
        await ensure_indexes()
        logger.info("✓ Indexes created/verified")
        
        logger.info("[5/7] Seeding database (if needed)...")
        await seed_database()
        logger.info("✓ Database seed complete")
        
        logger.info("[6/7] Registering routers...")
        logger.info("  - auth router")
        logger.info("  - products router")
        logger.info("  - testimonials router")
        logger.info("  - contact router")
        logger.info("  - checkout router")
        logger.info("  - orders router")
        logger.info("  - user router")
        logger.info("  - admin router")
        logger.info("  - downloads router")
        logger.info("  - licenses router")
        logger.info("  - payments router")
        logger.info("✓ All routers registered")
        
        logger.info("[7/7] Configuring CORS and middleware...")
        logger.info("✓ Middleware configured")
        
        startup_duration = (datetime.now() - start_time).total_seconds()
        logger.info("=" * 60)
        logger.info(f"✅ SpikeBulls backend started successfully in {startup_duration:.2f}s")
        logger.info("=" * 60)
        
    except Exception as exc:
        logger.error("=" * 60)
        logger.error("❌ STARTUP FAILED")
        logger.error("=" * 60)
        logger.exception("Full traceback:")
        logger.error("=" * 60)
        raise
    
    yield
    
    logger.info("=" * 60)
    logger.info("Shutting down SpikeBulls backend...")
    await close_db()
    logger.info("✓ Database connection closed")
    logger.info("✅ Shutdown complete")
    logger.info("=" * 60)


app = FastAPI(title=f"{settings.APP_NAME} API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - MUST BE FIRST BEFORE ROUTERS
allow_origins = settings.CORS_ORIGINS
logger.info(f"CORS origins configured: {allow_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "ok",
        "stripe_enabled": settings.ENABLE_STRIPE,
        "email_provider": settings.EMAIL_PROVIDER,
        "payment_method": settings.PAYMENT_METHOD,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Mount routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(testimonials_router, prefix="/api")
app.include_router(contact_router, prefix="/api")
app.include_router(checkout_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(downloads_router, prefix="/api")
app.include_router(licenses_router, prefix="/api")
app.include_router(payments_router, prefix="/api")

# Mount static files for payment proofs
from fastapi.staticfiles import StaticFiles
app.mount("/storage/payment_proofs", StaticFiles(directory="storage/payment_proofs"), name="payment_proofs")

