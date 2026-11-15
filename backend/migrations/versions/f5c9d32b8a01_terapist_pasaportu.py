"""Terapist pasaportu kullanici adi ve uyelik tarihi."""

import re
import time
import unicodedata

import sqlalchemy as sa
from alembic import op

revision = "f5c9d32b8a01"
down_revision = "e4b8c21a7f90"
branch_labels = None
depends_on = None


def _slug(ad: str) -> str:
    translated = ad.lower().translate(str.maketrans("çğıöşü", "cgiosu"))
    normalized = unicodedata.normalize("NFKD", translated)
    ascii_name = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )
    value = re.sub(r"[^a-z0-9]+", "-", ascii_name).strip("-")
    return (value or "terapist")[:70].rstrip("-")


def upgrade():
    now = int(time.time())
    op.add_column(
        "uzmanlar",
        sa.Column("kullanici_adi", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "uye_olma",
            sa.Integer(),
            nullable=False,
            server_default=str(now),
        ),
    )
    bind = op.get_bind()
    experts = bind.execute(
        sa.text("SELECT id, ad FROM uzmanlar ORDER BY id")
    ).mappings()
    used: set[str] = set()
    for expert in experts:
        base = _slug(expert["ad"])
        username = base
        suffix = 2
        while username in used:
            username = f"{base[: 79 - len(str(suffix))]}-{suffix}"
            suffix += 1
        used.add(username)
        sent = bind.execute(
            sa.text(
                "SELECT gonderilme FROM therapist_verifications "
                "WHERE uzman_id = :uzman_id"
            ),
            {"uzman_id": expert["id"]},
        ).scalar()
        bind.execute(
            sa.text(
                "UPDATE uzmanlar SET kullanici_adi = :username, "
                "uye_olma = :joined WHERE id = :uzman_id"
            ),
            {
                "username": username,
                "joined": sent or now,
                "uzman_id": expert["id"],
            },
        )
    with op.batch_alter_table("uzmanlar") as batch:
        batch.alter_column(
            "kullanici_adi",
            existing_type=sa.String(length=80),
            nullable=False,
        )
        batch.alter_column(
            "uye_olma",
            existing_type=sa.Integer(),
            server_default=None,
        )
    op.create_index(
        "ix_uzmanlar_kullanici_adi",
        "uzmanlar",
        ["kullanici_adi"],
        unique=True,
    )


def downgrade():
    op.drop_index("ix_uzmanlar_kullanici_adi", table_name="uzmanlar")
    with op.batch_alter_table("uzmanlar") as batch:
        batch.drop_column("uye_olma")
        batch.drop_column("kullanici_adi")
