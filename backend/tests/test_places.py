from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.core.errors import ProviderException
from app.integrations.geoapify import GeoapifyClient
from app.schemas.places import Place


@pytest.mark.asyncio
async def test_places_endpoint_requires_location(async_client: AsyncClient):
    res = await async_client.get("/api/v1/places")
    assert res.status_code == 400
    assert "Coordinates" in res.json()["detail"]


@pytest.mark.asyncio
async def test_places_search_success(async_client: AsyncClient, sample_places: list[Place]):
    with patch.object(GeoapifyClient, "search_places", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = sample_places

        res = await async_client.get(
            "/api/v1/places?lat=48.8566&lng=2.3522&categories=art,nature&query=louvre"
        )
        assert res.status_code == 200
        data = res.json()
        assert data["count"] == 1
        assert data["places"][0]["name"] == "Louvre Museum"


@pytest.mark.asyncio
async def test_geoapify_client_missing_key():
    client = GeoapifyClient(api_key="")
    with pytest.raises(ProviderException) as exc:
        await client.search_places(lat=48.8566, lng=2.3522)
    assert "API key is not configured" in str(exc.value)


@pytest.mark.asyncio
async def test_geoapify_normalization():
    client = GeoapifyClient(api_key="dummy")
    mock_feature = {
        "geometry": {"coordinates": [2.3376, 48.8606]},
        "properties": {
            "name": "Musée du Louvre",
            "place_id": "geo-12345",
            "city": "Paris",
            "country": "France",
            "formatted": "Musée du Louvre, Rue de Rivoli, 75001 Paris",
            "categories": ["entertainment.culture", "heritage"],
            "rating": 4.9,
            "reviews_count": 2500,
            "opening_hours": "09:00-18:00",
        },
    }
    place = client._normalize_feature(mock_feature)
    assert place is not None
    assert place.id == "geo-12345"
    assert place.name == "Musée du Louvre"
    assert place.category == "culture"
    assert place.coordinates.lat == 48.8606
    assert place.coordinates.lng == 2.3376
    assert place.openingHours is not None
    assert place.openingHours.open == "09:00"
    assert place.openingHours.close == "18:00"
