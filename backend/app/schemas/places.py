from pydantic import BaseModel, Field

from app.schemas.common import Category, Coordinates, OpeningHours


class Place(BaseModel):
    id: str
    name: str
    city: str = ""
    country: str = ""
    description: str = ""
    category: Category = "culture"
    tags: list[str] = Field(default_factory=list)
    coordinates: Coordinates
    imageUrl: str = ""
    rating: float = 0.0
    reviewCount: int = 0
    estimatedVisitMinutes: int = 30
    openingHours: OpeningHours | None = None
    address: str = ""
    isSaved: bool | None = False


class PlaceSearchQuery(BaseModel):
    query: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    categories: list[Category] | None = None
    radius: int = Field(default=5000, ge=100, le=50000)


class PlacesResponse(BaseModel):
    places: list[Place]
    count: int
    source: str = "geoapify"
