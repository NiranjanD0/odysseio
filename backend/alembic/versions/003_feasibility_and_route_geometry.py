"""Add feasibility, owner_id, and route_geometry to journeys.

Revision ID: 003
Revises: 002
Create Date: 2026-11-01
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "journeys",
        sa.Column("owner_id", sa.String(100), nullable=False, server_default="anonymous"),
    )
    op.add_column(
        "journeys",
        sa.Column("feasible", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "journeys",
        sa.Column("available_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "journeys",
        sa.Column("required_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "journeys",
        sa.Column("spare_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "journeys",
        sa.Column("feasibility_status", sa.String(100), nullable=False, server_default="FEASIBLE"),
    )
    op.add_column(
        "journeys",
        sa.Column("route_geometry", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("journeys", "route_geometry")
    op.drop_column("journeys", "feasibility_status")
    op.drop_column("journeys", "spare_minutes")
    op.drop_column("journeys", "required_minutes")
    op.drop_column("journeys", "available_minutes")
    op.drop_column("journeys", "feasible")
    op.drop_column("journeys", "owner_id")
