"""Danisan verisi icermeyen referral linkleri ve olaylari."""

import sqlalchemy as sa
from alembic import op

revision = "d7e3a91b54f2"
down_revision = "c2a94f8e61d3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "client_referrals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("yonlendiren_uzman_id", sa.String(), nullable=False),
        sa.Column("token_ozeti", sa.String(length=64), nullable=False),
        sa.Column("neden", sa.String(length=40), nullable=False),
        sa.Column("durum", sa.String(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("sure_bitimi", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "neden IN ('schedule_full', 'outside_specialty', 'age_group', "
            "'location', 'budget', 'therapy_format', 'psychiatry', 'other')",
            name="ck_client_referrals_reason",
        ),
        sa.CheckConstraint(
            "durum IN ('active', 'expired', 'revoked')",
            name="ck_client_referrals_status",
        ),
        sa.ForeignKeyConstraint(["yonlendiren_uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_ozeti"),
    )
    for column in [
        "yonlendiren_uzman_id",
        "neden",
        "durum",
        "olusturma",
        "sure_bitimi",
    ]:
        op.create_index(
            op.f(f"ix_client_referrals_{column}"),
            "client_referrals",
            [column],
            unique=False,
        )
    op.create_table(
        "referral_targets",
        sa.Column("yonlendirme_id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("sira", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(["yonlendirme_id"], ["client_referrals.id"]),
        sa.PrimaryKeyConstraint("yonlendirme_id", "uzman_id"),
    )
    op.create_table(
        "referral_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("yonlendirme_id", sa.String(), nullable=False),
        sa.Column("olay", sa.String(length=50), nullable=False),
        sa.Column("hedef_uzman_id", sa.String(), nullable=True),
        sa.Column("zaman", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "olay IN ('referral_created', 'referral_opened', "
            "'profile_clicked_from_referral')",
            name="ck_referral_events_event",
        ),
        sa.ForeignKeyConstraint(["hedef_uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(["yonlendirme_id"], ["client_referrals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ["yonlendirme_id", "olay", "hedef_uzman_id", "zaman"]:
        op.create_index(
            op.f(f"ix_referral_events_{column}"),
            "referral_events",
            [column],
            unique=False,
        )


def downgrade():
    for column in ["zaman", "hedef_uzman_id", "olay", "yonlendirme_id"]:
        op.drop_index(
            op.f(f"ix_referral_events_{column}"),
            table_name="referral_events",
        )
    op.drop_table("referral_events")
    op.drop_table("referral_targets")
    for column in [
        "sure_bitimi",
        "olusturma",
        "durum",
        "neden",
        "yonlendiren_uzman_id",
    ]:
        op.drop_index(
            op.f(f"ix_client_referrals_{column}"),
            table_name="client_referrals",
        )
    op.drop_table("client_referrals")
