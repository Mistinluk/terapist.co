"""Arama için görüşme dilleri."""

import sqlalchemy as sa
from alembic import op

revision = "a1c6f9d42e30"
down_revision = "f4d82c6a9b10"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "uzmanlar",
        sa.Column(
            "diller",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.execute("UPDATE uzmanlar SET diller = '[\"Türkçe\"]'")


def downgrade():
    op.drop_column("uzmanlar", "diller")
