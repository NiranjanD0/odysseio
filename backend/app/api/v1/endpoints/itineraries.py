from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import FeasibilityException, ResourceNotFoundException
from app.repositories.journey_repo import JourneyRepository
from app.schemas.common import JourneyStatus
from app.schemas.itinerary import Itinerary, ItineraryCreateRequest
from app.schemas.replan import ReplanRequest
from app.services.export_service import generate_gpx
from app.services.itinerary_service import ItineraryService
from app.services.replan_service import ReplanService


class StatusUpdateRequest(BaseModel):
    status: JourneyStatus

router = APIRouter(prefix="/itineraries", tags=["Itineraries"])


@router.post("", response_model=Itinerary, status_code=status.HTTP_201_CREATED)
async def create_itinerary(
    req: ItineraryCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ItineraryService(db)
    try:
        return await service.generate_itinerary(req)
    except FeasibilityException as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"error": "FEASIBILITY_ERROR", "message": str(e)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_ERROR",
                "message": f"Failed to generate itinerary: {str(e)}",
            },
        )


@router.get("/{id}", response_model=Itinerary)
async def get_itinerary(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = JourneyRepository(db)
    itinerary = await repo.get_by_id(id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Itinerary '{id}' not found."},
        )
    return itinerary


@router.patch("/{id}/status", response_model=Itinerary)
async def update_itinerary_status(
    id: str,
    req: StatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update the journey status (upcoming → in-progress → completed)."""
    repo = JourneyRepository(db)
    itinerary = await repo.get_by_id(id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Itinerary '{id}' not found."},
        )
    itinerary.status = req.status
    await repo.save_journey(itinerary)
    return itinerary


@router.get("/{id}/export.gpx", response_class=Response)
async def export_itinerary_gpx(
    id: str,
    db: AsyncSession = Depends(get_db),
):
    """Export itinerary as a GPX 1.1 file (waypoints + route)."""
    repo = JourneyRepository(db)
    itinerary = await repo.get_by_id(id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Itinerary '{id}' not found."},
        )
    gpx_content = generate_gpx(itinerary)
    filename = f"odysseio-{itinerary.city.lower().replace(' ', '-')}-{itinerary.date}.gpx"
    return Response(
        content=gpx_content,
        media_type="application/gpx+xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{id}/replan", response_model=Itinerary)
async def replan_itinerary(
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
            detail={"error": "REPLAN_ERROR", "message": f"Failed to replan itinerary: {str(e)}"},
        )
