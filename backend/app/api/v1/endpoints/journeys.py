from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import ResourceNotFoundException
from app.repositories.journey_repo import JourneyRepository
from app.schemas.itinerary import Itinerary
from app.schemas.replan import ReplanRequest
from app.services.replan_service import ReplanService

router = APIRouter(prefix="/journeys", tags=["Journeys"])


@router.get("", response_model=list[Itinerary])
async def list_journeys(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    repo = JourneyRepository(db)
    return await repo.list_journeys(limit=limit, offset=offset)


@router.get("/{id}", response_model=Itinerary)
async def get_journey(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = JourneyRepository(db)
    journey = await repo.get_by_id(id)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Journey '{id}' not found."},
        )
    return journey


@router.post("/{id}/replan", response_model=Itinerary)
async def replan_journey(
    id: str,
    req: ReplanRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ReplanService(db)
    try:
        return await service.replan(id, req)
    except ResourceNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "REPLAN_ERROR", "message": f"Failed to replan journey: {str(e)}"},
        )


@router.put("/{id}", response_model=Itinerary)
async def update_journey(
    id: str,
    itinerary: Itinerary,
    db: AsyncSession = Depends(get_db),
):
    if itinerary.id != id:
        itinerary.id = id
    repo = JourneyRepository(db)
    return await repo.save_journey(itinerary)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journey(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = JourneyRepository(db)
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Journey '{id}' not found."},
        )
    return None
