from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.telegram import (
    TelegramLinkCodeRequest,
    TelegramLinkCodeResponse,
    TelegramPreferencesRequest,
    TelegramPreferencesResponse,
    TelegramStatusResponse,
    TelegramTestRequest,
    TelegramTestResponse,
    TelegramUnlinkRequest,
    TelegramUnlinkResponse,
)
from app.services.telegram_service import TelegramService

router = APIRouter(prefix="/telegram", tags=["Telegram"])


@router.post("/link-code", response_model=TelegramLinkCodeResponse)
async def generate_link_code(
    req: TelegramLinkCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a single-use, 15-minute link code for connecting a Telegram chat."""
    service = TelegramService(db)
    code, expires_at = await service.generate_link_code(owner_id=req.owner_id)
    bot_username = settings.TELEGRAM_BOT_USERNAME or "odysseioBot"
    deep_link = f"https://t.me/{bot_username}?start={code}"
    return TelegramLinkCodeResponse(
        code=code,
        expires_at=expires_at.isoformat(),
        bot_username=bot_username,
        deep_link=deep_link,
    )


@router.get("/status", response_model=TelegramStatusResponse)
async def get_link_status(
    owner_id: str = Query("default_user"),
    db: AsyncSession = Depends(get_db),
):
    """Get the current Telegram connection status and preferences for the given owner."""
    service = TelegramService(db)
    return await service.get_link_status(owner_id=owner_id)


@router.post("/preferences", response_model=TelegramPreferencesResponse)
async def update_preferences(
    req: TelegramPreferencesRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences for the linked Telegram chat."""
    service = TelegramService(db)
    success, msg = await service.set_notification_preference_by_owner(
        owner_id=req.owner_id,
        enabled=req.notifications_enabled,
    )
    return TelegramPreferencesResponse(
        success=success,
        notifications_enabled=req.notifications_enabled,
        message=msg,
    )


@router.post("/test", response_model=TelegramTestResponse)
async def send_test_message(
    req: TelegramTestRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a live test message to verify the Telegram connection."""
    service = TelegramService(db)
    success, msg, msg_id = await service.send_test_message(
        owner_id=req.owner_id,
        chat_id=req.chat_id,
        custom_message=req.message,
    )
    return TelegramTestResponse(
        success=success,
        message=msg,
        messageId=msg_id,
    )


@router.post("/unlink", response_model=TelegramUnlinkResponse)
async def unlink_telegram(
    req: TelegramUnlinkRequest,
    db: AsyncSession = Depends(get_db),
):
    """Unlink the Telegram connection for this owner."""
    service = TelegramService(db)
    success, msg = await service.unlink_by_owner(owner_id=req.owner_id)
    return TelegramUnlinkResponse(success=success, message=msg)


@router.post("/webhook")
async def telegram_webhook(
    update: dict,
    x_telegram_bot_api_secret_token: str | None = Header(
        None, alias="X-Telegram-Bot-Api-Secret-Token"
    ),
    db: AsyncSession = Depends(get_db),
):
    """Telegram webhook endpoint for production deployment."""
    if settings.TELEGRAM_WEBHOOK_SECRET:
        if x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Telegram webhook secret token.",
            )

    service = TelegramService(db)
    res = await service.handle_update(update)
    return {"ok": True, "result": res}
