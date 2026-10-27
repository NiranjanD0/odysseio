from typing import Literal

from pydantic import BaseModel, Field

Category = Literal[
    "cafe",
    "food",
    "culture",
    "history",
    "nature",
    "architecture",
    "photography",
    "shopping",
    "hidden-gem",
    "art",
    "nightlife",
]

Pace = Literal["relaxed", "balanced", "packed"]
Transport = Literal["walking", "public", "cycling", "mixed"]
JourneyStatus = Literal["upcoming", "in-progress", "completed"]
StopStatus = Literal["upcoming", "current", "completed", "skipped"]


class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude")


class OpeningHours(BaseModel):
    open: str = Field(..., description="Opening time e.g. 09:00")
    close: str = Field(..., description="Closing time e.g. 18:00")
    days: str = Field(default="Mon-Sun", description="Days active")


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    timestamp: str
