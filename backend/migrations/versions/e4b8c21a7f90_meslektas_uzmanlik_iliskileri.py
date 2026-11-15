"""Meslektas uzmanlik iliskileri."""

import sqlalchemy as sa
from alembic import op

revision = "e4b8c21a7f90"
down_revision = "d7e3a91b54f2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "peer_specialty_associations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("iliskilendiren_uzman_id", sa.String(), nullable=False),
        sa.Column("hedef_uzman_id", sa.String(), nullable=False),
        sa.Column("uzmanlik", sa.String(length=100), nullable=False),
        sa.Column("profesyonel_baglam", sa.String(length=40), nullable=False),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.Column("guncelleme", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "iliskilendiren_uzman_id <> hedef_uzman_id",
            name="ck_peer_specialty_associations_farkli_uzman",
        ),
        sa.CheckConstraint(
            "profesyonel_baglam IN ('worked_together', 'training', "
            "'supervision', 'referral_relationship', 'professional_work')",
            name="ck_peer_specialty_associations_context",
        ),
        sa.ForeignKeyConstraint(["hedef_uzman_id"], ["uzmanlar.id"]),
        sa.ForeignKeyConstraint(["iliskilendiren_uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "iliskilendiren_uzman_id",
            "hedef_uzman_id",
            "uzmanlik",
            name="uq_peer_specialty_association",
        ),
    )
    for column in [
        "iliskilendiren_uzman_id",
        "hedef_uzman_id",
        "uzmanlik",
        "profesyonel_baglam",
        "olusturma",
        "guncelleme",
    ]:
        op.create_index(
            op.f(f"ix_peer_specialty_associations_{column}"),
            "peer_specialty_associations",
            [column],
            unique=False,
        )


def downgrade():
    for column in [
        "guncelleme",
        "olusturma",
        "profesyonel_baglam",
        "uzmanlik",
        "hedef_uzman_id",
        "iliskilendiren_uzman_id",
    ]:
        op.drop_index(
            op.f(f"ix_peer_specialty_associations_{column}"),
            table_name="peer_specialty_associations",
        )
    op.drop_table("peer_specialty_associations")
