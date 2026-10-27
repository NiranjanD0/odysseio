from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.integrations.citybikes import CityBikesClient
from app.integrations.open_meteo import OpenMeteoClient
from app.schemas.common import Coordinates
from app.schemas.context import (
    AirQualityContext,
    BikeSharingContext,
    BikeStation,
    CurrentWeather,
    WeatherContext,
)


@pytest.mark.asyncio
async def test_context_endpoint_success(async_client: AsyncClient):
    mock_weather = WeatherContext(
        current=CurrentWeather(
            temperature=21.5,
            weatherCode=1,
            windSpeed=12.0,
            isDay=True,
            description="Mainly clear",
        ),
        forecast=[],
    )
    mock_air = AirQualityContext(aqi=25, pm25=8.5, pm10=14.2, category="Fair")
    mock_bikes = BikeSharingContext(
        available=True,
        networkName="Vélib' Métropole",
        stations=[
            BikeStation(
                id="station-1",
                name="Rivoli - Pont Neuf",
                freeBikes=12,
                emptySlots=8,
                coordinates=Coordinates(lat=48.8570, lng=2.3420),
                distanceMeters=150,
            )
        ],
    )

    with (
        patch.object(OpenMeteoClient, "get_weather", new_callable=AsyncMock) as m_w,
        patch.object(OpenMeteoClient, "get_air_quality", new_callable=AsyncMock) as m_a,
        patch.object(CityBikesClient, "get_bike_context", new_callable=AsyncMock) as m_b,
    ):
        m_w.return_value = mock_weather
        m_a.return_value = mock_air
        m_b.return_value = mock_bikes

        res = await async_client.get("/api/v1/context?lat=48.8566&lng=2.3522")
        assert res.status_code == 200
        data = res.json()
        assert data["weather"]["current"]["temperature"] == 21.5
        assert data["airQuality"]["category"] == "Fair"
        assert data["bikeSharing"]["available"] is True
        assert len(data["bikeSharing"]["stations"]) == 1
