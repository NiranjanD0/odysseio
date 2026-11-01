"""OpenRouteService Directions API client.

Implements real walking, cycling, and driving directions with turn-by-turn geometry.
"""
from dataclasses import dataclass, field

import httpx

from app.core.config import settings
from app.core.errors import RoutingException
from app.schemas.common import Coordinates, Transport


@dataclass
class RouteResult:
    distance_meters: int
    duration_minutes: int
    mode: str
    provider: str
    geometry: list[Coordinates] = field(default_factory=list)


class OpenRouteServiceClient:
    """OpenRouteService Directions API client.
    Supported profiles: foot-walking, cycling-regular, driving-car.
    """

    PROFILE_MAP: dict[Transport, str] = {
        "walking": "foot-walking",
        "cycling": "cycling-regular",
        "public": "driving-car",
        "mixed": "foot-walking",
    }

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 10.0,
    ):
        self.api_key = api_key if api_key is not None else settings.OPENROUTESERVICE_API_KEY
        self.base_url = (base_url or settings.OPENROUTESERVICE_BASE_URL).rstrip("/")
        self.timeout = timeout

    async def calculate_route(
        self,
        origin: Coordinates,
        destination: Coordinates,
        transport: Transport = "walking",
    ) -> RouteResult:
        if not self.api_key:
            raise RoutingException("OpenRouteService API key not configured.")

        profile = self.PROFILE_MAP.get(transport, "foot-walking")
        url = f"{self.base_url}/v2/directions/{profile}/geojson"
        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json",
        }
        payload = {
            "coordinates": [
                [origin.lng, origin.lat],
                [destination.lng, destination.lat],
            ],
            "geometry": True,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)

            if response.status_code == 401:
                raise RoutingException("Invalid OpenRouteService API key (HTTP 401).")
            if response.status_code == 403:
                raise RoutingException("Forbidden OpenRouteService request (HTTP 403).")
            if response.status_code == 429:
                raise RoutingException("OpenRouteService rate limit exceeded (HTTP 429).")
            if response.status_code != 200:
                raise RoutingException(
                    f"OpenRouteService returned HTTP {response.status_code}: {response.text}"
                )

            data = response.json()
            features = data.get("features", [])
            if not features:
                raise RoutingException("No route found between coordinates.")

            feat = features[0]
            summary = feat.get("properties", {}).get("summary", {})
            distance_meters = int(summary.get("distance", 0))
            duration_seconds = float(summary.get("duration", 0.0))
            duration_minutes = max(1, round(duration_seconds / 60))

            raw_coords = feat.get("geometry", {}).get("coordinates", [])
            geometry: list[Coordinates] = []
            for pt in raw_coords:
                if len(pt) >= 2:
                    geometry.append(Coordinates(lat=float(pt[1]), lng=float(pt[0])))

            return RouteResult(
                distance_meters=distance_meters,
                duration_minutes=duration_minutes,
                mode=profile,
                provider="openrouteservice",
                geometry=geometry,
            )
        except httpx.TimeoutException as e:
            raise RoutingException(f"OpenRouteService timed out after {self.timeout}s.") from e
        except httpx.RequestError as e:
            raise RoutingException(f"OpenRouteService network error: {e}") from e
