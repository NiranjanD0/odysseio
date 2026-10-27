from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ResourceNotFoundException, RoutingException
from app.integrations.routing import RoutingClientBase, get_routing_client
from app.repositories.journey_repo import JourneyRepository
from app.schemas.itinerary import Itinerary, ItineraryStop
from app.schemas.replan import ReplanRequest
from app.services.scheduler_service import minutes_to_time, time_to_minutes


class ReplanService:
    def __init__(self, session: AsyncSession, routing_client: RoutingClientBase | None = None):
        self.session = session
        self.journey_repo = JourneyRepository(session)
        self.routing = routing_client or get_routing_client()

    async def replan(self, journey_id: str, req: ReplanRequest) -> Itinerary:
        itinerary = await self.journey_repo.get_by_id(journey_id)
        if not itinerary:
            raise ResourceNotFoundException(f"Itinerary '{journey_id}' not found.")

        # 1. Update stop statuses based on completed/skipped inputs
        completed_ids = set(req.completedStopIds)
        skipped_ids = set(req.skippedStopIds)

        preserved_stops: list[ItineraryStop] = []
        pending_stops: list[ItineraryStop] = []

        last_known_coord = itinerary.centerCoordinates
        last_departure_mins = time_to_minutes(itinerary.startTime)

        for stop in itinerary.stops:
            if stop.id in completed_ids:
                stop.status = "completed"
                preserved_stops.append(stop)
                last_known_coord = stop.place.coordinates
                last_departure_mins = time_to_minutes(stop.departureTime)
            elif stop.id in skipped_ids or stop.status == "skipped":
                stop.status = "skipped"
                preserved_stops.append(stop)
            elif stop.status == "completed":
                preserved_stops.append(stop)
                last_known_coord = stop.place.coordinates
                last_departure_mins = time_to_minutes(stop.departureTime)
            else:
                pending_stops.append(stop)

        # 2. Determine current location
        current_coord = req.currentCoordinates or last_known_coord
        return_coord = itinerary.centerCoordinates

        # 3. Calculate remaining available time window
        return_deadline_str = req.updatedReturnTime or itinerary.returnDeadline
        deadline_mins = time_to_minutes(return_deadline_str)
        safety_buffer = itinerary.safetyBufferMinutes
        effective_deadline = deadline_mins - safety_buffer

        if req.remainingMinutes is not None:
            # Explicit remaining minutes passed
            now_mins = effective_deadline - req.remainingMinutes
        else:
            now = datetime.now(UTC)
            now_mins = now.hour * 60 + now.minute
            if now_mins < last_departure_mins or now_mins > deadline_mins:
                now_mins = last_departure_mins

        available_budget = effective_deadline - now_mins

        warnings: list[str] = list(itinerary.warnings)
        if available_budget <= 15:
            warnings.append(
                f"Critically low remaining time ({max(0, available_budget)}m). "
                "All upcoming stops skipped to ensure returning before deadline."
            )
            for ps in pending_stops:
                ps.status = "skipped"
                ps.notes = "Skipped to protect return deadline."
                preserved_stops.append(ps)

            itinerary.stops = preserved_stops
            itinerary.warnings = warnings
            await self.journey_repo.save_journey(itinerary)
            return itinerary

        # 4. Filter or reorder pending stops if interests updated
        if req.updatedInterests:
            interest_set = set(req.updatedInterests)
            pending_stops.sort(key=lambda s: 0 if s.place.category in interest_set else 1)

        # 5. Reschedule remaining stops
        scheduled_remaining: list[ItineraryStop] = []
        curr_mins = now_mins
        transport = req.updatedTransport or itinerary.transport

        for stop in pending_stops:
            # Travel from current coord to this stop
            try:
                leg_route = await self.routing.calculate_route(
                    origin=current_coord,
                    destination=stop.place.coordinates,
                    transport=transport,
                )
                leg_travel_mins = leg_route.duration_minutes
                leg_dist_m = leg_route.distance_meters
            except RoutingException:
                stop.status = "skipped"
                stop.notes = "Skipped: route unavailable."
                preserved_stops.append(stop)
                continue

            # Visit duration
            visit_mins = stop.place.estimatedVisitMinutes

            # Return leg from this stop to return coord
            try:
                ret_route = await self.routing.calculate_route(
                    origin=stop.place.coordinates,
                    destination=return_coord,
                    transport=transport,
                )
                ret_leg_mins = ret_route.duration_minutes
            except RoutingException:
                stop.status = "skipped"
                stop.notes = "Skipped: return route unavailable."
                preserved_stops.append(stop)
                continue

            # Check feasibility
            projected_return = curr_mins + leg_travel_mins + visit_mins + ret_leg_mins
            if projected_return > effective_deadline:
                # Cannot fit this stop
                stop.status = "skipped"
                stop.notes = "Skipped: insufficient time remaining before return deadline."
                preserved_stops.append(stop)
                continue

            # It fits!
            arrival_mins = curr_mins + leg_travel_mins
            departure_mins = arrival_mins + visit_mins

            stop.arrivalTime = minutes_to_time(arrival_mins)
            stop.departureTime = minutes_to_time(departure_mins)
            stop.travelTimeFromPrev = leg_travel_mins
            stop.travelDistanceFromPrev = leg_dist_m
            stop.status = "upcoming"
            stop.notes = f"Replanned at {minutes_to_time(now_mins)}."

            scheduled_remaining.append(stop)
            curr_mins = departure_mins
            current_coord = stop.place.coordinates

        all_stops = preserved_stops + scheduled_remaining
        # Sort stops chronologically: completed/skipped first in original order, then newly scheduled
        active_stops = [s for s in all_stops if s.status in ("completed", "upcoming")]

        exploration_mins = sum(s.place.estimatedVisitMinutes for s in active_stops)
        travel_mins = sum(s.travelTimeFromPrev for s in active_stops)

        if not scheduled_remaining and pending_stops:
            warnings.append("No further stops could be scheduled within the remaining time window.")

        itinerary.stops = all_stops
        itinerary.explorationMinutes = exploration_mins
        itinerary.travelMinutes = travel_mins
        itinerary.totalMinutes = exploration_mins + travel_mins
        if req.updatedReturnTime:
            itinerary.returnDeadline = req.updatedReturnTime
        if req.updatedPace:
            itinerary.pace = req.updatedPace
        if req.updatedTransport:
            itinerary.transport = req.updatedTransport
        if req.updatedInterests:
            itinerary.interests = req.updatedInterests
        itinerary.warnings = warnings

        # Save to DB
        await self.journey_repo.save_journey(itinerary)
        return itinerary
