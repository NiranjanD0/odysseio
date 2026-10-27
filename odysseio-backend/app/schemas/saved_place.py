from pydantic import BaseModel

from app.schemas.places import Place


class SavedPlaceToggleRequest(BaseModel):
    place: Place
    notes: str | None = ""


class SavedPlaceResponse(BaseModel):
    isSaved: bool
    placeId: str
    message: str


class SavedPlacesListResponse(BaseModel):
    places: list[Place]
    count: int
