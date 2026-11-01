import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import get_session_factory, init_db
from app.core.errors import OdysseioException
from app.core.logging import logger
from app.integrations.telegram import TelegramClient
from app.schemas.common import HealthResponse
from app.services.telegram_service import TelegramService


async def run_telegram_polling():
    """Background polling worker for local development and direct bot interactions."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return

    client = TelegramClient()
    bot_info = await client.get_me()
    if bot_info and bot_info.get("username"):
        settings.TELEGRAM_BOT_USERNAME = bot_info["username"]
        logger.info(f"Telegram bot initialized: @{settings.TELEGRAM_BOT_USERNAME}")

    # Clear any active webhook before starting polling
    await client.delete_webhook(drop_pending_updates=False)

    factory = get_session_factory()
    offset = None
    logger.info("Telegram background polling started.")

    while True:
        try:
            updates = await client.get_updates(offset=offset, timeout=10)
            for upd in updates:
                uid = upd.get("update_id")
                if uid is not None:
                    offset = uid + 1
                try:
                    async with factory() as session:
                        service = TelegramService(session, telegram_client=client)
                        await service.handle_update(upd)
                except Exception as ex:
                    logger.warning(f"Error handling Telegram update: {ex}")
        except asyncio.CancelledError:
            logger.info("Telegram background polling stopped.")
            break
        except Exception as e:
            logger.warning(f"Telegram polling loop exception: {e}")
            await asyncio.sleep(3)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]")
    await init_db()

    polling_task = None
    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_MODE == "polling":
        polling_task = asyncio.create_task(run_telegram_polling())

    yield

    if polling_task:
        polling_task.cancel()
        try:
            await polling_task
        except asyncio.CancelledError:
            pass

    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Intelligent, time-aware city exploration API. "
        "Discovers real points of interest, estimates realistic travel times, "
        "and guarantees return deadlines."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OdysseioException)
async def odysseio_exception_handler(request: Request, exc: OdysseioException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": exc.__class__.__name__, "message": exc.message, "details": exc.details},
    )


# Top-level health endpoint matching requirement
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def root_health():
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database="connected",
        timestamp=datetime.now(UTC).isoformat(),
    )


# Mount versioned API router
app.include_router(api_router)
