import math

from app.schemas.common import Category, Coordinates
from app.schemas.places import Place


def haversine_distance_km(coord1: Coordinates, coord2: Coordinates) -> float:
    R = 6371.0
    phi1 = math.radians(coord1.lat)
    phi2 = math.radians(coord2.lat)
    delta_phi = math.radians(coord2.lat - coord1.lat)
    delta_lambda = math.radians(coord2.lng - coord1.lng)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class ScoringService:
    @staticmethod
    def score_places(
        candidates: list[Place],
        interests: list[Category],
        start_coord: Coordinates,
        max_distance_km: float = 10.0,
    ) -> list[Place]:
        """Scores candidate places deterministically using:
        - Interest relevance (up to +50 pts)
        - Rating & reviews (up to +25 pts)
        - Proximity to origin (up to +25 pts)
        Returns places sorted in descending score order.
        """
        scored: list[tuple[float, Place]] = []
        interest_set = set(interests)

        for place in candidates:
            score = 0.0

            # 1. Interest Match
            if place.category in interest_set:
                score += 50.0
            else:
                score += 10.0

            # 2. Rating & Review weight
            rating_pts = (place.rating / 5.0) * 20.0
            review_bonus = min(5.0, math.log10(max(1, place.reviewCount)))
            score += rating_pts + review_bonus

            # 3. Proximity score (closer gets higher points)
            dist_km = haversine_distance_km(start_coord, place.coordinates)
            if dist_km <= max_distance_km:
                proximity_pts = 25.0 * (1.0 - (dist_km / max_distance_km))
                score += max(0.0, proximity_pts)

            scored.append((score, place))

        # Deterministic sorting: highest score first, tie-break by place.id
        scored.sort(key=lambda x: (-x[0], x[1].id))
        return [p for _, p in scored]

    @staticmethod
    def filter_for_diversity(
        candidates: list[Place],
        target_count: int,
        max_per_category: int = 2,
    ) -> list[Place]:
        """Ensures category variety so itineraries don't contain 4 consecutive cafes."""
        category_counts: dict[str, int] = {}
        selected: list[Place] = []
        deferred: list[Place] = []

        for place in candidates:
            count = category_counts.get(place.category, 0)
            if count < max_per_category:
                selected.append(place)
                category_counts[place.category] = count + 1
            else:
                deferred.append(place)

            if len(selected) >= target_count:
                break

        # If we need more to fill the target, pull from deferred
        if len(selected) < target_count:
            needed = target_count - len(selected)
            selected.extend(deferred[:needed])

        return selected
