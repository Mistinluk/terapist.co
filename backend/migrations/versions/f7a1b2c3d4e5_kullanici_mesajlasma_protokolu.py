"""Kullanicilar arasi mesajlasma ve yonetici iletisim protokolu tablolari.

Revision ID: f7a1b2c3d4e5
Revises: e1f3a9b7c2d4
Create Date: 2026-11-14 20:46:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f7a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "e1f3a9b7c2d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "message_threads",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("baslik", sa.String(length=120), nullable=False),
        sa.Column("katilimci_a_id", sa.String(), nullable=False),
        sa.Column("katilimci_b_id", sa.String(), nullable=False),
        sa.Column("son_mesaj_zamani", sa.Integer(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "katilimci_a_id <> katilimci_b_id",
            name="ck_message_threads_farkli_kullanici",
        ),
        sa.ForeignKeyConstraint(
            ["katilimci_a_id"],
            ["kullanicilar.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["katilimci_b_id"],
            ["kullanicilar.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_message_threads_katilimci_a_id"),
        "message_threads",
        ["katilimci_a_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_message_threads_katilimci_b_id"),
        "message_threads",
        ["katilimci_b_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_message_threads_son_mesaj_zamani"),
        "message_threads",
        ["son_mesaj_zamani"],
        unique=False,
    )
    op.create_index(
        op.f("ix_message_threads_olusturma"),
        "message_threads",
        ["olusturma"],
        unique=False,
    )

    op.create_table(
        "thread_messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("konu_id", sa.String(), nullable=False),
        sa.Column("gonderen_kullanici_id", sa.String(), nullable=False),
        sa.Column("alici_kullanici_id", sa.String(), nullable=False),
        sa.Column("icerik", sa.String(length=2000), nullable=False),
        sa.Column("okundu", sa.Boolean(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("okunma_zamani", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["konu_id"],
            ["message_threads.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["gonderen_kullanici_id"],
            ["kullanicilar.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["alici_kullanici_id"],
            ["kullanicilar.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_thread_messages_konu_id"),
        "thread_messages",
        ["konu_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_thread_messages_gonderen_kullanici_id"),
        "thread_messages",
        ["gonderen_kullanici_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_thread_messages_alici_kullanici_id"),
        "thread_messages",
        ["alici_kullanici_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_thread_messages_okundu"),
        "thread_messages",
        ["okundu"],
        unique=False,
    )
    op.create_index(
        op.f("ix_thread_messages_olusturma"),
        "thread_messages",
        ["olusturma"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_thread_messages_olusturma"), table_name="thread_messages"
    )
    op.drop_index(
        op.f("ix_thread_messages_okundu"), table_name="thread_messages"
    )
    op.drop_index(
        op.f("ix_thread_messages_alici_kullanici_id"),
        table_name="thread_messages",
    )
    op.drop_index(
        op.f("ix_thread_messages_gonderen_kullanici_id"),
        table_name="thread_messages",
    )
    op.drop_index(
        op.f("ix_thread_messages_konu_id"), table_name="thread_messages"
    )
    op.drop_table("thread_messages")

    op.drop_index(
        op.f("ix_message_threads_olusturma"), table_name="message_threads"
    )
    op.drop_index(
        op.f("ix_message_threads_son_mesaj_zamani"),
        table_name="message_threads",
    )
    op.drop_index(
        op.f("ix_message_threads_katilimci_b_id"),
        table_name="message_threads",
    )
    op.drop_index(
        op.f("ix_message_threads_katilimci_a_id"),
        table_name="message_threads",
    )
    op.drop_table("message_threads")
