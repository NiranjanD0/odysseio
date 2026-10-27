from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.saved_place_repo import SavedPlaceRepository
from app.schemas.places import Place
from app.schemas.saved_place import SavedPlaceResponse, SavedPlaceToggleRequest

router = APIRouter(prefix="/saved-places", tags=["Saved Places"])


@router.get("", response_model=list[Place])
async def list_saved_places(db: AsyncSession = Depends(get_db)):
    repo = SavedPlaceRepository(db)
    return await repo.list_saved()


@router.post("", response_model=SavedPlaceResponse)
async def toggle_saved_place(
    req: SavedPlaceToggleRequest,
    db: AsyncSession = Depends(get_db),
):
    repo = SavedPlaceRepository(db)
    is_saved, message = await repo.toggle_save(req.place, notes=req.notes or "")
    return SavedPlaceResponse(isSaved=is_saved, placeId=req.place.id, message=message)


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_place(
    place_id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = SavedPlaceRepository(db)
    deleted = await repo.delete_by_place_id(place_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Saved place '{place_id}' not found."},
        )
    return None
