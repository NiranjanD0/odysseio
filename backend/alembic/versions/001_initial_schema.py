"""initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-27 23:45:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # journeys table
    op.create_table(
        "journeys",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False, index=True),
        sa.Column("date", sa.String(length=20), nullable=False),
        sa.Column("start_time", sa.String(length=10), nullable=False),
        sa.Column("return_deadline", sa.String(length=10), nullable=False),
        sa.Column("safety_buffer_minutes", sa.Integer(), nullable=False, default=15),
        sa.Column("pace", sa.String(length=50), nullable=False, default="balanced"),
        sa.Column("transport", sa.String(length=50), nullable=False, default="walking"),
        sa.Column("total_minutes", sa.Integer(), nullable=False, default=0),
        sa.Column("exploration_minutes", sa.Integer(), nullable=False, default=0),
        sa.Column("travel_minutes", sa.Integer(), nullable=False, default=0),
        sa.Column("interests", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, default="upcoming"),
        sa.Column("center_lat", sa.Float(), nullable=False),
        sa.Column("center_lng", sa.Float(), nullable=False),
        sa.Column("start_lat", sa.Float(), nullable=True),
        sa.Column("start_lng", sa.Float(), nullable=True),
        sa.Column("return_lat", sa.Float(), nullable=True),
        sa.Column("return_lng", sa.Float(), nullable=True),
        sa.Column("warnings", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # itinerary_stops table
    op.create_table(
        "itinerary_stops",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "journey_id",
            sa.String(length=36),
            sa.ForeignKey("journeys.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("stop_order", sa.Integer(), nullable=False),
        sa.Column("place_id", sa.String(length=100), nullable=False),
        sa.Column("place_name", sa.String(length=255), nullable=False),
        sa.Column("place_address", sa.String(length=500), nullable=False, default=""),
        sa.Column("place_category", sa.String(length=50), nullable=False),
        sa.Column("place_lat", sa.Float(), nullable=False),
        sa.Column("place_lng", sa.Float(), nullable=False),
        sa.Column("place_image_url", sa.Text(), nullable=False, default=""),
        sa.Column("place_rating", sa.Float(), nullable=False, default=0.0),
        sa.Column("place_review_count", sa.Integer(), nullable=False, default=0),
        sa.Column("place_tags", sa.JSON(), nullable=False),
        sa.Column("arrival_time", sa.String(length=10), nullable=False),
        sa.Column("departure_time", sa.String(length=10), nullable=False),
        sa.Column("visit_minutes", sa.Integer(), nullable=False, default=30),
        sa.Column("travel_time_from_prev", sa.Integer(), nullable=False, default=0),
        sa.Column("travel_distance_from_prev", sa.Integer(), nullable=False, default=0),
        sa.Column("status", sa.String(length=50), nullable=False, default="upcoming"),
        sa.Column("notes", sa.Text(), nullable=False, default=""),
    )

    # saved_places table
    op.create_table(
        "saved_places",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("place_id", sa.String(length=100), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False, default=""),
        sa.Column("country", sa.String(length=100), nullable=False, default=""),
        sa.Column("address", sa.String(length=500), nullable=False, default=""),
        sa.Column("category", sa.String(length=50), nullable=False, default="culture"),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False, default=""),
        sa.Column("rating", sa.Float(), nullable=False, default=0.0),
        sa.Column("review_count", sa.Integer(), nullable=False, default=0),
        sa.Column("estimated_visit_minutes", sa.Integer(), nullable=False, default=45),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, default=""),
        sa.Column("saved_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("saved_places")
    op.drop_table("itinerary_stops")
    op.drop_table("journeys")
