import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(async_client: AsyncClient):
    # Test top-level /health
    res1 = await async_client.get("/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "healthy"
    assert "version" in data1
    assert "timestamp" in data1

    # Test versioned /api/v1/health
    res2 = await async_client.get("/api/v1/health")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "healthy"
    assert data2["database"] == "connected"
