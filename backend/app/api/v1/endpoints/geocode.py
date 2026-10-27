"""Geocoding endpoint — converts address/place-name to coordinates and vice versa.

Used by the frontend address-picker so it never needs to hardcode city coords.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.errors import ProviderException
from app.integrations.geocoding import GeocodingClient
from app.schemas.common import Coordinates

router = APIRouter(prefix="/geocode", tags=["Geocode"])


class GeocodeResult(BaseModel):
    placeId: str
    formatted: str
    city: str
    country: str
    coordinates: Coordinates
    confidence: float


class GeocodeResponse(BaseModel):
    results: list[GeocodeResult]
    query: str


class ReverseGeocodeResponse(BaseModel):
    placeId: str
    formatted: str
    city: str
    country: str
    coordinates: Coordinates


@router.get("", response_model=GeocodeResponse, summary="Forward geocode an address")
async def geocode(
    q: str = Query(..., min_length=2, description="Address or place name to geocode"),
    limit: int = Query(5, ge=1, le=10, description="Max results"),
):
    """Convert a free-text address or place name into coordinates."""
    client = GeocodingClient()
    try:
        raw = await client.forward(q, limit=limit)
    except ProviderException as e:
        raise HTTPException(status_code=502, detail=str(e))

    results = [
        GeocodeResult(
            placeId=r.place_id,
            formatted=r.formatted,
            city=r.city,
            country=r.country,
            coordinates=r.coordinates,
            confidence=r.confidence,
        )
        for r in raw
    ]
    return GeocodeResponse(results=results, query=q)


@router.get("/reverse", response_model=ReverseGeocodeResponse, summary="Reverse geocode coordinates")
async def reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
):
    """Convert coordinates into a human-readable address."""
    client = GeocodingClient()
    try:
        result = await client.reverse(lat, lng)
    except ProviderException as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not result:
        raise HTTPException(status_code=404, detail="No address found for these coordinates.")

    return ReverseGeocodeResponse(
        placeId=result.place_id,
        formatted=result.formatted,
        city=result.city,
        country=result.country,
        coordinates=result.coordinates,
    )
