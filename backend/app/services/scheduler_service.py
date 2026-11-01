from dataclasses import dataclass, field

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


@dataclass
class ScheduleResult:
    stops: list[ItineraryStop]
    exploration_minutes: int
    travel_minutes: int
    return_leg_minutes: int
    route_geometry: list[Coordinates] = field(default_factory=list)
    feasible: bool = True
    available_minutes: int = 0
    required_minutes: int = 0
    spare_minutes: int = 0
    feasibility_status: str = "FEASIBLE"
    warnings: list[str] = field(default_factory=list)


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
        custom_visit_durations: dict[str, int] | None = None,
        force_candidate_selection: bool = False,
    ) -> ScheduleResult:
        """Schedules stops and calculates truthful feasibility based on actual routing durations.

        Formula:
          available_minutes = deadline_minutes - start_minutes
          required_minutes = every route leg (including final return) + every visit duration + safety_buffer_minutes
          feasible = required_minutes <= available_minutes
        """
        start_minutes = time_to_minutes(start_time_str)
        deadline_minutes = time_to_minutes(return_time_str)

        if deadline_minutes <= start_minutes:
            deadline_minutes += 24 * 60

        available_minutes = deadline_minutes - start_minutes
        effective_deadline = deadline_minutes - safety_buffer_minutes

        warnings: list[str] = []
        if available_minutes < 45:
            warnings.append(
                f"Available time window ({available_minutes}m) is very constrained."
            )

        stops: list[ItineraryStop] = []
        current_minutes = start_minutes
        current_coord = start_coord
        total_exploration_minutes = 0
        total_travel_minutes = 0
        last_return_leg_minutes = 0
        route_geometry: list[Coordinates] = []
        leg_missing = False

        target_max_stops = 3 if force_candidate_selection else PACE_TARGET_STOPS.get(pace, 5)

        for place in candidates:
            if len(stops) >= target_max_stops:
                break

            # 1. Travel from current location to candidate place
            leg_distance_m = 0
            leg_travel_mins = 0
            try:
                leg_route = await self.routing_client.calculate_route(
                    origin=current_coord,
                    destination=place.coordinates,
                    transport=transport,
                )
                leg_travel_mins = leg_route.duration_minutes
                leg_distance_m = leg_route.distance_meters
                if leg_route.geometry:
                    route_geometry.extend(leg_route.geometry)
            except RoutingException as e:
                logger.warning(f"Failed to route to {place.name}: {e}")
                warnings.append(f"Could not calculate route to '{place.name}': {e}.")
                leg_missing = True
                if not force_candidate_selection:
                    continue

            # 2. Visit duration
            if custom_visit_durations and place.id in custom_visit_durations:
                visit_mins = max(5, int(custom_visit_durations[place.id]))
            else:
                visit_mins = self.adjust_visit_duration(place.estimatedVisitMinutes, pace)

            # 3. Return leg preview
            ret_leg_mins = 0
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
                    f"Could not calculate return route from '{place.name}': {e}."
                )
                leg_missing = True
                if not force_candidate_selection:
                    continue

            # 4. If greedy auto-selection, ensure fits before effective deadline
            projected_finish_at_return = (
                current_minutes + leg_travel_mins + visit_mins + ret_leg_mins
            )
            if not force_candidate_selection and projected_finish_at_return > effective_deadline:
                continue

            # 5. Add to schedule
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

        # 6. Add final return leg geometry and duration
        if stops:
            try:
                final_ret_route = await self.routing_client.calculate_route(
                    origin=stops[-1].place.coordinates,
                    destination=return_coord,
                    transport=transport,
                )
                last_return_leg_minutes = final_ret_route.duration_minutes
                if final_ret_route.geometry:
                    route_geometry.extend(final_ret_route.geometry)
            except RoutingException:
                pass

            total_travel_minutes += last_return_leg_minutes
        else:
            warnings.append(
                "No candidate places could fit within the available time and return buffer."
            )

        # 7. Truthful Feasibility Evaluation
        required_minutes = total_travel_minutes + total_exploration_minutes + safety_buffer_minutes
        feasible = (required_minutes <= available_minutes) and not leg_missing
        spare_minutes = available_minutes - required_minutes

        if feasible:
            feasibility_status = f"FEASIBLE — {spare_minutes} min spare"
        else:
            overrun = abs(spare_minutes)
            feasibility_status = f"NOT FEASIBLE — {overrun} min overrun"
            warnings.append(
                f"Schedule requires {required_minutes}m ({total_travel_minutes}m travel + "
                f"{total_exploration_minutes}m visits + {safety_buffer_minutes}m buffer), "
                f"exceeding available {available_minutes}m by {overrun} minutes."
            )

        return ScheduleResult(
            stops=stops,
            exploration_minutes=total_exploration_minutes,
            travel_minutes=total_travel_minutes,
            return_leg_minutes=last_return_leg_minutes,
            route_geometry=route_geometry,
            feasible=feasible,
            available_minutes=available_minutes,
            required_minutes=required_minutes,
            spare_minutes=spare_minutes,
            feasibility_status=feasibility_status,
            warnings=warnings,
        )
