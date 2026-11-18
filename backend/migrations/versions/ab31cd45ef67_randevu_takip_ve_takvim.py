"""Üyesiz danışan erişimi, sabit randevu süresi ve Google iş kuyruğu."""

import sqlalchemy as sa
from alembic import op

revision = "ab31cd45ef67"
down_revision = "a2b4c6d8e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Mevcut talepleri korur; eski kayıtlara danışan erişimi atamaz."""
    op.add_column("randevular", sa.Column("bitis", sa.Integer()))
    op.add_column(
        "randevular", sa.Column("danisan_oturum_ozeti", sa.String(64))
    )
    op.create_index(
        "ix_randevular_danisan_oturum_ozeti",
        "randevular",
        ["danisan_oturum_ozeti"],
    )
    op.execute(
        sa.text(
            "UPDATE randevular SET bitis = baslangic + 60 * COALESCE("
            "(SELECT seans_suresi_dakika FROM uzmanlar "
            "WHERE uzmanlar.id = randevular.uzman_id), 60)"
        )
    )
    op.create_table(
        "appointment_calendar_jobs",
        sa.Column("randevu_id", sa.String(), primary_key=True),
        sa.Column("baglanti_id", sa.String(), nullable=False),
        sa.Column("etkinlik_id", sa.String(64), nullable=False),
        sa.Column("hedef_durum", sa.String(20), nullable=False),
        sa.Column("durum", sa.String(20), nullable=False),
        sa.Column("deneme", sa.Integer(), nullable=False),
        sa.Column("sonraki_deneme", sa.Integer(), nullable=False),
        sa.Column("son_hata", sa.String(40)),
        sa.ForeignKeyConstraint(
            ["randevu_id"], ["randevular.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["baglanti_id"],
            ["google_calendar_connections.id"],
            ondelete="CASCADE",
        ),
    )
    for name in ("baglanti_id", "sonraki_deneme"):
        op.create_index(
            f"ix_appointment_calendar_jobs_{name}",
            "appointment_calendar_jobs",
            [name],
        )


def downgrade() -> None:
    """Takip ve eşitleme meta verisini kaldırır; talepler korunur."""
    op.drop_table("appointment_calendar_jobs")
    op.drop_index("ix_randevular_danisan_oturum_ozeti", "randevular")
    with op.batch_alter_table("randevular") as batch:
        batch.drop_column("danisan_oturum_ozeti")
        batch.drop_column("bitis")
