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
            distance_meters=800,
            duration_minutes=10,
            mode=transport,
            provider="mock",
        )


@pytest.mark.asyncio
async def test_replanning_flow(async_client: AsyncClient, sample_places: list[Place]):
    # 1. Create initial itinerary
    payload = {
        "destination": "Paris",
        "startLocation": "Center",
        "startCoordinates": {"lat": 48.8566, "lng": 2.3522},
        "startTime": "09:00",
        "returnTime": "14:00",
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
        patch("app.services.replan_service.get_routing_client", return_value=MockRoutingClient()),
    ):
        mock_places.return_value = sample_places
        create_res = await async_client.post("/api/v1/itineraries", json=payload)
        assert create_res.status_code == 201
        itin = create_res.json()
        itin_id = itin["id"]
        stops = itin["stops"]
        assert len(stops) >= 2

        first_stop_id = stops[0]["id"]
        second_stop_id = stops[1]["id"]

        # 2. Replan: mark first completed, skip second, reduce time
        replan_payload = {
            "completedStopIds": [first_stop_id],
            "skippedStopIds": [second_stop_id],
            "remainingMinutes": 60,
        }

        replan_res = await async_client.post(
            f"/api/v1/itineraries/{itin_id}/replan", json=replan_payload
        )
        assert replan_res.status_code == 200
        updated = replan_res.json()

        # Check that completed stop status is preserved
        updated_first = next(s for s in updated["stops"] if s["id"] == first_stop_id)
        assert updated_first["status"] == "completed"

        # Check that skipped stop status is preserved
        updated_second = next(s for s in updated["stops"] if s["id"] == second_stop_id)
        assert updated_second["status"] == "skipped"


@pytest.mark.asyncio
async def test_replan_critically_low_time(async_client: AsyncClient, sample_places: list[Place]):
    payload = {
        "destination": "Paris",
        "startLocation": "Center",
        "startCoordinates": {"lat": 48.8566, "lng": 2.3522},
        "startTime": "09:00",
        "returnTime": "12:00",
        "safetyBufferMinutes": 15,
        "interests": ["art", "nature"],
        "pace": "balanced",
        "transport": "walking",
    }
    with (
        patch.object(GeoapifyClient, "search_places", new_callable=AsyncMock) as mock_places,
        patch(
            "app.services.itinerary_service.get_routing_client", return_value=MockRoutingClient()
        ),
        patch("app.services.replan_service.get_routing_client", return_value=MockRoutingClient()),
    ):
        mock_places.return_value = sample_places
        create_res = await async_client.post("/api/v1/itineraries", json=payload)
        itin_id = create_res.json()["id"]

        # Replan with only 10 minutes remaining
        replan_res = await async_client.post(
            f"/api/v1/itineraries/{itin_id}/replan",
            json={"remainingMinutes": 10},
        )
        assert replan_res.status_code == 200
        updated = replan_res.json()
        assert any("Critically low remaining time" in w for w in updated["warnings"])
        for s in updated["stops"]:
            assert s["status"] in ("completed", "skipped")
