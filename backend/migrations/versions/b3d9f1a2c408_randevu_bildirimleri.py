"""Randevu bildirimleri tablosu (yönetici bildirim ve eskalasyon takibi).

Revision ID: b3d9f1a2c408
Revises: a9e4c1d7b203
Create Date: 2026-11-14 00:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3d9f1a2c408"
down_revision: str | Sequence[str] | None = "a9e4c1d7b203"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "appointment_notifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("randevu_id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("gonderen_kullanici_id", sa.String(), nullable=True),
        sa.Column("tur", sa.String(length=32), nullable=False),
        sa.Column("mesaj", sa.String(length=500), nullable=False),
        sa.Column("okundu", sa.Boolean(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("okunma_zamani", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "tur IN ('hatirlatma', 'eskalasyon', 'durum_degisikligi')",
            name="ck_appointment_notifications_tur",
        ),
        sa.ForeignKeyConstraint(
            ["gonderen_kullanici_id"],
            ["kullanicilar.id"],
        ),
        sa.ForeignKeyConstraint(
            ["randevu_id"],
            ["randevular.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["uzman_id"],
            ["uzmanlar.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_appointment_notifications_okundu"),
        "appointment_notifications",
        ["okundu"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_notifications_olusturma"),
        "appointment_notifications",
        ["olusturma"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_notifications_randevu_id"),
        "appointment_notifications",
        ["randevu_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_appointment_notifications_uzman_id"),
        "appointment_notifications",
        ["uzman_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_appointment_notifications_uzman_id"),
        table_name="appointment_notifications",
    )
    op.drop_index(
        op.f("ix_appointment_notifications_randevu_id"),
        table_name="appointment_notifications",
    )
    op.drop_index(
        op.f("ix_appointment_notifications_olusturma"),
        table_name="appointment_notifications",
    )
    op.drop_index(
        op.f("ix_appointment_notifications_okundu"),
        table_name="appointment_notifications",
    )
    op.drop_table("appointment_notifications")
