"""Google Takvim webhook (push notification) kanallari."""

import sqlalchemy as sa
from alembic import op

revision = "f2a8c3d4e5b1"
down_revision = "e1f6a2b9c4d7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "google_calendar_channels",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("baglanti_id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("takvim_id", sa.String(length=300), nullable=False),
        sa.Column("kaynak_id", sa.String(length=300), nullable=False),
        sa.Column("dogrulama_ozeti", sa.String(length=64), nullable=False),
        sa.Column("bitis", sa.Integer(), nullable=False),
        sa.Column("son_bildirim", sa.Integer(), nullable=True),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["baglanti_id"], ["google_calendar_connections.id"]
        ),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "baglanti_id",
            "takvim_id",
            name="uq_google_calendar_channels_baglanti_takvim",
        ),
    )
    for column in ["baglanti_id", "uzman_id", "bitis"]:
        op.create_index(
            op.f(f"ix_google_calendar_channels_{column}"),
            "google_calendar_channels",
            [column],
            unique=False,
        )


def downgrade():
    for column in ["bitis", "uzman_id", "baglanti_id"]:
        op.drop_index(
            op.f(f"ix_google_calendar_channels_{column}"),
            table_name="google_calendar_channels",
        )
    op.drop_table("google_calendar_channels")
