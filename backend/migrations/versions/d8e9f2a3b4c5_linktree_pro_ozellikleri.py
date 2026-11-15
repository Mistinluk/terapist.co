"""Linktree Pro kaynak motoru, bekleme listesi ve ozel tema ozellikleri.

Revision ID: d8e9f2a3b4c5
Revises: c7f2a8b1d904
Create Date: 2026-11-14 08:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f2a3b4c5"
down_revision: str | Sequence[str] | None = "c7f2a8b1d904"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "uzmanlar",
        sa.Column(
            "bekleme_listesi_acik",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "ozel_tema_yetkisi",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "tema_stili",
            sa.String(length=24),
            nullable=False,
            server_default="klasik",
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "vurgu_rengi",
            sa.String(length=7),
            nullable=False,
            server_default="#3459d1",
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "buton_stili",
            sa.String(length=16),
            nullable=False,
            server_default="yuvarlak",
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "terapistco_markasi_gizli",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    with op.batch_alter_table("profile_resources") as batch_op:
        batch_op.add_column(
            sa.Column(
                "vurgulu",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.add_column(
            sa.Column(
                "vurgu_etiketi",
                sa.String(length=40),
                nullable=False,
                server_default="",
            )
        )
        batch_op.add_column(
            sa.Column("baslangic_zamani", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("bitis_zamani", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("sifre_ozeti", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "medya_turu",
                sa.String(length=16),
                nullable=False,
                server_default="none",
            )
        )
        batch_op.add_column(
            sa.Column("medya_embed_url", sa.String(length=500), nullable=True)
        )
        batch_op.create_check_constraint(
            "ck_profile_resources_medya_turu",
            "medya_turu IN ('none', 'youtube', 'spotify')",
        )
    op.create_index(
        op.f("ix_profile_resources_baslangic_zamani"),
        "profile_resources",
        ["baslangic_zamani"],
        unique=False,
    )
    op.create_index(
        op.f("ix_profile_resources_bitis_zamani"),
        "profile_resources",
        ["bitis_zamani"],
        unique=False,
    )

    op.create_table(
        "waitlist_entries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("danisan_sifreli", sa.Text(), nullable=False),
        sa.Column(
            "tercih_format",
            sa.String(length=20),
            nullable=False,
            server_default="farketmez",
        ),
        sa.Column(
            "tercih_zaman",
            sa.String(length=20),
            nullable=False,
            server_default="esnek",
        ),
        sa.Column(
            "durum",
            sa.String(length=24),
            nullable=False,
            server_default="bekliyor",
        ),
        sa.Column("aydinlatma_surumu", sa.String(length=40), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("guncelleme", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "tercih_format IN ('farketmez', 'cevrim_ici', 'yuz_yuze')",
            name="ck_waitlist_entries_format",
        ),
        sa.CheckConstraint(
            "tercih_zaman IN "
            "('esnek', 'sabah', 'ogleden_sonra', 'aksam', 'hafta_sonu')",
            name="ck_waitlist_entries_zaman",
        ),
        sa.CheckConstraint(
            "durum IN ('bekliyor', 'iletisime_gecildi', 'kapandi')",
            name="ck_waitlist_entries_durum",
        ),
        sa.ForeignKeyConstraint(
            ["uzman_id"], ["uzmanlar.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_waitlist_entries_uzman_id"),
        "waitlist_entries",
        ["uzman_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_waitlist_entries_durum"),
        "waitlist_entries",
        ["durum"],
        unique=False,
    )
    op.create_index(
        op.f("ix_waitlist_entries_olusturma"),
        "waitlist_entries",
        ["olusturma"],
        unique=False,
    )

    with op.batch_alter_table("traffic_events") as batch_op:
        batch_op.add_column(
            sa.Column("hedef_kaynak_id", sa.String(length=36), nullable=True)
        )
        batch_op.drop_constraint("ck_traffic_events_olay_turu", type_="check")
        batch_op.create_check_constraint(
            "ck_traffic_events_olay_turu",
            "olay_turu IN ('page_view', 'profile_view', "
            "'directory_search', 'booking_drawer_open', 'booking_submitted', "
            "'resource_click', 'link_unlock', 'waitlist_submitted', "
            "'embed_play', 'qr_scan')",
        )
    op.create_index(
        op.f("ix_traffic_events_hedef_kaynak_id"),
        "traffic_events",
        ["hedef_kaynak_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_traffic_events_hedef_kaynak_id"),
        table_name="traffic_events",
    )
    with op.batch_alter_table("traffic_events") as batch_op:
        batch_op.drop_constraint("ck_traffic_events_olay_turu", type_="check")
        batch_op.create_check_constraint(
            "ck_traffic_events_olay_turu",
            "olay_turu IN ('page_view', 'profile_view', "
            "'directory_search', 'booking_drawer_open', 'booking_submitted', "
            "'resource_click')",
        )
        batch_op.drop_column("hedef_kaynak_id")

    op.drop_index(
        op.f("ix_waitlist_entries_olusturma"), table_name="waitlist_entries"
    )
    op.drop_index(
        op.f("ix_waitlist_entries_durum"), table_name="waitlist_entries"
    )
    op.drop_index(
        op.f("ix_waitlist_entries_uzman_id"), table_name="waitlist_entries"
    )
    op.drop_table("waitlist_entries")

    op.drop_index(
        op.f("ix_profile_resources_bitis_zamani"),
        table_name="profile_resources",
    )
    op.drop_index(
        op.f("ix_profile_resources_baslangic_zamani"),
        table_name="profile_resources",
    )
    with op.batch_alter_table("profile_resources") as batch_op:
        batch_op.drop_constraint(
            "ck_profile_resources_medya_turu", type_="check"
        )
        batch_op.drop_column("medya_embed_url")
        batch_op.drop_column("medya_turu")
        batch_op.drop_column("sifre_ozeti")
        batch_op.drop_column("bitis_zamani")
        batch_op.drop_column("baslangic_zamani")
        batch_op.drop_column("vurgu_etiketi")
        batch_op.drop_column("vurgulu")

    for col in [
        "terapistco_markasi_gizli",
        "buton_stili",
        "vurgu_rengi",
        "tema_stili",
        "ozel_tema_yetkisi",
        "bekleme_listesi_acik",
    ]:
        op.drop_column("uzmanlar", col)
