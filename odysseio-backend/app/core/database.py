from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.logging import logger
from app.models.base import Base

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        db_url = settings.DATABASE_URL
        # SQLite needs specific connect_args for async
        connect_args = {}
        if db_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False}

        _engine = create_async_engine(
            db_url,
            echo=False,
            future=True,
            connect_args=connect_args,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


async def init_db() -> None:
    """Initialize database tables (used on startup or fallback)."""
    engine = get_engine()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not connect to configured DB ({settings.DATABASE_URL}): {e}")
        if settings.DATABASE_SQLITE_FALLBACK and not settings.DATABASE_URL.startswith("sqlite"):
            logger.info("Falling back to local SQLite database.")
            global _engine, _session_factory
            settings.DATABASE_URL = "sqlite+aiosqlite:///./odysseio.db"
            _engine = None
            _session_factory = None
            fallback_engine = get_engine()
            async with fallback_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Local SQLite database initialized.")
        else:
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for obtaining a database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
