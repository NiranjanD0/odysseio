# ODYSSEIO Backend

**ODYSSEIO** is an intelligent, time-aware city exploration API built with Python 3.12, FastAPI, SQLAlchemy 2.0 Async, Pydantic v2, and Alembic.

It discovers real points of interest, calculates real route distances and travel times, and designs feasible itineraries that strictly guarantee you will never miss your return deadline.

---

## Features

- **Real Places Discovery:** Integrated with Geoapify Places API to find verified attractions, cafes, cultural sites, and parks.
- **Real Routing Provider:** Integrated with Geoapify Routing and OSRM turn-by-turn road networks across walking, cycling, and public transit modes. Never fabricates zero-duration travel times.
- **Strict Feasibility & Deadline Engine:** Accounts for start-to-first-stop travel, stop visit durations, inter-stop travel, and the crucial final return leg back to your return destination plus a safety buffer.
- **Adaptive Replanning:** Allows skipping stops, completing stops, shortening remaining time, or changing interests mid-journey while preserving history and re-enforcing return deadlines.
- **Environmental Context:** Live Open-Meteo weather forecasts, WMO weather descriptions, European Air Quality Index (AQI), and CityBikes bike-sharing stations.
- **Optional Notifications:** Telegram Bot integration for adventure summaries and alerts.
- **Persistence:** Async SQLAlchemy 2.0 models for Journeys, Itinerary Stops, and Saved Places with Alembic migrations and PostgreSQL/SQLite fallback support.
- **Full Next.js Compatibility:** Seamless data schemas adhering to `API_CONTRACT.md`.

---

## Directory Structure

```
odysseio-backend/
├── app/
│   ├── main.py                  # FastAPI entry point, lifespan, CORS & exception handlers
│   ├── api/
│   │   └── v1/
│   │       ├── router.py        # Aggregated /api/v1 router
│   │       └── endpoints/
│   │           ├── health.py    # /health and /api/v1/health
│   │           ├── places.py    # /api/v1/places (Geoapify discovery)
│   │           ├── context.py   # /api/v1/context (Weather, AQI, CityBikes)
│   │           ├── itineraries.py # /api/v1/itineraries (create, get, replan)
│   │           ├── journeys.py  # /api/v1/journeys (list, delete)
│   │           ├── saved_places.py # /api/v1/saved-places (CRUD)
│   │           └── notifications.py # /api/v1/notifications/telegram
│   ├── core/
│   │   ├── config.py            # Pydantic-settings configuration
│   │   ├── database.py          # Async SQLAlchemy engine & session factory
│   │   ├── errors.py            # Custom exceptions & HTTP error helpers
│   │   └── logging.py           # Safe structured logger
│   ├── integrations/
│   │   ├── geoapify.py          # Geoapify Places client
│   │   ├── routing.py           # Geoapify & OSRM Routing clients
│   │   ├── open_meteo.py        # Weather & Air Quality client
│   │   ├── citybikes.py         # Bike sharing stations client
│   │   └── telegram.py          # Telegram Bot client
│   ├── models/
│   │   ├── base.py              # DeclarativeBase & TimestampMixin
│   │   ├── journey.py           # JourneyModel
│   │   ├── stop.py              # ItineraryStopModel
│   │   └── saved_place.py       # SavedPlaceModel
│   ├── repositories/
│   │   ├── journey_repo.py      # Journey persistence & queries
│   │   └── saved_place_repo.py  # SavedPlace persistence & queries
│   ├── schemas/
│   │   ├── common.py            # Coordinates, Category, Pace, Transport
│   │   ├── places.py            # Place, PlacesResponse
│   │   ├── context.py           # Weather, AQI, BikeSharing schemas
│   │   ├── itinerary.py         # Itinerary, ItineraryStop schemas
│   │   ├── replan.py            # ReplanRequest schema
│   │   ├── saved_place.py       # SavedPlace schemas
│   │   └── notifications.py     # Telegram notification schemas
│   └── services/
│       ├── scoring_service.py   # Place relevance & category diversity
│       ├── scheduler_service.py # Greedy deadline-aware scheduler
│       ├── itinerary_service.py # Core orchestration service
│       └── replan_service.py    # Dynamic replanning service
├── tests/
│   ├── conftest.py              # In-memory DB fixtures & ASGI client
│   ├── test_health.py
│   ├── test_places.py
│   ├── test_routing.py
│   ├── test_itinerary.py
│   ├── test_replanning.py
│   ├── test_database.py
│   ├── test_context.py
│   └── test_telegram.py
├── alembic/
│   ├── env.py                   # Async Alembic environment
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
├── alembic.ini
├── pyproject.toml
├── compose.yaml                 # Docker Compose for local PostgreSQL
├── .env.example
├── .gitignore
├── API_CONTRACT.md
└── README.md
```

---

## Setup & Running

### 1. Requirements
- Python 3.12+
- `uv` (recommended) or `pip`

### 2. Install Dependencies
```bash
cd odysseio-backend

# Create virtual environment
uv venv
source .venv/bin/activate

# Install dependencies in editable mode
uv pip install -e ".[dev]"
```

### 3. Environment Configuration
```bash
cp .env.example .env
```
Key configuration settings:
- `DATABASE_URL`: Defaults to `sqlite+aiosqlite:///./odysseio.db` for zero-setup local dev. When using PostgreSQL with Docker Compose, set to `postgresql+asyncpg://postgres:postgres@localhost:5432/odysseio`.
- `GEOAPIFY_API_KEY`: (Optional) Free API key from [geoapify.com](https://www.geoapify.com/) for live worldwide places and routing.
- `TELEGRAM_BOT_TOKEN`: (Optional) Bot token from [@BotFather](https://t.me/botfather).

### 4. Optional: Run PostgreSQL with Docker Compose
If Docker is installed on your machine:
```bash
docker compose up -d
```

### 5. Run Database Migrations
```bash
alembic upgrade head
```

### 6. Start the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The interactive OpenAPI documentation will be available at:
**[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## Testing & Quality Assurance

Run the test suite with coverage:
```bash
pytest -v
```

Run linting and formatting with Ruff:
```bash
ruff check .
ruff format .
```
