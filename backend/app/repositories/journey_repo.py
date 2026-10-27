from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.journey import JourneyModel
from app.models.stop import ItineraryStopModel
from app.schemas.common import Coordinates
from app.schemas.itinerary import Itinerary, ItineraryStop
from app.schemas.places import Place


class JourneyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _model_to_schema(self, model: JourneyModel) -> Itinerary:
        stops: list[ItineraryStop] = []
        for s in model.stops:
            place = Place(
                id=s.place_id,
                name=s.place_name,
                city=model.city,
                address=s.place_address,
                category=s.place_category,
                coordinates=Coordinates(lat=s.place_lat, lng=s.place_lng),
                imageUrl=s.place_image_url,
                rating=s.place_rating,
                reviewCount=s.place_review_count,
                estimatedVisitMinutes=s.visit_minutes,
                tags=s.place_tags or [],
            )
            stops.append(
                ItineraryStop(
                    id=s.id,
                    place=place,
                    arrivalTime=s.arrival_time,
                    departureTime=s.departure_time,
                    travelTimeFromPrev=s.travel_time_from_prev,
                    travelDistanceFromPrev=s.travel_distance_from_prev,
                    status=s.status,
                    notes=s.notes,
                )
            )

        return Itinerary(
            id=model.id,
            title=model.title,
            city=model.city,
            date=model.date,
            startTime=model.start_time,
            returnDeadline=model.return_deadline,
            safetyBufferMinutes=model.safety_buffer_minutes,
            stops=stops,
            pace=model.pace,
            transport=model.transport,
            totalMinutes=model.total_minutes,
            explorationMinutes=model.exploration_minutes,
            travelMinutes=model.travel_minutes,
            interests=model.interests,
            status=model.status,
            createdAt=model.created_at.isoformat() if model.created_at else "",
            centerCoordinates=Coordinates(lat=model.center_lat, lng=model.center_lng),
            warnings=model.warnings or [],
        )

    async def save_journey(
        self,
        itinerary: Itinerary,
        start_coord: Coordinates | None = None,
        return_coord: Coordinates | None = None,
    ) -> Itinerary:
        stmt = select(JourneyModel).where(JourneyModel.id == itinerary.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model is None:
            model = JourneyModel(
                id=itinerary.id,
                title=itinerary.title,
                city=itinerary.city,
                date=itinerary.date,
                start_time=itinerary.startTime,
                return_deadline=itinerary.returnDeadline,
                safety_buffer_minutes=itinerary.safetyBufferMinutes,
                pace=itinerary.pace,
                transport=itinerary.transport,
                total_minutes=itinerary.totalMinutes,
                exploration_minutes=itinerary.explorationMinutes,
                travel_minutes=itinerary.travelMinutes,
                interests=list(itinerary.interests),
                status=itinerary.status,
                center_lat=itinerary.centerCoordinates.lat,
                center_lng=itinerary.centerCoordinates.lng,
                start_lat=start_coord.lat if start_coord else itinerary.centerCoordinates.lat,
                start_lng=start_coord.lng if start_coord else itinerary.centerCoordinates.lng,
                return_lat=return_coord.lat if return_coord else itinerary.centerCoordinates.lat,
                return_lng=return_coord.lng if return_coord else itinerary.centerCoordinates.lng,
                warnings=itinerary.warnings,
            )
            self.session.add(model)
        else:
            model.title = itinerary.title
            model.city = itinerary.city
            model.date = itinerary.date
            model.start_time = itinerary.startTime
            model.return_deadline = itinerary.returnDeadline
            model.safety_buffer_minutes = itinerary.safetyBufferMinutes
            model.pace = itinerary.pace
            model.transport = itinerary.transport
            model.total_minutes = itinerary.totalMinutes
            model.exploration_minutes = itinerary.explorationMinutes
            model.travel_minutes = itinerary.travelMinutes
            model.interests = list(itinerary.interests)
            model.status = itinerary.status
            model.warnings = itinerary.warnings
            model.stops.clear()

        for idx, stop in enumerate(itinerary.stops):
            stop_model = ItineraryStopModel(
                id=stop.id,
                journey_id=itinerary.id,
                stop_order=idx,
                place_id=stop.place.id,
                place_name=stop.place.name,
                place_address=stop.place.address,
                place_category=stop.place.category,
                place_lat=stop.place.coordinates.lat,
                place_lng=stop.place.coordinates.lng,
                place_image_url=stop.place.imageUrl,
                place_rating=stop.place.rating,
                place_review_count=stop.place.reviewCount,
                place_tags=stop.place.tags,
                arrival_time=stop.arrivalTime,
                departure_time=stop.departureTime,
                visit_minutes=stop.place.estimatedVisitMinutes,
                travel_time_from_prev=stop.travelTimeFromPrev,
                travel_distance_from_prev=stop.travelDistanceFromPrev,
                status=stop.status,
                notes=stop.notes or "",
            )
            model.stops.append(stop_model)

        self.session.add(model)
        await self.session.flush()
        return itinerary

    async def get_by_id(self, journey_id: str) -> Itinerary | None:
        stmt = select(JourneyModel).where(JourneyModel.id == journey_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return self._model_to_schema(model)

    async def list_journeys(self, limit: int = 50, offset: int = 0) -> list[Itinerary]:
        stmt = (
            select(JourneyModel)
            .order_by(JourneyModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._model_to_schema(m) for m in models]

    async def delete(self, journey_id: str) -> bool:
        stmt = delete(JourneyModel).where(JourneyModel.id == journey_id)
        res = await self.session.execute(stmt)
        return res.rowcount > 0
