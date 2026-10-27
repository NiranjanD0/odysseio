import pytest
from httpx import AsyncClient

from app.schemas.places import Place


@pytest.mark.asyncio
async def test_journeys_and_saved_places_endpoints(
    async_client: AsyncClient, sample_places: list[Place]
):
    # 1. Initially no journeys
    res1 = await async_client.get("/api/v1/journeys")
    assert res1.status_code == 200
    assert res1.json() == []

    # 2. Toggle save place
    place_to_save = sample_places[0].model_dump()
    save_res = await async_client.post(
        "/api/v1/saved-places",
        json={"place": place_to_save, "notes": "Must visit morning!"},
    )
    assert save_res.status_code == 200
    assert save_res.json()["isSaved"] is True

    # 3. List saved places
    list_res = await async_client.get("/api/v1/saved-places")
    assert list_res.status_code == 200
    places = list_res.json()
    assert len(places) == 1
    assert places[0]["id"] == sample_places[0].id
    assert places[0]["isSaved"] is True

    # 4. Toggle again to unsave
    unsave_res = await async_client.post(
        "/api/v1/saved-places",
        json={"place": place_to_save},
    )
    assert unsave_res.status_code == 200
    assert unsave_res.json()["isSaved"] is False

    # 5. List saved places again -> empty
    list_res2 = await async_client.get("/api/v1/saved-places")
    assert len(list_res2.json()) == 0
