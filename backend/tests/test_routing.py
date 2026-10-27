from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.core.errors import RoutingException
from app.integrations.routing import (
    GeoapifyRoutingClient,
    OSRMRoutingClient,
)
from app.schemas.common import Coordinates


@pytest.mark.asyncio
async def test_geoapify_routing_success():
    client = GeoapifyRoutingClient(api_key="valid-key")
    origin = Coordinates(lat=48.8566, lng=2.3522)
    dest = Coordinates(lat=48.8606, lng=2.3376)

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "features": [
                {
                    "properties": {
                        "summary": {
                            "distance": 1250,
                            "duration": 900.0,  # 15 minutes
                        }
                    }
                }
            ]
        },
        request=httpx.Request("GET", "https://api.geoapify.com"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        route = await client.calculate_route(origin, dest, transport="walking")
        assert route.distance_meters == 1250
        assert route.duration_minutes == 15
        assert route.mode == "walk"
        assert route.provider == "geoapify"


@pytest.mark.asyncio
async def test_geoapify_routing_unconfigured_key():
    client = GeoapifyRoutingClient(api_key="")
    origin = Coordinates(lat=48.8566, lng=2.3522)
    dest = Coordinates(lat=48.8606, lng=2.3376)
    with pytest.raises(RoutingException) as exc:
        await client.calculate_route(origin, dest)
    assert "key not configured" in str(exc.value)


@pytest.mark.asyncio
async def test_osrm_routing_success():
    client = OSRMRoutingClient()
    origin = Coordinates(lat=48.8566, lng=2.3522)
    dest = Coordinates(lat=48.8606, lng=2.3376)

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "routes": [
                {
                    "distance": 1400.0,
                    "duration": 960.0,  # 16 minutes
                }
            ]
        },
        request=httpx.Request("GET", "https://router.project-osrm.org"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        route = await client.calculate_route(origin, dest, transport="cycling")
        assert route.distance_meters == 1400
        assert route.duration_minutes == 16
        assert route.mode == "bike"
        assert route.provider == "osrm"


@pytest.mark.asyncio
async def test_routing_failure_never_silent():
    client = OSRMRoutingClient()
    origin = Coordinates(lat=48.8566, lng=2.3522)
    dest = Coordinates(lat=48.8606, lng=2.3376)

    mock_resp = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("GET", "https://router.project-osrm.org"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        with pytest.raises(RoutingException):
            await client.calculate_route(origin, dest)
