"""Yönlendirmelere anonim görüntülenme sayacı ekle."""

import sqlalchemy as sa
from alembic import op

revision = "e8b37a4c6d21"
down_revision = "c7a91e2d5f40"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("client_referrals") as batch:
        batch.add_column(
            sa.Column(
                "view_count",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )
        batch.create_check_constraint(
            "ck_client_referrals_view_count",
            "view_count >= 0",
        )


def downgrade():
    with op.batch_alter_table("client_referrals") as batch:
        batch.drop_constraint(
            "ck_client_referrals_view_count",
            type_="check",
        )
        batch.drop_column("view_count")
