import math

import httpx

from app.core.config import settings
from app.core.logging import logger
from app.schemas.common import Coordinates
from app.schemas.context import BikeSharingContext, BikeStation


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return int(R * c)


class CityBikesClient:
    def __init__(self, timeout: float = 8.0):
        self.base_url = settings.CITYBIKES_BASE_URL
        self.timeout = timeout

    async def get_bike_context(
        self, lat: float, lng: float, max_distance_meters: int = 25000
    ) -> BikeSharingContext:
        """Finds closest bike sharing network and nearby stations."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(f"{self.base_url}/networks")
            if res.status_code != 200:
                return BikeSharingContext(available=False)

            data = res.json()
            networks = data.get("networks", [])
            closest_network = None
            closest_dist = float("inf")

            for net in networks:
                loc = net.get("location", {})
                n_lat = loc.get("latitude")
                n_lng = loc.get("longitude")
                if n_lat is not None and n_lng is not None:
                    dist = haversine_distance_meters(lat, lng, n_lat, n_lng)
                    if dist < closest_dist and dist <= max_distance_meters:
                        closest_dist = dist
                        closest_network = net

            if not closest_network:
                return BikeSharingContext(available=False)

            net_id = closest_network.get("id")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                net_res = await client.get(f"{self.base_url}/networks/{net_id}")
            if net_res.status_code != 200:
                return BikeSharingContext(available=False)

            net_data = net_res.json().get("network", {})
            raw_stations = net_data.get("stations", [])
            stations = []

            for st in raw_stations:
                s_lat = st.get("latitude")
                s_lng = st.get("longitude")
                if s_lat is not None and s_lng is not None:
                    s_dist = haversine_distance_meters(lat, lng, s_lat, s_lng)
                    stations.append(
                        BikeStation(
                            id=st.get("id") or str(st.get("name")),
                            name=st.get("name") or "Bike Station",
                            freeBikes=int(st.get("free_bikes") or 0),
                            emptySlots=int(st.get("empty_slots") or 0),
                            coordinates=Coordinates(lat=s_lat, lng=s_lng),
                            distanceMeters=s_dist,
                        )
                    )

            # Sort by proximity and take top 10 closest
            stations.sort(key=lambda s: s.distanceMeters or 0)

            return BikeSharingContext(
                available=True,
                networkName=net_data.get("name") or closest_network.get("name"),
                stations=stations[:10],
            )
        except Exception as e:
            logger.warning(f"CityBikes error: {e}")
            return BikeSharingContext(available=False)
