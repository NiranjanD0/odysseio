from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_place import SavedPlaceModel
from app.schemas.common import Coordinates
from app.schemas.places import Place


class SavedPlaceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _model_to_schema(self, m: SavedPlaceModel) -> Place:
        return Place(
            id=m.place_id,
            name=m.name,
            city=m.city,
            country=m.country,
            address=m.address,
            category=m.category,
            coordinates=Coordinates(lat=m.lat, lng=m.lng),
            imageUrl=m.image_url,
            rating=m.rating,
            reviewCount=m.review_count,
            estimatedVisitMinutes=m.estimated_visit_minutes,
            tags=m.tags or [],
            isSaved=True,
        )

    async def is_saved(self, place_id: str) -> bool:
        stmt = select(SavedPlaceModel).where(SavedPlaceModel.place_id == place_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def toggle_save(self, place: Place, notes: str = "") -> tuple[bool, str]:
        stmt = select(SavedPlaceModel).where(SavedPlaceModel.place_id == place.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            await self.session.delete(existing)
            await self.session.flush()
            return False, "Place removed from saved places."
        else:
            model = SavedPlaceModel(
                place_id=place.id,
                name=place.name,
                city=place.city,
                country=place.country,
                address=place.address,
                category=place.category,
                lat=place.coordinates.lat,
                lng=place.coordinates.lng,
                image_url=place.imageUrl,
                rating=place.rating,
                review_count=place.reviewCount,
                estimated_visit_minutes=place.estimatedVisitMinutes,
                tags=place.tags,
                notes=notes,
            )
            self.session.add(model)
            await self.session.flush()
            return True, "Place added to saved places."

    async def list_saved(self) -> list[Place]:
        stmt = select(SavedPlaceModel).order_by(SavedPlaceModel.saved_at.desc())
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._model_to_schema(m) for m in models]

    async def delete_by_place_id(self, place_id: str) -> bool:
        stmt = delete(SavedPlaceModel).where(SavedPlaceModel.place_id == place_id)
        res = await self.session.execute(stmt)
        return res.rowcount > 0
