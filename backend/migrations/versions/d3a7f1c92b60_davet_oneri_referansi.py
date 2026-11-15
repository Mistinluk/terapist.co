"""Davetleri alan bazli meslektas onerileriyle iliskilendirir."""

import sqlalchemy as sa
from alembic import op

revision = "d3a7f1c92b60"
down_revision = "9c27b47f1a80"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "invitations",
        sa.Column("onerilen_uzmanlik", sa.String(length=100), nullable=True),
    )


def downgrade():
    op.drop_column("invitations", "onerilen_uzmanlik")
