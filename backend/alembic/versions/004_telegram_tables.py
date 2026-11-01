"""Add telegram_links and telegram_link_codes tables

Revision ID: 003_telegram_tables
Revises: 002
Create Date: 2026-11-01
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_telegram_tables"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "telegram_links",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("owner_id", sa.String(length=100), nullable=False, index=True),
        sa.Column("telegram_chat_id", sa.String(length=100), nullable=False, index=True),
        sa.Column("telegram_user_id", sa.String(length=100), nullable=True),
        sa.Column("telegram_username", sa.String(length=100), nullable=True),
        sa.Column("notification_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("unlinked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "telegram_link_codes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("code_hash", sa.String(length=64), nullable=False, index=True),
        sa.Column("owner_id", sa.String(length=100), nullable=False, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("telegram_link_codes")
    op.drop_table("telegram_links")
