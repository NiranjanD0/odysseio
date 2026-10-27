"""Geoapify Geocoding/Reverse-geocoding client.

Forward geocoding: address/place name → coordinates
Reverse geocoding: coordinates → address
"""
from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import ProviderException
from app.schemas.common import Coordinates


class GeocodeResult:
    def __init__(
        self,
        coordinates: Coordinates,
        formatted: str,
        city: str,
        country: str,
        place_id: str,
        confidence: float,
    ):
        self.coordinates = coordinates
        self.formatted = formatted
        self.city = city
        self.country = country
        self.place_id = place_id
        self.confidence = confidence


class GeocodingClient:
    BASE_URL = "https://api.geoapify.com/v1/geocode"

    def __init__(self, api_key: str | None = None, timeout: float = 8.0):
        self.api_key = api_key if api_key is not None else settings.GEOAPIFY_API_KEY
        self.timeout = timeout

    def _parse_feature(self, feat: dict[str, Any]) -> GeocodeResult | None:
        props = feat.get("properties", {})
        geometry = feat.get("geometry", {})
        coords = geometry.get("coordinates", [])
        if len(coords) < 2:
            return None
        lng, lat = coords[0], coords[1]
        return GeocodeResult(
            coordinates=Coordinates(lat=lat, lng=lng),
            formatted=props.get("formatted", ""),
            city=props.get("city") or props.get("county") or "",
            country=props.get("country") or "",
            place_id=props.get("place_id", f"geo-{lat:.5f}-{lng:.5f}"),
            confidence=props.get("rank", {}).get("confidence", 0.0)
            if isinstance(props.get("rank"), dict)
            else 0.0,
        )

    async def forward(self, query: str, limit: int = 5) -> list[GeocodeResult]:
        """Geocode a text query to coordinates."""
        if not self.api_key:
            raise ProviderException(
                "Geoapify API key not configured. Set GEOAPIFY_API_KEY in .env."
            )
        params = {
            "text": query,
            "limit": min(limit, 10),
            "format": "geojson",
            "apiKey": self.api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.BASE_URL}/search", params=params)
            if resp.status_code == 401:
                raise ProviderException("Invalid Geoapify API key (HTTP 401).")
            if resp.status_code != 200:
                raise ProviderException(f"Geocoding API error HTTP {resp.status_code}.")
            features = resp.json().get("features", [])
            results = [r for feat in features if (r := self._parse_feature(feat))]
            return results
        except httpx.TimeoutException as e:
            raise ProviderException(f"Geocoding timed out after {self.timeout}s.") from e
        except httpx.RequestError as e:
            raise ProviderException(f"Geocoding network error: {e}") from e

    async def reverse(self, lat: float, lng: float) -> GeocodeResult | None:
        """Reverse geocode coordinates to an address."""
        if not self.api_key:
            raise ProviderException("Geoapify API key not configured.")
        params = {
            "lat": lat,
            "lon": lng,
            "format": "geojson",
            "apiKey": self.api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.BASE_URL}/reverse", params=params)
            if resp.status_code != 200:
                raise ProviderException(f"Reverse geocoding error HTTP {resp.status_code}.")
            features = resp.json().get("features", [])
            if not features:
                return None
            return self._parse_feature(features[0])
        except httpx.TimeoutException as e:
            raise ProviderException("Reverse geocoding timed out.") from e
        except httpx.RequestError as e:
            raise ProviderException(f"Reverse geocoding network error: {e}") from e
