from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import ProviderException
from app.integrations.geoapify import GeoapifyClient
from app.repositories.saved_place_repo import SavedPlaceRepository
from app.schemas.common import Category, Coordinates
from app.schemas.places import Place, PlacesResponse

router = APIRouter(prefix="/places", tags=["Places"])

CITY_COORDINATES: dict[str, Coordinates] = {
    "paris": Coordinates(lat=48.8566, lng=2.3522),
    "tokyo": Coordinates(lat=35.6762, lng=139.6503),
    "rome": Coordinates(lat=41.9028, lng=12.4964),
    "new york": Coordinates(lat=40.7128, lng=-74.0060),
    "london": Coordinates(lat=51.5074, lng=-0.1278),
    "barcelona": Coordinates(lat=41.3851, lng=2.1734),
    "berlin": Coordinates(lat=52.5200, lng=13.4050),
    "kyoto": Coordinates(lat=35.0116, lng=135.7681),
    "amsterdam": Coordinates(lat=52.3676, lng=4.9041),
    "florence": Coordinates(lat=43.7696, lng=11.2558),
    "mumbai": Coordinates(lat=19.0760, lng=72.8777),
    "delhi": Coordinates(lat=28.6139, lng=77.2090),
    "new delhi": Coordinates(lat=28.6139, lng=77.2090),
    "bengaluru": Coordinates(lat=12.9716, lng=77.5946),
    "bangalore": Coordinates(lat=12.9716, lng=77.5946),
    "jaipur": Coordinates(lat=26.9124, lng=75.7873),
    "ahmedabad": Coordinates(lat=23.0225, lng=72.5714),
    "hyderabad": Coordinates(lat=17.3850, lng=78.4867),
    "kolkata": Coordinates(lat=22.5726, lng=88.3639),
    "chennai": Coordinates(lat=13.0827, lng=80.2707),
}


@router.get("", response_model=PlacesResponse)
async def search_places(
    query: str | None = Query(None, description="Search term for place name or tag"),
    city: str | None = Query(None, description="City name"),
    categories: str | None = Query(None, description="Comma-separated category filters"),
    lat: float | None = Query(None, ge=-90.0, le=90.0, description="Latitude"),
    lng: float | None = Query(None, ge=-180.0, le=180.0, description="Longitude"),
    radius: int = Query(5000, ge=100, le=50000, description="Search radius in meters"),
    db: AsyncSession = Depends(get_db),
):
    target_coord: Coordinates | None = None
    if lat is not None and lng is not None:
        target_coord = Coordinates(lat=lat, lng=lng)
    elif city:
        target_coord = CITY_COORDINATES.get(city.strip().lower())
        if not target_coord:
            try:
                from app.integrations.geocoding import GeocodingClient
                geo_client = GeocodingClient()
                geo_results = await geo_client.forward(city.strip(), limit=1)
                if geo_results:
                    target_coord = geo_results[0].coordinates
            except Exception:
                pass

    if not target_coord:
        raise HTTPException(
            status_code=400,
            detail="Coordinates (lat and lng) or a recognized city must be provided.",
        )

    parsed_categories: list[Category] | None = None
    if categories:
        cats = [c.strip() for c in categories.split(",") if c.strip()]
        parsed_categories = [c for c in cats if c]  # type: ignore

    client = GeoapifyClient()
    saved_repo = SavedPlaceRepository(db)

    try:
        places = await client.search_places(
            lat=target_coord.lat,
            lng=target_coord.lng,
            radius_meters=radius,
            categories=parsed_categories,
        )
    except ProviderException as e:
        # Fall back to saved places if Geoapify is unconfigured or unavailable
        saved = await saved_repo.list_saved()
        if saved:
            places = saved
        else:
            raise HTTPException(status_code=502, detail=str(e))

    # Apply text filter if query is present
    if query:
        q = query.lower()
        places = [
            p
            for p in places
            if q in p.name.lower()
            or q in p.description.lower()
            or any(q in t.lower() for t in p.tags)
        ]

    # Check isSaved status against database
    for p in places:
        p.isSaved = await saved_repo.is_saved(p.id)

    return PlacesResponse(places=places, count=len(places), source="geoapify")


@router.get("/{id}", response_model=Place)
async def get_place_by_id(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    saved_repo = SavedPlaceRepository(db)
    saved_places = await saved_repo.list_saved()
    for sp in saved_places:
        if sp.id == id:
            sp.isSaved = True
            return sp

    raise HTTPException(status_code=404, detail=f"Place '{id}' not found.")
