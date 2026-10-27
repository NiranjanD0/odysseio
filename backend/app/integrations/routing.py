from dataclasses import dataclass

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


class RoutingClientBase:
    async def calculate_route(
        self,
        origin: Coordinates,
        destination: Coordinates,
        transport: Transport = "walking",
    ) -> RouteResult:
        raise NotImplementedError


class GeoapifyRoutingClient(RoutingClientBase):
    """Geoapify Routing API client.
    Supported modes: walk, bicycle, drive, transit, approximated_transit.
    """

    MODE_MAP: dict[Transport, str] = {
        "walking": "walk",
        "cycling": "bicycle",
        "public": "transit",
        "mixed": "transit",
    }

    def __init__(self, api_key: str | None = None, timeout: float = 10.0):
        self.api_key = api_key if api_key is not None else settings.GEOAPIFY_API_KEY
        self.timeout = timeout
        self.base_url = "https://api.geoapify.com/v1/routing"

    async def calculate_route(
        self,
        origin: Coordinates,
        destination: Coordinates,
        transport: Transport = "walking",
    ) -> RouteResult:
        if not self.api_key:
            raise RoutingException("Geoapify API key not configured for routing.")

        mode = self.MODE_MAP.get(transport, "walk")
        waypoints = f"{origin.lat},{origin.lng}|{destination.lat},{destination.lng}"
        params = {
            "waypoints": waypoints,
            "mode": mode,
            "apiKey": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)

            if response.status_code == 401:
                raise RoutingException("Invalid Geoapify API key (HTTP 401).")
            if response.status_code != 200:
                # If transit fails, try fall back to walk or drive
                if mode == "transit":
                    params["mode"] = "walk"
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.get(self.base_url, params=params)
                if response.status_code != 200:
                    raise RoutingException(
                        f"Geoapify Routing API returned HTTP {response.status_code}: {response.text}"
                    )

            data = response.json()
            features = data.get("features", [])
            if not features:
                raise RoutingException("No route found between coordinates.")

            summary = features[0].get("properties", {}).get("summary", {})
            distance_meters = int(summary.get("distance", 0))
            duration_seconds = float(summary.get("duration", 0.0))
            duration_minutes = max(1, round(duration_seconds / 60))

            return RouteResult(
                distance_meters=distance_meters,
                duration_minutes=duration_minutes,
                mode=mode,
                provider="geoapify",
            )
        except httpx.TimeoutException as e:
            raise RoutingException(f"Geoapify Routing timed out after {self.timeout}s.") from e
        except httpx.RequestError as e:
            raise RoutingException(f"Geoapify Routing network error: {e}") from e


class OSRMRoutingClient(RoutingClientBase):
    """OSRM Public Routing API (real turn-by-turn road network routing).
    Supported profiles: foot (walking), bike (cycling), car (driving/transit).
    """

    PROFILE_MAP: dict[Transport, str] = {
        "walking": "foot",
        "cycling": "bike",
        "public": "car",
        "mixed": "foot",
    }

    def __init__(self, base_url: str = "https://router.project-osrm.org", timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def calculate_route(
        self,
        origin: Coordinates,
        destination: Coordinates,
        transport: Transport = "walking",
    ) -> RouteResult:
        profile = self.PROFILE_MAP.get(transport, "foot")
        coords = f"{origin.lng},{origin.lat};{destination.lng},{destination.lat}"
        url = f"{self.base_url}/route/v1/{profile}/{coords}"
        params = {"overview": "false", "steps": "false"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)

            if response.status_code != 200:
                raise RoutingException(
                    f"OSRM Routing returned HTTP {response.status_code}: {response.text}"
                )

            data = response.json()
            routes = data.get("routes", [])
            if not routes:
                raise RoutingException(f"OSRM: No route found for {profile} between points.")

            first_route = routes[0]
            distance_meters = int(first_route.get("distance", 0))
            duration_seconds = float(first_route.get("duration", 0.0))
            duration_minutes = max(1, round(duration_seconds / 60))

            return RouteResult(
                distance_meters=distance_meters,
                duration_minutes=duration_minutes,
                mode=profile,
                provider="osrm",
            )
        except httpx.TimeoutException as e:
            raise RoutingException(f"OSRM routing timed out after {self.timeout}s.") from e
        except httpx.RequestError as e:
            raise RoutingException(f"OSRM routing network error: {e}") from e


def get_routing_client() -> RoutingClientBase:
    """Returns the configured routing client.
    Prioritizes Geoapify if API key is set; otherwise uses real public OSRM router.
    """
    if settings.GEOAPIFY_API_KEY and settings.ROUTING_PROVIDER == "geoapify":
        return GeoapifyRoutingClient(timeout=settings.ROUTING_TIMEOUT_SECONDS)
    return OSRMRoutingClient(timeout=settings.ROUTING_TIMEOUT_SECONDS)
