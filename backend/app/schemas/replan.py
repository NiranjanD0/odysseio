from pydantic import BaseModel, Field

from app.schemas.common import Category, Coordinates, Pace, Transport


class ReplanRequest(BaseModel):
    currentStopId: str | None = None
    completedStopIds: list[str] = Field(default_factory=list)
    skippedStopIds: list[str] = Field(default_factory=list)
    remainingMinutes: int | None = Field(default=None, ge=5)
    currentCoordinates: Coordinates | None = None
    updatedInterests: list[Category] | None = None
    updatedPace: Pace | None = None
    updatedTransport: Transport | None = None
    updatedReturnTime: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
