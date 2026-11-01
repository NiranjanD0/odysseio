from datetime import UTC, datetime
import uuid

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TelegramLinkModel(Base, TimestampMixin):
    __tablename__ = "telegram_links"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    owner_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    telegram_chat_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    telegram_user_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    unlinked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TelegramLinkCodeModel(Base):
    __tablename__ = "telegram_link_codes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
