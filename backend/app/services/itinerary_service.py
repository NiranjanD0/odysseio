import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import FeasibilityException, ProviderException
from app.core.logging import logger
from app.integrations.geoapify import GeoapifyClient
from app.integrations.open_meteo import OpenMeteoClient
from app.integrations.routing import RoutingClientBase, get_routing_client
from app.repositories.journey_repo import JourneyRepository
from app.repositories.saved_place_repo import SavedPlaceRepository
from app.schemas.itinerary import Itinerary, ItineraryCreateRequest
from app.schemas.places import Place
from app.services.scheduler_service import SchedulerService, time_to_minutes
from app.services.scoring_service import ScoringService


class ItineraryService:
    def __init__(
        self,
        session: AsyncSession,
        geoapify_client: GeoapifyClient | None = None,
        routing_client: RoutingClientBase | None = None,
        weather_client: OpenMeteoClient | None = None,
    ):
        self.session = session
        self.journey_repo = JourneyRepository(session)
        self.saved_place_repo = SavedPlaceRepository(session)
        self.geoapify = geoapify_client or GeoapifyClient()
        self.routing = routing_client or get_routing_client()
        self.weather = weather_client or OpenMeteoClient()
        self.scheduler = SchedulerService(self.routing)

    async def generate_itinerary(self, req: ItineraryCreateRequest) -> Itinerary:
        # 1. Basic time validation
        start_min = time_to_minutes(req.startTime)
        return_min = time_to_minutes(req.returnTime)
        if return_min <= start_min:
            return_min += 24 * 60

        total_window = return_min - start_min
        available_window = total_window - req.safetyBufferMinutes
        if available_window < 30:
            raise FeasibilityException(
                f"Insufficient time window: {total_window}m total minus {req.safetyBufferMinutes}m "
                f"safety buffer leaves only {available_window}m for travel and visits."
            )

        start_coord = req.startCoordinates
        return_coord = req.returnCoordinates or req.startCoordinates

        # 2. Discover real places from Geoapify
        warnings: list[str] = []
        candidates: list[Place] = []

        try:
            candidates = await self.geoapify.search_places(
                lat=start_coord.lat,
                lng=start_coord.lng,
                radius_meters=settings.MAX_SEARCH_RADIUS_METERS,
                categories=req.interests,
                limit=35,
            )
        except ProviderException as e:
            logger.warning(f"Geoapify places search failed: {e}")
            warnings.append(f"Geoapify search unavailable: {str(e)}")
            # Try saved places as fallback
            saved = await self.saved_place_repo.list_saved()
            if saved:
                candidates = [s for s in saved if s.category in req.interests]
                if candidates:
                    warnings.append("Using previously saved places to construct itinerary.")

        if not candidates:
            raise FeasibilityException(
                f"No places could be discovered in '{req.destination}' matching your interests: "
                f"{', '.join(req.interests)}. {'; '.join(warnings)}"
            )

        # 3. Handle place selection (user-specified up to 3 places or scored discovery)
        selected_candidates: list[Place]
        force_selection = False
        if req.selectedPlaceIds and len(req.selectedPlaceIds) > 0:
            selected_ids = req.selectedPlaceIds[:3]
            selected_map = {p.id: p for p in candidates}
            selected_candidates = [
                selected_map[pid] for pid in selected_ids if pid in selected_map
            ]
            # If some selected places weren't in current search, attempt to fetch remaining
            if len(selected_candidates) < len(selected_ids):
                for pid in selected_ids:
                    if pid not in selected_map:
                        saved_place = await self.saved_place_repo.get_by_id(pid)
                        if saved_place:
                            selected_candidates.append(saved_place)
            if selected_candidates:
                force_selection = True
            else:
                selected_candidates = candidates
        else:
            scored = ScoringService.score_places(
                candidates=candidates,
                interests=req.interests,
                start_coord=start_coord,
            )
            selected_candidates = ScoringService.filter_for_diversity(
                candidates=scored,
                target_count=15,
                max_per_category=2,
            )

        # 4. Schedule stops and evaluate truthful feasibility
        sched_res = await self.scheduler.build_schedule(
            candidates=selected_candidates,
            start_coord=start_coord,
            return_coord=return_coord,
            start_time_str=req.startTime,
            return_time_str=req.returnTime,
            safety_buffer_minutes=req.safetyBufferMinutes,
            pace=req.pace,
            transport=req.transport,
            custom_visit_durations=req.customVisitDurations,
            force_candidate_selection=force_selection,
        )
        warnings.extend(sched_res.warnings)

        if not sched_res.stops:
            raise FeasibilityException(
                "Could not build an itinerary: no candidate places could be reached "
                f"or fit within the available time window ({available_window}m)."
            )

        # 5. Check real weather for environmental advisory
        try:
            weather_ctx = await self.weather.get_weather(lat=start_coord.lat, lng=start_coord.lng)
            if weather_ctx and weather_ctx.current:
                w_curr = weather_ctx.current
                if w_curr.weatherCode in (61, 63, 65, 80, 81, 82, 95):
                    warnings.append(
                        f"Weather advisory: {w_curr.description} expected during your exploration."
                    )
        except Exception:
            pass

        # 6. Compose Itinerary
        itinerary_id = str(uuid.uuid4())
        today_str = datetime.date.today().isoformat()
        pace_label = req.pace.capitalize()
        title = f"{pace_label} Adventure in {req.destination}"

        itinerary = Itinerary(
            id=itinerary_id,
            title=title,
            city=req.destination,
            date=today_str,
            startTime=req.startTime,
            returnDeadline=req.returnTime,
            safetyBufferMinutes=req.safetyBufferMinutes,
            stops=sched_res.stops,
            pace=req.pace,
            transport=req.transport,
            totalMinutes=sched_res.exploration_minutes + sched_res.travel_minutes,
            explorationMinutes=sched_res.exploration_minutes,
            travelMinutes=sched_res.travel_minutes,
            returnLegMinutes=sched_res.return_leg_minutes,
            feasible=sched_res.feasible,
            availableMinutes=sched_res.available_minutes,
            requiredMinutes=sched_res.required_minutes,
            spareMinutes=sched_res.spare_minutes,
            feasibilityStatus=sched_res.feasibility_status,
            routeGeometry=sched_res.route_geometry,
            ownerId=req.ownerId,
            interests=req.interests,
            status="upcoming",
            createdAt=datetime.datetime.now(datetime.UTC).isoformat(),
            centerCoordinates=start_coord,
            warnings=warnings,
        )

        # 7. Persist to Database
        await self.journey_repo.save_journey(
            itinerary=itinerary,
            start_coord=start_coord,
            return_coord=return_coord,
        )

        # 8. Notify Telegram if opted-in
        try:
            from app.services.telegram_service import TelegramService

            tg_service = TelegramService(self.session)
            await tg_service.notify_journey_created(itinerary)
        except Exception as e:
            logger.warning(f"Telegram journey notification failed (non-blocking): {e}")

        return itinerary
