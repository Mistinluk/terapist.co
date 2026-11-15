"""Birleşik site içi bildirimler tablosu.

Revision ID: c7f2a8b1d904
Revises: b3d9f1a2c408
Create Date: 2026-11-14 00:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c7f2a8b1d904"
down_revision: str | Sequence[str] | None = "b3d9f1a2c408"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("alici_kullanici_id", sa.String(), nullable=False),
        sa.Column("gonderen_kullanici_id", sa.String(), nullable=True),
        sa.Column("randevu_id", sa.String(), nullable=True),
        sa.Column("tur", sa.String(length=32), nullable=False),
        sa.Column("baslik", sa.String(length=120), nullable=False),
        sa.Column("mesaj", sa.String(length=600), nullable=False),
        sa.Column("hedef_yol", sa.String(length=200), nullable=False),
        sa.Column("kaynak_anahtari", sa.String(length=120), nullable=True),
        sa.Column("okundu", sa.Boolean(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("okunma_zamani", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "tur IN ('yeni_randevu', 'randevu_hatirlatma', "
            "'sistem_hatirlatma', 'randevu_guncelleme', 'admin_notu')",
            name="ck_notifications_tur",
        ),
        sa.ForeignKeyConstraint(
            ["alici_kullanici_id"],
            ["kullanicilar.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["gonderen_kullanici_id"],
            ["kullanicilar.id"],
        ),
        sa.ForeignKeyConstraint(
            ["randevu_id"],
            ["randevular.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kaynak_anahtari"),
    )
    op.create_index(
        op.f("ix_notifications_alici_kullanici_id"),
        "notifications",
        ["alici_kullanici_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_okundu"),
        "notifications",
        ["okundu"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_olusturma"),
        "notifications",
        ["olusturma"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_randevu_id"),
        "notifications",
        ["randevu_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_notifications_randevu_id"), table_name="notifications"
    )
    op.drop_index(
        op.f("ix_notifications_olusturma"), table_name="notifications"
    )
    op.drop_index(op.f("ix_notifications_okundu"), table_name="notifications")
    op.drop_index(
        op.f("ix_notifications_alici_kullanici_id"),
        table_name="notifications",
    )
    op.drop_table("notifications")
