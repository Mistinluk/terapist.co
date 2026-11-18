"""Randevuya özel takip anahtarı ve yeniden planlama talep zamanı."""

import sqlalchemy as sa
from alembic import op

revision = "bc42de56fa78"
down_revision = "ab31cd45ef67"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Eski kayıtları korur; eski randevulara tahmin edilebilir link vermez."""
    op.add_column(
        "randevular", sa.Column("takip_anahtar_ozeti", sa.String(64))
    )
    op.add_column("randevular", sa.Column("takip_son_kullanim", sa.Integer()))
    op.add_column("randevular", sa.Column("son_talep_zamani", sa.Integer()))


def downgrade() -> None:
    """Yalnızca takip bağlantısı ve son talep meta verisini kaldırır."""
    with op.batch_alter_table("randevular") as batch:
        batch.drop_column("son_talep_zamani")
        batch.drop_column("takip_son_kullanim")
        batch.drop_column("takip_anahtar_ozeti")
