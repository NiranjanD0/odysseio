import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, Query

from app.integrations.citybikes import CityBikesClient
from app.integrations.open_meteo import OpenMeteoClient
from app.schemas.common import Coordinates
from app.schemas.context import ContextResponse

router = APIRouter(prefix="/context", tags=["Context"])


@router.get("", response_model=ContextResponse)
async def get_environmental_context(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
):
    weather_client = OpenMeteoClient()
    citybikes_client = CityBikesClient()

    weather_task = weather_client.get_weather(lat, lng)
    air_quality_task = weather_client.get_air_quality(lat, lng)
    bike_task = citybikes_client.get_bike_context(lat, lng)

    weather, air_quality, bike_sharing = await asyncio.gather(
        weather_task, air_quality_task, bike_task, return_exceptions=True
    )

    return ContextResponse(
        coordinates=Coordinates(lat=lat, lng=lng),
        weather=weather if not isinstance(weather, Exception) else None,
        airQuality=air_quality if not isinstance(air_quality, Exception) else None,
        bikeSharing=bike_sharing if not isinstance(bike_sharing, Exception) else None,
        timestamp=datetime.now(UTC).isoformat(),
    )
