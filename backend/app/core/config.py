from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_NAME: str = "ODYSSEIO API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    ALLOWED_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./odysseio.db"
    DATABASE_SQLITE_FALLBACK: bool = True

    # External APIs
    GEOAPIFY_API_KEY: str = Field(default="", description="Geoapify API key for places and routing")
    ROUTING_PROVIDER: str = Field(
        default="geoapify", description="Routing provider: geoapify or osrm"
    )
    ROUTING_TIMEOUT_SECONDS: float = 10.0
    PLACES_TIMEOUT_SECONDS: float = 10.0

    # Open-Meteo & CityBikes (public APIs)
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    AIR_QUALITY_BASE_URL: str = "https://air-quality-api.open-meteo.com/v1"
    CITYBIKES_BASE_URL: str = "https://api.citybik.es/v2"

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_DEFAULT_CHAT_ID: str = ""

    # Defaults
    DEFAULT_SAFETY_BUFFER_MINUTES: int = 15
    MAX_SEARCH_RADIUS_METERS: int = 10000


settings = Settings()
