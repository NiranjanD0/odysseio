from pydantic import BaseModel, Field


class TelegramLinkCodeRequest(BaseModel):
    owner_id: str = Field(default="default_user", description="Web session or user ID")


class TelegramLinkCodeResponse(BaseModel):
    code: str
    expires_at: str
    bot_username: str
    deep_link: str


class TelegramStatusResponse(BaseModel):
    linked: bool
    owner_id: str
    chat_id: str | None = None
    username: str | None = None
    notifications_enabled: bool = False
    linked_at: str | None = None
    bot_username: str


class TelegramPreferencesRequest(BaseModel):
    owner_id: str = Field(default="default_user")
    notifications_enabled: bool


class TelegramPreferencesResponse(BaseModel):
    success: bool
    notifications_enabled: bool
    message: str


class TelegramTestRequest(BaseModel):
    owner_id: str = Field(default="default_user")
    chat_id: str | None = None
    message: str | None = None


class TelegramTestResponse(BaseModel):
    success: bool
    message: str
    messageId: int | None = None


class TelegramUnlinkRequest(BaseModel):
    owner_id: str = Field(default="default_user")


class TelegramUnlinkResponse(BaseModel):
    success: bool
    message: str
