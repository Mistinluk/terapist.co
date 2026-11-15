"""Profil gorunurlugu, engeller ve moderasyon raporlari."""

import sqlalchemy as sa
from alembic import op

revision = "c7a91e2d5f40"
down_revision = "b8f4c2d19e60"
branch_labels = None
depends_on = None


def upgrade():
    for column in [
        "davet_edeni_goster",
        "mesleki_agi_goster",
        "uzmanlik_iliskilerini_goster",
        "tavsiyeleri_goster",
        "kurucu_durumunu_goster",
    ]:
        op.add_column(
            "uzmanlar",
            sa.Column(
                column,
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
        )

    op.create_table(
        "therapist_blocks",
        sa.Column("engelleyen_uzman_id", sa.String(), nullable=False),
        sa.Column("engellenen_uzman_id", sa.String(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "engelleyen_uzman_id <> engellenen_uzman_id",
            name="ck_therapist_blocks_farkli_uzman",
        ),
        sa.ForeignKeyConstraint(["engellenen_uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(["engelleyen_uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("engelleyen_uzman_id", "engellenen_uzman_id"),
    )
    op.create_index(
        op.f("ix_therapist_blocks_olusturma"),
        "therapist_blocks",
        ["olusturma"],
        unique=False,
    )

    op.create_table(
        "moderation_reports",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("raporlayan_uzman_id", sa.String(), nullable=False),
        sa.Column("hedef_uzman_id", sa.String(), nullable=False),
        sa.Column("tur", sa.String(length=40), nullable=False),
        sa.Column("kaynak_id", sa.String(), nullable=False),
        sa.Column("aciklama", sa.String(length=500), nullable=False),
        sa.Column("durum", sa.String(), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("incelenme", sa.Integer(), nullable=True),
        sa.Column("inceleyen_kullanici_id", sa.String(), nullable=True),
        sa.CheckConstraint(
            "tur IN ('connection', 'false_relationship')",
            name="ck_moderation_reports_type",
        ),
        sa.CheckConstraint(
            "durum IN ('open', 'resolved', 'dismissed')",
            name="ck_moderation_reports_status",
        ),
        sa.ForeignKeyConstraint(["hedef_uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(
            ["inceleyen_kullanici_id"], ["kullanicilar.id"]
        ),
        sa.ForeignKeyConstraint(["raporlayan_uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in [
        "raporlayan_uzman_id",
        "hedef_uzman_id",
        "tur",
        "kaynak_id",
        "durum",
        "olusturma",
    ]:
        op.create_index(
            op.f(f"ix_moderation_reports_{column}"),
            "moderation_reports",
            [column],
            unique=False,
        )


def downgrade():
    for column in [
        "olusturma",
        "durum",
        "kaynak_id",
        "tur",
        "hedef_uzman_id",
        "raporlayan_uzman_id",
    ]:
        op.drop_index(
            op.f(f"ix_moderation_reports_{column}"),
            table_name="moderation_reports",
        )
    op.drop_table("moderation_reports")
    op.drop_index(
        op.f("ix_therapist_blocks_olusturma"),
        table_name="therapist_blocks",
    )
    op.drop_table("therapist_blocks")
    for column in [
        "kurucu_durumunu_goster",
        "tavsiyeleri_goster",
        "uzmanlik_iliskilerini_goster",
        "mesleki_agi_goster",
        "davet_edeni_goster",
    ]:
        op.drop_column("uzmanlar", column)
