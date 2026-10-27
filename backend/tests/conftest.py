from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models.base import Base
from app.schemas.common import Coordinates
from app.schemas.places import Place

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestSessionFactory = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionFactory() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_places() -> list[Place]:
    return [
        Place(
            id="place-1",
            name="Louvre Museum",
            city="Paris",
            category="art",
            coordinates=Coordinates(lat=48.8606, lng=2.3376),
            estimatedVisitMinutes=60,
            rating=4.8,
            reviewCount=1500,
            address="Rue de Rivoli, 75001 Paris",
        ),
        Place(
            id="place-2",
            name="Palais-Royal Garden",
            city="Paris",
            category="nature",
            coordinates=Coordinates(lat=48.8648, lng=2.3371),
            estimatedVisitMinutes=30,
            rating=4.6,
            reviewCount=800,
            address="8 Rue de Montpensier, 75001 Paris",
        ),
        Place(
            id="place-3",
            name="Cafe Kitsune",
            city="Paris",
            category="cafe",
            coordinates=Coordinates(lat=48.8652, lng=2.3380),
            estimatedVisitMinutes=25,
            rating=4.4,
            reviewCount=400,
            address="51 Galerie de Montpensier, 75001 Paris",
        ),
        Place(
            id="place-4",
            name="Sainte-Chapelle",
            city="Paris",
            category="history",
            coordinates=Coordinates(lat=48.8554, lng=2.3450),
            estimatedVisitMinutes=45,
            rating=4.7,
            reviewCount=1100,
            address="10 Boulevard du Palais, 75001 Paris",
        ),
    ]
