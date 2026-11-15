"""Profil sayfasi icin acik kaynak / Unsplash arka plan gorseli alani.

Revision ID: a2b4c6d8e0f1
Revises: f7a1b2c3d4e5
Create Date: 2026-11-15 22:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a2b4c6d8e0f1"
down_revision: str | Sequence[str] | None = "f7a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "uzmanlar",
        sa.Column(
            "arka_plan_gorseli_url",
            sa.String(length=500),
            nullable=False,
            server_default="",
        ),
    )


def downgrade() -> None:
    op.drop_column("uzmanlar", "arka_plan_gorseli_url")
