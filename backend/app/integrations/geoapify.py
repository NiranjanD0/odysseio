from typing import Any

import httpx

from app.core.config import settings
from app.core.errors import ProviderException
from app.core.logging import logger
from app.schemas.common import Category, Coordinates, OpeningHours
from app.schemas.places import Place

CATEGORY_MAPPING: dict[Category, str] = {
    "cafe": "catering.cafe",
    "food": "catering.restaurant,catering.fast_food",
    "culture": "entertainment.culture,heritage",
    "history": "heritage.historic,building.historic",
    "nature": "leisure.park,natural",
    "architecture": "building,heritage",
    "photography": "tourism.sights,tourism.attraction",
    "shopping": "commercial.shopping_mall,commercial.marketplace",
    "hidden-gem": "tourism.sights,heritage",
    "art": "entertainment.culture.arts_centre,entertainment.culture.theatre",
    "nightlife": "catering.bar,catering.pub,entertainment",
}

ESTIMATED_VISIT_MINUTES: dict[Category, int] = {
    "cafe": 30,
    "food": 45,
    "culture": 60,
    "history": 45,
    "nature": 40,
    "architecture": 30,
    "photography": 25,
    "shopping": 45,
    "hidden-gem": 35,
    "art": 60,
    "nightlife": 60,
}


class GeoapifyClient:
    def __init__(self, api_key: str | None = None, timeout: float = 10.0):
        self.api_key = api_key if api_key is not None else settings.GEOAPIFY_API_KEY
        self.timeout = timeout
        self.base_url = "https://api.geoapify.com/v2/places"

    def _map_category(
        self, geoapify_categories: list[str], fallback: Category = "culture"
    ) -> Category:
        cat_str = " ".join(geoapify_categories).lower()
        if "cafe" in cat_str:
            return "cafe"
        if "restaurant" in cat_str or "fast_food" in cat_str or "catering" in cat_str:
            return "food"
        if "theatre" in cat_str or "arts_centre" in cat_str or "art" in cat_str:
            return "art"
        if "culture" in cat_str or "museum" in cat_str:
            return "culture"
        if "historic" in cat_str or "monument" in cat_str or "heritage" in cat_str:
            return "history"
        if "park" in cat_str or "natural" in cat_str:
            return "nature"
        if "building" in cat_str or "architecture" in cat_str:
            return "architecture"
        if "sights" in cat_str or "attraction" in cat_str or "tourism" in cat_str:
            return "photography"
        if "shopping" in cat_str or "marketplace" in cat_str or "commercial" in cat_str:
            return "shopping"
        if "bar" in cat_str or "pub" in cat_str or "nightlife" in cat_str:
            return "nightlife"
        return fallback

    def _normalize_feature(
        self, feature: dict[str, Any], requested_category: Category | None = None
    ) -> Place | None:
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})
        coords = geometry.get("coordinates", [])

        if len(coords) < 2:
            return None

        lng, lat = coords[0], coords[1]
        name = props.get("name") or props.get("formatted", "").split(",")[0].strip()
        if not name:
            return None

        place_id = props.get("place_id") or f"geo-{lat:.5f}-{lng:.5f}"
        geo_categories = props.get("categories", [])
        category = self._map_category(geo_categories, fallback=requested_category or "culture")

        # Opening hours if genuinely available
        opening_hours = None
        raw_hours = props.get("opening_hours")
        if raw_hours and isinstance(raw_hours, str) and "-" in raw_hours:
            parts = raw_hours.split("-")
            if len(parts) == 2:
                opening_hours = OpeningHours(
                    open=parts[0].strip(),
                    close=parts[1].strip(),
                    days="Mon-Sun",
                )

        # Rating / review count
        raw_rating = props.get("rating") or props.get("user_ratings_total")
        rating = (
            float(raw_rating)
            if raw_rating is not None and isinstance(raw_rating, (int, float))
            else 4.5
        )
        review_count = int(props.get("reviews_count") or 120)

        # Visit duration
        visit_minutes = ESTIMATED_VISIT_MINUTES.get(category, 35)

        # Image fallback
        image_url = props.get("image") or ""

        return Place(
            id=place_id,
            name=name,
            city=props.get("city") or props.get("county") or "",
            country=props.get("country") or "",
            description=props.get("description")
            or f"A notable {category} destination in {props.get('city', 'the city')}.",
            category=category,
            tags=geo_categories[:5],
            coordinates=Coordinates(lat=lat, lng=lng),
            imageUrl=image_url,
            rating=rating,
            reviewCount=review_count,
            estimatedVisitMinutes=visit_minutes,
            openingHours=opening_hours,
            address=props.get("formatted") or props.get("address_line2") or "",
            isSaved=False,
        )

    async def search_places(
        self,
        lat: float,
        lng: float,
        radius_meters: int = 5000,
        categories: list[Category] | None = None,
        limit: int = 30,
    ) -> list[Place]:
        if not self.api_key:
            raise ProviderException(
                "Geoapify API key is not configured. Set GEOAPIFY_API_KEY in environment or .env."
            )

        geo_cats: list[str] = []
        if categories:
            for cat in categories:
                if cat in CATEGORY_MAPPING:
                    geo_cats.append(CATEGORY_MAPPING[cat])
        if not geo_cats:
            geo_cats = ["tourism", "catering", "entertainment", "heritage", "leisure"]

        params = {
            "categories": ",".join(geo_cats),
            "filter": f"circle:{lng},{lat},{radius_meters}",
            "bias": f"proximity:{lng},{lat}",
            "limit": min(limit, 50),
            "apiKey": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)

            if response.status_code == 401:
                raise ProviderException("Invalid Geoapify API key (HTTP 401).")
            if response.status_code == 429:
                raise ProviderException("Geoapify rate limit exceeded (HTTP 429).")
            if response.status_code != 200:
                raise ProviderException(
                    f"Geoapify Places API returned HTTP {response.status_code}: {response.text}"
                )

            data = response.json()
            features = data.get("features", [])
            places: list[Place] = []
            seen_ids = set()

            for feat in features:
                place = self._normalize_feature(
                    feat, requested_category=categories[0] if categories else None
                )
                if place and place.id not in seen_ids:
                    seen_ids.add(place.id)
                    places.append(place)

            return places
        except httpx.TimeoutException as e:
            logger.error(f"Geoapify Places request timed out: {e}")
            raise ProviderException(f"Geoapify Places API timed out after {self.timeout}s.") from e
        except httpx.RequestError as e:
            logger.error(f"Geoapify Places network error: {e}")
            raise ProviderException(f"Geoapify Places network error: {e}") from e
