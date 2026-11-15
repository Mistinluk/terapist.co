"""Dogrulanmis website rozeti ve kisisel veri icermeyen olaylar."""

import sqlalchemy as sa
from alembic import op

revision = "b8f4c2d19e60"
down_revision = "a6d2e47c9b13"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "website_badges",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uzman_id"),
    )
    op.create_index(
        op.f("ix_website_badges_uzman_id"),
        "website_badges",
        ["uzman_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_website_badges_olusturma"),
        "website_badges",
        ["olusturma"],
        unique=False,
    )
    op.create_table(
        "website_badge_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("rozet_id", sa.String(), nullable=False),
        sa.Column("olay", sa.String(length=30), nullable=False),
        sa.Column("zaman", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "olay IN ('badge_created', 'badge_clicked')",
            name="ck_website_badge_events_event",
        ),
        sa.ForeignKeyConstraint(["rozet_id"], ["website_badges.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ["rozet_id", "olay", "zaman"]:
        op.create_index(
            op.f(f"ix_website_badge_events_{column}"),
            "website_badge_events",
            [column],
            unique=False,
        )


def downgrade():
    for column in ["zaman", "olay", "rozet_id"]:
        op.drop_index(
            op.f(f"ix_website_badge_events_{column}"),
            table_name="website_badge_events",
        )
    op.drop_table("website_badge_events")
    op.drop_index(
        op.f("ix_website_badges_olusturma"), table_name="website_badges"
    )
    op.drop_index(
        op.f("ix_website_badges_uzman_id"), table_name="website_badges"
    )
    op.drop_table("website_badges")
