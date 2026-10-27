from app.core.errors import RoutingException
from app.core.logging import logger
from app.integrations.routing import RoutingClientBase
from app.schemas.common import Coordinates, Pace, Transport
from app.schemas.itinerary import ItineraryStop
from app.schemas.places import Place


def time_to_minutes(t_str: str) -> int:
    parts = t_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time(minutes: int) -> str:
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


PACE_MULTIPLIERS = {
    "relaxed": 1.25,
    "balanced": 1.0,
    "packed": 0.8,
}

PACE_TARGET_STOPS = {
    "relaxed": 3,
    "balanced": 5,
    "packed": 7,
}


class SchedulerService:
    def __init__(self, routing_client: RoutingClientBase):
        self.routing_client = routing_client

    def adjust_visit_duration(self, base_minutes: int, pace: Pace) -> int:
        multiplier = PACE_MULTIPLIERS.get(pace, 1.0)
        return max(15, round(base_minutes * multiplier))

    async def build_schedule(
        self,
        candidates: list[Place],
        start_coord: Coordinates,
        return_coord: Coordinates,
        start_time_str: str,
        return_time_str: str,
        safety_buffer_minutes: int,
        pace: Pace,
        transport: Transport,
    ) -> tuple[list[ItineraryStop], int, int, int, list[str]]:
        """Greedily schedules stops while strictly guaranteeing the return deadline.

        Returns:
            (stops, exploration_minutes, travel_minutes, return_leg_minutes, warnings)
        """
        start_minutes = time_to_minutes(start_time_str)
        deadline_minutes = time_to_minutes(return_time_str)

        if deadline_minutes <= start_minutes:
            # Overnight or invalid
            deadline_minutes += 24 * 60

        effective_deadline = deadline_minutes - safety_buffer_minutes
        total_available = effective_deadline - start_minutes

        warnings: list[str] = []
        if total_available < 45:
            warnings.append(
                f"Available time ({total_available}m after {safety_buffer_minutes}m buffer) is very constrained."
            )

        stops: list[ItineraryStop] = []
        current_minutes = start_minutes
        current_coord = start_coord
        total_exploration_minutes = 0
        total_travel_minutes = 0
        last_return_leg_minutes = 0

        target_max_stops = PACE_TARGET_STOPS.get(pace, 5)

        for place in candidates:
            if len(stops) >= target_max_stops:
                break

            # 1. Travel from current location to candidate place
            try:
                leg_route = await self.routing_client.calculate_route(
                    origin=current_coord,
                    destination=place.coordinates,
                    transport=transport,
                )
                leg_travel_mins = leg_route.duration_minutes
                leg_distance_m = leg_route.distance_meters
            except RoutingException as e:
                logger.warning(f"Failed to route to {place.name}: {e}")
                warnings.append(f"Could not calculate route to '{place.name}': {e}. Skipping stop.")
                continue

            # 2. Visit duration
            visit_mins = self.adjust_visit_duration(place.estimatedVisitMinutes, pace)

            # 3. Return leg from candidate place to final return coordinate
            try:
                ret_route = await self.routing_client.calculate_route(
                    origin=place.coordinates,
                    destination=return_coord,
                    transport=transport,
                )
                ret_leg_mins = ret_route.duration_minutes
            except RoutingException as e:
                logger.warning(f"Failed to route from {place.name} to return point: {e}")
                warnings.append(
                    f"Could not calculate return route from '{place.name}': {e}. Skipping stop."
                )
                continue

            # 4. Enforce feasibility: Must reach return location BEFORE effective deadline
            projected_finish_at_return = (
                current_minutes + leg_travel_mins + visit_mins + ret_leg_mins
            )
            if projected_finish_at_return > effective_deadline:
                # Doesn't fit in remaining window with safety buffer; stop adding
                continue

            # 5. Place fits! Add to schedule
            arrival_mins = current_minutes + leg_travel_mins
            departure_mins = arrival_mins + visit_mins

            stop_id = f"stop-{len(stops) + 1}-{place.id[:8]}"
            stop = ItineraryStop(
                id=stop_id,
                place=place,
                arrivalTime=minutes_to_time(arrival_mins),
                departureTime=minutes_to_time(departure_mins),
                travelTimeFromPrev=leg_travel_mins,
                travelDistanceFromPrev=leg_distance_m,
                status="upcoming",
                notes=f"Planned visit of {visit_mins}m via {transport}.",
            )

            stops.append(stop)
            current_minutes = departure_mins
            current_coord = place.coordinates
            total_exploration_minutes += visit_mins
            total_travel_minutes += leg_travel_mins
            last_return_leg_minutes = ret_leg_mins

        # Include the final return travel leg in the total travel minutes
        if stops:
            total_travel_minutes += last_return_leg_minutes
        else:
            warnings.append(
                "No candidate places could fit within the available time and return buffer."
            )

        return (
            stops,
            total_exploration_minutes,
            total_travel_minutes,
            last_return_leg_minutes,
            warnings,
        )
