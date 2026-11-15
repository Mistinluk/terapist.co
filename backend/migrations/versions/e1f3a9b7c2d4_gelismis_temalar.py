"""Gelismis profil tema tarzlari, tipografi ve yuzey ozellikleri.

Revision ID: e1f3a9b7c2d4
Revises: d8e9f2a3b4c5
Create Date: 2026-11-14 09:26:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e1f3a9b7c2d4"
down_revision: str | Sequence[str] | None = "d8e9f2a3b4c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "uzmanlar",
        sa.Column(
            "tasarim_tarzi",
            sa.String(length=24),
            nullable=False,
            server_default="klinik_modern",
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "yazi_tipi",
            sa.String(length=24),
            nullable=False,
            server_default="modern_sans",
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "yuzey_stili",
            sa.String(length=24),
            nullable=False,
            server_default="temiz",
        ),
    )


def downgrade() -> None:
    for col in ["yuzey_stili", "yazi_tipi", "tasarim_tarzi"]:
        op.drop_column("uzmanlar", col)
