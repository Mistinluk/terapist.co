"""Profesyonel baglanti ve iliski turu katalogu."""

import uuid

import sqlalchemy as sa
from alembic import op

revision = "8b1e6d4a92c7"
down_revision = "4f7c3a1d2e90"
branch_labels = None
depends_on = None


ILISKI_TURLERI = [
    ("colleague", "Meslektaş", True, 10),
    ("worked_together", "Birlikte çalıştık", True, 20),
    ("same_institution", "Aynı kurumda çalıştık", True, 30),
    ("training_colleague", "Aynı eğitim programındaydık", True, 40),
    ("supervision_relationship", "Süpervizyon ilişkisi", True, 50),
    (
        "professional_acquaintance",
        "Profesyonel tanışıklık",
        True,
        60,
    ),
    ("invited_to_platform", "Terapist.co'ya davet etti", False, 70),
]


def upgrade():
    op.create_table(
        "connection_relationship_types",
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("ad", sa.String(length=120), nullable=False),
        sa.Column("secilebilir", sa.Boolean(), nullable=False),
        sa.Column("aktif", sa.Boolean(), nullable=False),
        sa.Column("sira", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("slug"),
    )
    relationship_types = sa.table(
        "connection_relationship_types",
        sa.column("slug", sa.String()),
        sa.column("ad", sa.String()),
        sa.column("secilebilir", sa.Boolean()),
        sa.column("aktif", sa.Boolean()),
        sa.column("sira", sa.Integer()),
    )
    op.bulk_insert(
        relationship_types,
        [
            {
                "slug": slug,
                "ad": ad,
                "secilebilir": selectable,
                "aktif": True,
                "sira": order,
            }
            for slug, ad, selectable, order in ILISKI_TURLERI
        ],
    )
    op.create_table(
        "professional_connections",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("isteyen_uzman_id", sa.String(), nullable=False),
        sa.Column("alici_uzman_id", sa.String(), nullable=False),
        sa.Column("cift_anahtari", sa.String(length=73), nullable=False),
        sa.Column("iliski_turu", sa.String(length=60), nullable=False),
        sa.Column("durum", sa.String(), nullable=False),
        sa.Column("istek_zamani", sa.Integer(), nullable=False),
        sa.Column("yanit_zamani", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "isteyen_uzman_id <> alici_uzman_id",
            name="ck_professional_connections_farkli_uzman",
        ),
        sa.CheckConstraint(
            "durum IN ('pending', 'accepted', 'rejected', 'revoked')",
            name="ck_professional_connections_durum",
        ),
        sa.ForeignKeyConstraint(["alici_uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(
            ["iliski_turu"], ["connection_relationship_types.slug"]
        ),
        sa.ForeignKeyConstraint(["isteyen_uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cift_anahtari"),
    )
    for column in [
        "isteyen_uzman_id",
        "alici_uzman_id",
        "iliski_turu",
        "durum",
        "istek_zamani",
    ]:
        op.create_index(
            op.f(f"ix_professional_connections_{column}"),
            "professional_connections",
            [column],
            unique=False,
        )

    # Phase 1'de kabul edilmiş davetleri otomatik graph edge'ine dönüştürür.
    connection = op.get_bind()
    invitations = connection.execute(
        sa.text(
            "SELECT davet_eden_uzman_id, kabul_eden_uzman_id, "
            "olusturma, kabul FROM invitations "
            "WHERE durum = 'accepted' AND kabul_eden_uzman_id IS NOT NULL"
        )
    ).mappings()
    rows = []
    seen = set()
    for invitation in invitations:
        first = invitation["davet_eden_uzman_id"]
        second = invitation["kabul_eden_uzman_id"]
        pair = ":".join(sorted((first, second)))
        if first == second or pair in seen:
            continue
        seen.add(pair)
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "isteyen_uzman_id": first,
                "alici_uzman_id": second,
                "cift_anahtari": pair,
                "iliski_turu": "invited_to_platform",
                "durum": "accepted",
                "istek_zamani": invitation["olusturma"],
                "yanit_zamani": invitation["kabul"],
            }
        )
    if rows:
        professional_connections = sa.table(
            "professional_connections",
            sa.column("id", sa.String()),
            sa.column("isteyen_uzman_id", sa.String()),
            sa.column("alici_uzman_id", sa.String()),
            sa.column("cift_anahtari", sa.String()),
            sa.column("iliski_turu", sa.String()),
            sa.column("durum", sa.String()),
            sa.column("istek_zamani", sa.Integer()),
            sa.column("yanit_zamani", sa.Integer()),
        )
        op.bulk_insert(professional_connections, rows)


def downgrade():
    for column in [
        "istek_zamani",
        "durum",
        "iliski_turu",
        "alici_uzman_id",
        "isteyen_uzman_id",
    ]:
        op.drop_index(
            op.f(f"ix_professional_connections_{column}"),
            table_name="professional_connections",
        )
    op.drop_table("professional_connections")
    op.drop_table("connection_relationship_types")
