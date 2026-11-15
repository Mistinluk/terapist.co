"""Profil yaklaşımı, seans süresi, sosyal bağlantılar ve kaynaklar."""

import sqlalchemy as sa
from alembic import op

revision = "9c27b47f1a80"
down_revision = "b2e7a31c8d44"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "uzmanlar",
        sa.Column(
            "terapi_yaklasimi", sa.Text(), nullable=False, server_default=""
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "seans_suresi_dakika",
            sa.Integer(),
            nullable=False,
            server_default="60",
        ),
    )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "sosyal_baglantilar",
            sa.JSON(),
            nullable=False,
            server_default="{}",
        ),
    )
    op.create_table(
        "profile_resources",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "uzman_id",
            sa.String(),
            sa.ForeignKey("uzmanlar.id"),
            nullable=False,
        ),
        sa.Column("baslik", sa.String(120), nullable=False),
        sa.Column(
            "aciklama", sa.String(240), nullable=False, server_default=""
        ),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column(
            "kategori", sa.String(20), nullable=False, server_default="diger"
        ),
        sa.Column("sira", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "tiklama_sayisi", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("olusturma", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "kategori IN ('yazi', 'kitap', 'podcast', 'diger')",
            name="ck_profile_resources_kategori",
        ),
        sa.CheckConstraint("sira >= 0", name="ck_profile_resources_sira"),
        sa.CheckConstraint(
            "tiklama_sayisi >= 0", name="ck_profile_resources_clicks"
        ),
    )
    op.create_index(
        "ix_profile_resources_uzman_id", "profile_resources", ["uzman_id"]
    )
    op.create_index(
        "ix_profile_resources_olusturma", "profile_resources", ["olusturma"]
    )


def downgrade():
    op.drop_index(
        "ix_profile_resources_olusturma", table_name="profile_resources"
    )
    op.drop_index(
        "ix_profile_resources_uzman_id", table_name="profile_resources"
    )
    op.drop_table("profile_resources")
    op.drop_column("uzmanlar", "sosyal_baglantilar")
    op.drop_column("uzmanlar", "seans_suresi_dakika")
    op.drop_column("uzmanlar", "terapi_yaklasimi")
