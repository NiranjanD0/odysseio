"""Tests for geocoding, GPX export, status patch, and journey status update."""
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.integrations.geocoding import GeocodeResult
from app.schemas.common import Coordinates
from app.schemas.itinerary import Itinerary, ItineraryStop
from app.schemas.places import Place
from app.services.export_service import generate_gpx

# ── helpers ──────────────────────────────────────────────────────────────────

def _make_itinerary(stops: list[ItineraryStop] | None = None) -> Itinerary:
    return Itinerary(
        id="test-itin-001",
        title="Test Trip in Paris",
        city="Paris",
        date="2026-10-28",
        startTime="09:00",
        returnDeadline="13:00",
        safetyBufferMinutes=15,
        stops=stops or [],
        pace="balanced",
        transport="walking",
        totalMinutes=180,
        explorationMinutes=120,
        travelMinutes=60,
        returnLegMinutes=12,
        interests=["art", "cafe"],
        status="upcoming",
        createdAt="2026-10-28T00:00:00Z",
        centerCoordinates=Coordinates(lat=48.8566, lng=2.3522),
        warnings=[],
    )


def _make_stop(stop_id: str, place_id: str) -> ItineraryStop:
    place = Place(
        id=place_id,
        name="Test Place",
        city="Paris",
        category="art",
        coordinates=Coordinates(lat=48.86, lng=2.34),
        estimatedVisitMinutes=60,
        rating=4.5,
        reviewCount=100,
        address="1 Test Street, Paris",
    )
    return ItineraryStop(
        id=stop_id,
        place=place,
        arrivalTime="10:00",
        departureTime="11:00",
        travelTimeFromPrev=15,
        travelDistanceFromPrev=800,
        status="upcoming",
        notes="Test stop",
    )


# ── GPX export (no HTTP, pure unit test) ─────────────────────────────────────

class TestGpxExport:
    def test_empty_itinerary_produces_valid_gpx(self):
        itin = _make_itinerary()
        gpx = generate_gpx(itin)
        assert '<?xml version="1.0"' in gpx
        assert 'creator="ODYSSEIO"' in gpx
        assert "<metadata>" in gpx
        assert "Test Trip in Paris" in gpx

    def test_stops_appear_as_waypoints(self):
        stop = _make_stop("stop-1", "place-1")
        itin = _make_itinerary(stops=[stop])
        gpx = generate_gpx(itin)
        assert "<wpt" in gpx
        assert "Test Place" in gpx
        assert 'lat="48.86"' in gpx
        assert "<rtept" in gpx

    def test_gpx_is_valid_xml(self):
        import xml.etree.ElementTree as ET
        stop = _make_stop("stop-1", "place-1")
        itin = _make_itinerary(stops=[stop])
        gpx_str = generate_gpx(itin)
        # Should not raise
        ET.fromstring(gpx_str.split("\n", 1)[1])  # skip the <?xml?> declaration


# ── Geocode endpoint ──────────────────────────────────────────────────────────

class TestGeocodeEndpoint:
    @pytest.mark.asyncio
    async def test_forward_geocode_success(self, async_client: AsyncClient):
        mock_result = GeocodeResult(
            coordinates=Coordinates(lat=48.8566, lng=2.3522),
            formatted="Paris, France",
            city="Paris",
            country="France",
            place_id="geo-paris-001",
            confidence=0.95,
        )
        with patch(
            "app.integrations.geocoding.GeocodingClient.forward",
            new=AsyncMock(return_value=[mock_result]),
        ):
            resp = await async_client.get("/api/v1/geocode?q=Paris")
        assert resp.status_code == 200
        data = resp.json()
        assert data["query"] == "Paris"
        assert len(data["results"]) == 1
        assert data["results"][0]["city"] == "Paris"
        assert data["results"][0]["coordinates"]["lat"] == 48.8566

    @pytest.mark.asyncio
    async def test_forward_geocode_empty_query(self, async_client: AsyncClient):
        # q must be at least 2 chars
        resp = await async_client.get("/api/v1/geocode?q=A")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_forward_geocode_missing_query(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/geocode")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_reverse_geocode_success(self, async_client: AsyncClient):
        mock_result = GeocodeResult(
            coordinates=Coordinates(lat=48.8566, lng=2.3522),
            formatted="Place de l'Hôtel de Ville, Paris",
            city="Paris",
            country="France",
            place_id="geo-48.85660-2.35220",
            confidence=0.9,
        )
        with patch(
            "app.integrations.geocoding.GeocodingClient.reverse",
            new=AsyncMock(return_value=mock_result),
        ):
            resp = await async_client.get("/api/v1/geocode/reverse?lat=48.8566&lng=2.3522")
        assert resp.status_code == 200
        data = resp.json()
        assert data["city"] == "Paris"
        assert "formatted" in data

    @pytest.mark.asyncio
    async def test_reverse_geocode_not_found(self, async_client: AsyncClient):
        with patch(
            "app.integrations.geocoding.GeocodingClient.reverse",
            new=AsyncMock(return_value=None),
        ):
            resp = await async_client.get("/api/v1/geocode/reverse?lat=0.0&lng=0.0")
        assert resp.status_code == 404


# ── Status patch endpoint ─────────────────────────────────────────────────────

class TestStatusPatch:
    @pytest.mark.asyncio
    async def test_patch_status_to_in_progress(self, async_client: AsyncClient, db_session):
        from app.repositories.journey_repo import JourneyRepository

        # First persist an itinerary
        itin = _make_itinerary()
        repo = JourneyRepository(db_session)
        await repo.save_journey(itin)
        await db_session.commit()

        resp = await async_client.patch(
            f"/api/v1/itineraries/{itin.id}/status",
            json={"status": "in-progress"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "in-progress"

    @pytest.mark.asyncio
    async def test_patch_status_not_found(self, async_client: AsyncClient):
        resp = await async_client.patch(
            "/api/v1/itineraries/nonexistent-id/status",
            json={"status": "completed"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_patch_status_invalid_value(self, async_client: AsyncClient):
        resp = await async_client.patch(
            "/api/v1/itineraries/some-id/status",
            json={"status": "invalid-status"},
        )
        assert resp.status_code == 422


# ── GPX export endpoint ───────────────────────────────────────────────────────

class TestGpxExportEndpoint:
    @pytest.mark.asyncio
    async def test_export_gpx_success(self, async_client: AsyncClient, db_session):
        from app.repositories.journey_repo import JourneyRepository

        stop = _make_stop("stop-1", "place-1")
        itin = _make_itinerary(stops=[stop])
        repo = JourneyRepository(db_session)
        await repo.save_journey(itin)
        await db_session.commit()

        resp = await async_client.get(f"/api/v1/itineraries/{itin.id}/export.gpx")
        assert resp.status_code == 200
        assert "application/gpx+xml" in resp.headers["content-type"]
        assert "attachment" in resp.headers["content-disposition"]
        assert "paris" in resp.headers["content-disposition"]
        body = resp.text
        assert "<?xml" in body
        assert "ODYSSEIO" in body
        assert "Test Place" in body

    @pytest.mark.asyncio
    async def test_export_gpx_not_found(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/itineraries/ghost-id/export.gpx")
        assert resp.status_code == 404
