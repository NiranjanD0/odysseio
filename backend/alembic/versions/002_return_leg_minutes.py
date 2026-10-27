"""Add return_leg_minutes to journeys and create journeys.return_leg_minutes column.

Revision ID: 002_return_leg_minutes
Revises: 001
Create Date: 2026-10-28
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "journeys",
        sa.Column("return_leg_minutes", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("journeys", "return_leg_minutes")
