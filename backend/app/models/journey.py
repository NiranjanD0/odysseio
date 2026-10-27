import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.stop import ItineraryStopModel


class JourneyModel(Base, TimestampMixin):
    __tablename__ = "journeys"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    return_deadline: Mapped[str] = mapped_column(String(10), nullable=False)
    safety_buffer_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    pace: Mapped[str] = mapped_column(String(50), default="balanced", nullable=False)
    transport: Mapped[str] = mapped_column(String(50), default="walking", nullable=False)

    total_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    exploration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    travel_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    return_leg_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    interests: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="upcoming", nullable=False)

    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    start_lat: Mapped[float] = mapped_column(Float, nullable=True)
    start_lng: Mapped[float] = mapped_column(Float, nullable=True)
    return_lat: Mapped[float] = mapped_column(Float, nullable=True)
    return_lng: Mapped[float] = mapped_column(Float, nullable=True)

    warnings: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    stops: Mapped[list["ItineraryStopModel"]] = relationship(
        "ItineraryStopModel",
        back_populates="journey",
        cascade="all, delete-orphan",
        order_by="ItineraryStopModel.stop_order",
        lazy="selectin",
    )
