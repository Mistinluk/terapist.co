"""Site geneli trafik olcum ve Google Analytics (GA4) ayarlari."""

import sqlalchemy as sa
from alembic import op

revision = "a9e4c1d7b203"
down_revision = "f2a8c3d4e5b1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "analytics_settings",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("ga_olcum_kimligi", sa.String(length=32), nullable=True),
        sa.Column("ga4_mulk_kimligi", sa.String(length=32), nullable=True),
        sa.Column("olcum_etkin", sa.Boolean(), nullable=False),
        sa.Column(
            "google_baglanti_durumu", sa.String(length=30), nullable=False
        ),
        sa.Column("google_kimlik_sifreli", sa.Text(), nullable=True),
        sa.Column(
            "google_hesap_etiketi", sa.String(length=160), nullable=True
        ),
        sa.Column("son_ga4_senkron", sa.Integer(), nullable=True),
        sa.Column("son_ga4_hata", sa.String(length=80), nullable=True),
        sa.Column("ga4_onbellek", sa.JSON(), nullable=True),
        sa.Column("guncelleme", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "google_baglanti_durumu IN "
            "('bagli_degil', 'oauth_bagli', 'hizmet_hesabi', 'koptu')",
            name="ck_analytics_settings_baglanti_durumu",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "traffic_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("zaman", sa.Integer(), nullable=False),
        sa.Column("tarih_gun", sa.String(length=10), nullable=False),
        sa.Column("ziyaretci_karma", sa.String(length=32), nullable=False),
        sa.Column("olay_turu", sa.String(length=32), nullable=False),
        sa.Column("sayfa_yolu", sa.String(length=200), nullable=False),
        sa.Column("sayfa_turu", sa.String(length=32), nullable=False),
        sa.Column("uzman_id", sa.String(), nullable=True),
        sa.Column("kaynak_kategorisi", sa.String(length=32), nullable=False),
        sa.Column("kaynak_etiketi", sa.String(length=80), nullable=False),
        sa.Column("kaynak_alani", sa.String(length=120), nullable=False),
        sa.Column("utm_kaynak", sa.String(length=60), nullable=False),
        sa.Column("sehir", sa.String(length=80), nullable=False),
        sa.Column("ulke", sa.String(length=60), nullable=False),
        sa.Column("cihaz", sa.String(length=20), nullable=False),
        sa.CheckConstraint(
            "olay_turu IN ('page_view', 'profile_view', "
            "'directory_search', 'booking_drawer_open', 'booking_submitted', "
            "'resource_click')",
            name="ck_traffic_events_olay_turu",
        ),
        sa.CheckConstraint(
            "sayfa_turu IN ('ana_sayfa', 'dizin', 'terapist_profili', "
            "'yonlendirme', 'basvuru', 'diger')",
            name="ck_traffic_events_sayfa_turu",
        ),
        sa.CheckConstraint(
            "kaynak_kategorisi IN ('instagram', 'youtube', 'google', "
            "'linkedin', 'facebook', 'x', 'diger_site', 'platform_ici', "
            "'dogrudan')",
            name="ck_traffic_events_kaynak_kategorisi",
        ),
        sa.CheckConstraint(
            "cihaz IN ('masaustu', 'mobil', 'tablet', 'bilinmiyor')",
            name="ck_traffic_events_cihaz",
        ),
        sa.ForeignKeyConstraint(["uzman_id"], ["uzmanlar.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in [
        "zaman",
        "tarih_gun",
        "ziyaretci_karma",
        "olay_turu",
        "sayfa_turu",
        "uzman_id",
        "kaynak_kategorisi",
    ]:
        op.create_index(
            op.f(f"ix_traffic_events_{column}"),
            "traffic_events",
            [column],
            unique=False,
        )


def downgrade():
    for column in [
        "kaynak_kategorisi",
        "uzman_id",
        "sayfa_turu",
        "olay_turu",
        "ziyaretci_karma",
        "tarih_gun",
        "zaman",
    ]:
        op.drop_index(
            op.f(f"ix_traffic_events_{column}"), table_name="traffic_events"
        )
    op.drop_table("traffic_events")
    op.drop_table("analytics_settings")
