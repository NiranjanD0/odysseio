import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.journey import JourneyModel


class ItineraryStopModel(Base):
    __tablename__ = "itinerary_stops"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    journey_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("journeys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stop_order: Mapped[int] = mapped_column(Integer, nullable=False)

    place_id: Mapped[str] = mapped_column(String(100), nullable=False)
    place_name: Mapped[str] = mapped_column(String(255), nullable=False)
    place_address: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    place_category: Mapped[str] = mapped_column(String(50), nullable=False)
    place_lat: Mapped[float] = mapped_column(Float, nullable=False)
    place_lng: Mapped[float] = mapped_column(Float, nullable=False)
    place_image_url: Mapped[str] = mapped_column(Text, default="", nullable=False)
    place_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    place_review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    place_tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    arrival_time: Mapped[str] = mapped_column(String(10), nullable=False)
    departure_time: Mapped[str] = mapped_column(String(10), nullable=False)
    visit_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    travel_time_from_prev: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    travel_distance_from_prev: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="upcoming", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)

    journey: Mapped["JourneyModel"] = relationship("JourneyModel", back_populates="stops")
