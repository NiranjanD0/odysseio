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

        # 3. Score and diversify places
        scored = ScoringService.score_places(
            candidates=candidates,
            interests=req.interests,
            start_coord=start_coord,
        )
        diversified = ScoringService.filter_for_diversity(
            candidates=scored,
            target_count=15,
            max_per_category=2,
        )

        # 4. Schedule stops greedily with strict return deadline guarantee
        (
            stops,
            exploration_mins,
            travel_mins,
            return_leg_mins,
            sched_warnings,
        ) = await self.scheduler.build_schedule(
            candidates=diversified,
            start_coord=start_coord,
            return_coord=return_coord,
            start_time_str=req.startTime,
            return_time_str=req.returnTime,
            safety_buffer_minutes=req.safetyBufferMinutes,
            pace=req.pace,
            transport=req.transport,
        )
        warnings.extend(sched_warnings)

        if not stops:
            raise FeasibilityException(
                "Could not build a feasible itinerary: no selected places fit within "
                f"the available time window ({available_window}m) while allowing a safe return."
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
            stops=stops,
            pace=req.pace,
            transport=req.transport,
            totalMinutes=exploration_mins + travel_mins,
            explorationMinutes=exploration_mins,
            travelMinutes=travel_mins,
            returnLegMinutes=return_leg_mins,
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

        return itinerary
