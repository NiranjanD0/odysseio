from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.integrations.geoapify import GeoapifyClient
from app.integrations.routing import RouteResult, RoutingClientBase
from app.schemas.common import Coordinates
from app.schemas.places import Place


class MockRoutingClient(RoutingClientBase):
    async def calculate_route(
        self, origin: Coordinates, destination: Coordinates, transport: str = "walking"
    ) -> RouteResult:
        return RouteResult(
            distance_meters=1000,
            duration_minutes=15,
            mode=transport,
            provider="mock",
        )


@pytest.mark.asyncio
async def test_create_itinerary_success(async_client: AsyncClient, sample_places: list[Place]):
    payload = {
        "destination": "Paris",
        "startLocation": "Hotel de Ville",
        "startCoordinates": {"lat": 48.8566, "lng": 2.3522},
        "startTime": "09:00",
        "returnTime": "13:00",
        "safetyBufferMinutes": 15,
        "interests": ["art", "nature", "cafe"],
        "pace": "balanced",
        "transport": "walking",
    }

    with (
        patch.object(GeoapifyClient, "search_places", new_callable=AsyncMock) as mock_places,
        patch(
            "app.services.itinerary_service.get_routing_client", return_value=MockRoutingClient()
        ),
    ):
        mock_places.return_value = sample_places

        res = await async_client.post("/api/v1/itineraries", json=payload)
        assert res.status_code == 201
        data = res.json()

        assert data["city"] == "Paris"
        assert len(data["stops"]) > 0
        assert data["safetyBufferMinutes"] == 15

        # Check chronology
        for i in range(len(data["stops"]) - 1):
            assert data["stops"][i]["departureTime"] <= data["stops"][i + 1]["arrivalTime"]

        # Check that final return leg fits before deadline
        final_stop = data["stops"][-1]
        dep_h, dep_m = map(int, final_stop["departureTime"].split(":"))
        dep_mins = dep_h * 60 + dep_m
        return_deadline_mins = 13 * 60
        # Departure + return leg + buffer must be <= deadline
        assert (
            dep_mins + data["returnLegMinutes"] + data["safetyBufferMinutes"]
            <= return_deadline_mins
        )


@pytest.mark.asyncio
async def test_insufficient_time_window_fails(async_client: AsyncClient):
    payload = {
        "destination": "Paris",
        "startLocation": "Hotel de Ville",
        "startCoordinates": {"lat": 48.8566, "lng": 2.3522},
        "startTime": "09:00",
        "returnTime": "09:20",
        "safetyBufferMinutes": 15,  # Leaves only 5 minutes
        "interests": ["art"],
        "pace": "balanced",
        "transport": "walking",
    }
    res = await async_client.post("/api/v1/itineraries", json=payload)
    assert res.status_code == 422
    assert "Insufficient time window" in res.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_empty_candidates_fails(async_client: AsyncClient):
    payload = {
        "destination": "Paris",
        "startLocation": "Hotel de Ville",
        "startCoordinates": {"lat": 48.8566, "lng": 2.3522},
        "startTime": "09:00",
        "returnTime": "12:00",
        "safetyBufferMinutes": 15,
        "interests": ["art"],
        "pace": "balanced",
        "transport": "walking",
    }
    with patch.object(GeoapifyClient, "search_places", new_callable=AsyncMock) as mock_places:
        mock_places.return_value = []
        res = await async_client.post("/api/v1/itineraries", json=payload)
        assert res.status_code == 422
        assert "No places could be discovered" in res.json()["detail"]["message"]
