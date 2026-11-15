"""Tavsiyeleri uzmanlik alanina bagla."""

import sqlalchemy as sa
from alembic import op

revision = "c2a94f8e61d3"
down_revision = "8b1e6d4a92c7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "tavsiyeler",
        sa.Column(
            "uzmanlik",
            sa.String(length=100),
            server_default="Genel yönlendirme",
            nullable=False,
        ),
    )
    op.add_column(
        "tavsiyeler",
        sa.Column(
            "olusturma", sa.Integer(), server_default="0", nullable=False
        ),
    )


def downgrade():
    op.drop_column("tavsiyeler", "olusturma")
    op.drop_column("tavsiyeler", "uzmanlik")
