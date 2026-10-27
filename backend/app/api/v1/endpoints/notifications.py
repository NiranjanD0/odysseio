from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.integrations.telegram import TelegramClient
from app.repositories.journey_repo import JourneyRepository
from app.schemas.notifications import (
    TelegramNotificationRequest,
    TelegramNotificationResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/telegram", response_model=TelegramNotificationResponse)
async def send_telegram_notification(
    req: TelegramNotificationRequest,
    db: AsyncSession = Depends(get_db),
):
    client = TelegramClient()
    message_text = req.customMessage

    if req.itineraryId:
        repo = JourneyRepository(db)
        itinerary = await repo.get_by_id(req.itineraryId)
        if not itinerary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Itinerary '{req.itineraryId}' not found.",
            )
        message_text = client.format_itinerary_message(itinerary)
        if req.customMessage:
            message_text = f"{req.customMessage}\n\n{message_text}"

    if not message_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either itineraryId or customMessage must be provided.",
        )

    success, msg, msg_id = await client.send_message(text=message_text, chat_id=req.chatId)
    if not success:
        return TelegramNotificationResponse(success=False, message=msg, messageId=None)

    return TelegramNotificationResponse(success=True, message=msg, messageId=msg_id)
