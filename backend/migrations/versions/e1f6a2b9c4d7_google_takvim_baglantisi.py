"""Google Takvim baglantisi: sifreli yetki ve dolu/musait araliklari."""

import sqlalchemy as sa
from alembic import op

revision = "e1f6a2b9c4d7"
down_revision = "d3a7f1c92b60"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "google_calendar_connections",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("token_sifreli", sa.Text(), nullable=False),
        sa.Column("hesap_sifreli", sa.Text(), nullable=False),
        sa.Column("durum", sa.String(length=20), nullable=False),
        sa.Column("dolu_araliklar", sa.JSON(), nullable=False),
        sa.Column("musait_araliklar", sa.JSON(), nullable=True),
        sa.Column("son_senkron", sa.Integer(), nullable=True),
        sa.Column("son_deneme", sa.Integer(), nullable=True),
        sa.Column("son_hata", sa.String(length=40), nullable=True),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("guncelleme", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "durum IN ('aktif', 'koptu')",
            name="ck_google_calendar_connections_durum",
        ),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uzman_id"),
    )
    op.create_index(
        op.f("ix_google_calendar_connections_uzman_id"),
        "google_calendar_connections",
        ["uzman_id"],
        unique=True,
    )


def downgrade():
    op.drop_index(
        op.f("ix_google_calendar_connections_uzman_id"),
        table_name="google_calendar_connections",
    )
    op.drop_table("google_calendar_connections")
