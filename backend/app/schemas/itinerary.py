from pydantic import BaseModel, Field, field_validator

from app.schemas.common import Category, Coordinates, JourneyStatus, Pace, StopStatus, Transport
from app.schemas.places import Place


class ItineraryStop(BaseModel):
    id: str
    place: Place
    arrivalTime: str  # HH:MM
    departureTime: str  # HH:MM
    travelTimeFromPrev: int  # minutes
    travelDistanceFromPrev: int = 0  # meters
    status: StopStatus = "upcoming"
    notes: str | None = ""


class ItineraryCreateRequest(BaseModel):
    destination: str = Field(..., min_length=1, description="City or destination area")
    startLocation: str = Field(..., min_length=1, description="Starting address or landmark")
    startCoordinates: Coordinates
    returnLocation: str | None = None
    returnCoordinates: Coordinates | None = None
    startTime: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM format")
    returnTime: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM format")
    safetyBufferMinutes: int = Field(default=15, ge=0, le=120)
    interests: list[Category] = Field(..., min_length=1)
    pace: Pace = "balanced"
    transport: Transport = "walking"
    selectedPlaceIds: list[str] | None = Field(
        default=None, description="Optional user-selected place IDs (up to 3)"
    )
    customVisitDurations: dict[str, int] | None = Field(
        default=None, description="Optional custom visit duration in minutes per place ID"
    )
    ownerId: str = Field(default="anonymous", description="Owner or session reference")

    @field_validator("returnCoordinates", mode="after")
    @classmethod
    def default_return_coords(cls, v: Coordinates | None, info) -> Coordinates | None:
        return v


class Itinerary(BaseModel):
    id: str
    title: str
    city: str
    date: str  # YYYY-MM-DD
    startTime: str  # HH:MM
    returnDeadline: str  # HH:MM
    safetyBufferMinutes: int
    stops: list[ItineraryStop]
    pace: Pace
    transport: Transport
    totalMinutes: int
    explorationMinutes: int
    travelMinutes: int
    returnLegMinutes: int = 0
    feasible: bool = True
    availableMinutes: int = 0
    requiredMinutes: int = 0
    spareMinutes: int = 0
    feasibilityStatus: str = "FEASIBLE"
    routeGeometry: list[Coordinates] = Field(default_factory=list)
    ownerId: str = "anonymous"
    interests: list[Category]
    status: JourneyStatus = "upcoming"
    createdAt: str
    centerCoordinates: Coordinates
    warnings: list[str] = Field(default_factory=list)


class ItineraryListResponse(BaseModel):
    itineraries: list[Itinerary]
    total: int
