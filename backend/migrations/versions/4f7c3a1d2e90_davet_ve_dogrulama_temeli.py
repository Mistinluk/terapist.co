"""Davet, terapist dogrulama ve kurucu uye temeli."""

import time
import uuid

import sqlalchemy as sa
from alembic import op

revision = "4f7c3a1d2e90"
down_revision = "9100372fb039"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "uzmanlar",
        sa.Column(
            "davet_limiti",
            sa.Integer(),
            server_default="3",
            nullable=False,
        ),
    )
    op.create_table(
        "therapist_verifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("durum", sa.String(), nullable=False),
        sa.Column("gonderilme", sa.Integer(), nullable=False),
        sa.Column("incelenme", sa.Integer(), nullable=True),
        sa.Column("inceleyen_kullanici_id", sa.String(), nullable=True),
        sa.Column("notlar", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "durum IN ('pending', 'verified', 'rejected')",
            name="ck_therapist_verifications_durum",
        ),
        sa.ForeignKeyConstraint(
            ["inceleyen_kullanici_id"], ["kullanicilar.id"]
        ),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uzman_id"),
    )
    op.create_index(
        op.f("ix_therapist_verifications_durum"),
        "therapist_verifications",
        ["durum"],
        unique=False,
    )
    op.create_index(
        op.f("ix_therapist_verifications_uzman_id"),
        "therapist_verifications",
        ["uzman_id"],
        unique=False,
    )
    op.create_table(
        "invitations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("davet_eden_uzman_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("ad", sa.String(length=150), nullable=False),
        sa.Column("token_ozeti", sa.String(length=64), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("sure_bitimi", sa.Integer(), nullable=False),
        sa.Column("kabul", sa.Integer(), nullable=True),
        sa.Column("durum", sa.String(), nullable=False),
        sa.Column("kabul_eden_uzman_id", sa.String(), nullable=True),
        sa.Column("iliski_turu", sa.String(), nullable=False),
        sa.CheckConstraint(
            "durum IN ('pending', 'accepted', 'expired', 'revoked')",
            name="ck_invitations_durum",
        ),
        sa.ForeignKeyConstraint(["davet_eden_uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(["kabul_eden_uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kabul_eden_uzman_id"),
        sa.UniqueConstraint("token_ozeti"),
    )
    for column in [
        "davet_eden_uzman_id",
        "email",
        "olusturma",
        "sure_bitimi",
        "durum",
    ]:
        op.create_index(
            op.f(f"ix_invitations_{column}"),
            "invitations",
            [column],
            unique=False,
        )
    op.create_index(
        "uq_aktif_davet_email",
        "invitations",
        ["email"],
        unique=True,
        sqlite_where=sa.text("durum IN ('pending', 'accepted')"),
        postgresql_where=sa.text("durum IN ('pending', 'accepted')"),
    )
    op.create_table(
        "founding_members",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=False),
        sa.Column("kurucu_no", sa.Integer(), nullable=False),
        sa.Column("verilme", sa.Integer(), nullable=False),
        sa.Column("veren_kullanici_id", sa.String(), nullable=False),
        sa.CheckConstraint("kurucu_no > 0", name="ck_founding_members_no"),
        sa.ForeignKeyConstraint(["veren_kullanici_id"], ["kullanicilar.id"]),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kurucu_no"),
        sa.UniqueConstraint("uzman_id"),
    )
    op.create_index(
        op.f("ix_founding_members_uzman_id"),
        "founding_members",
        ["uzman_id"],
        unique=False,
    )

    # Mevcut yayın durumunu ayrıntılı doğrulama modeline kayıpsız taşır.
    connection = op.get_bind()
    now = int(time.time())
    profiles = connection.execute(
        sa.text("SELECT id, onayli FROM uzmanlar")
    ).mappings()
    rows = [
        {
            "id": str(uuid.uuid4()),
            "uzman_id": profile["id"],
            "durum": "verified" if profile["onayli"] else "pending",
            "gonderilme": now,
            "incelenme": now if profile["onayli"] else None,
            "inceleyen_kullanici_id": None,
            "notlar": "",
        }
        for profile in profiles
    ]
    if rows:
        table = sa.table(
            "therapist_verifications",
            sa.column("id", sa.String()),
            sa.column("uzman_id", sa.String()),
            sa.column("durum", sa.String()),
            sa.column("gonderilme", sa.Integer()),
            sa.column("incelenme", sa.Integer()),
            sa.column("inceleyen_kullanici_id", sa.String()),
            sa.column("notlar", sa.Text()),
        )
        op.bulk_insert(table, rows)


def downgrade():
    op.drop_index(
        op.f("ix_founding_members_uzman_id"),
        table_name="founding_members",
    )
    op.drop_table("founding_members")
    op.drop_index(
        "uq_aktif_davet_email",
        table_name="invitations",
        sqlite_where=sa.text("durum IN ('pending', 'accepted')"),
        postgresql_where=sa.text("durum IN ('pending', 'accepted')"),
    )
    for column in [
        "durum",
        "sure_bitimi",
        "olusturma",
        "email",
        "davet_eden_uzman_id",
    ]:
        op.drop_index(
            op.f(f"ix_invitations_{column}"), table_name="invitations"
        )
    op.drop_table("invitations")
    op.drop_index(
        op.f("ix_therapist_verifications_uzman_id"),
        table_name="therapist_verifications",
    )
    op.drop_index(
        op.f("ix_therapist_verifications_durum"),
        table_name="therapist_verifications",
    )
    op.drop_table("therapist_verifications")
    op.drop_column("uzmanlar", "davet_limiti")
