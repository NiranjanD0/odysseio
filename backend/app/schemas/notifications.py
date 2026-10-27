from pydantic import BaseModel


class TelegramNotificationRequest(BaseModel):
    chatId: str | None = None
    itineraryId: str | None = None
    customMessage: str | None = None


class TelegramNotificationResponse(BaseModel):
    success: bool
    message: str
    messageId: int | None = None
