"""Site ölçümü, kaynak ayrıştırma ve Google Analytics (GA4) testleri."""

import pytest
from sqlalchemy import select

from app import google_analytics
from app.analytics_service import kaynak_siniflandir
from app.config import get_settings
from app.models import AnalitikAyari, Denetim, TrafikOlayi, Uzman
from tests.conftest import login


def test_kaynak_siniflandir_sosyal_ve_arama():
    assert kaynak_siniflandir("https://l.instagram.com/abc")[0:2] == (
        "instagram",
        "Instagram",
    )
    assert kaynak_siniflandir("https://youtu.be/xyz")[0:2] == (
        "youtube",
        "YouTube",
    )
    assert kaynak_siniflandir("https://www.google.com.tr/search")[0:2] == (
        "google",
        "Google",
    )
    assert kaynak_siniflandir("", "")[0:2] == (
        "dogrudan",
        "Doğrudan / Bağlantı",
    )
    assert kaynak_siniflandir("", "instagram")[0:2] == (
        "instagram",
        "Instagram",
    )


def test_olcum_olaylari_ve_yonetim_vs_uzman_ayrimi(env, monkeypatch):
    monkeypatch.setattr(get_settings(), "ga_olcum_kimligi", "")
    client, factory, ids, _ = env
    with factory() as db:
        u0 = db.get(Uzman, ids[0])
        u1 = db.get(Uzman, ids[1])
        slug0 = u0.kullanici_adi
        slug1 = u1.kullanici_adi

    # Başlangıç yapılandırması açık ama GA kimliği henüz tanımlı değil.
    cfg = client.get("/api/analitik/yapilandirma")
    assert cfg.status_code == 200
    assert cfg.json() == {"olcum_etkin": True, "ga_olcum_kimligi": None}

    # Panel / yönetim yolları genel trafiğe eklenmez.
    assert (
        client.post(
            "/api/analitik/olcum",
            json={
                "olay_turu": "page_view",
                "sayfa_yolu": "/yonetim",
                "ziyaret_anahtari": "ziyaretci-admin-1",
            },
        ).status_code
        == 204
    )

    # Farklı kaynak ve konumlardan gerçek ziyaretler kaydedilir.
    olaylar = [
        (
            {
                "olay_turu": "page_view",
                "sayfa_yolu": "/",
                "referans_url": "https://l.instagram.com/?u=https://terapist.co",
                "ziyaret_anahtari": "ziyaretci-a-001",
                "cihaz": "mobil",
            },
            {"cf-ipcity": "Istanbul", "cf-ipcountry": "TR"},
        ),
        (
            {
                "olay_turu": "profile_view",
                "sayfa_yolu": f"/{slug0}",
                "uzman_kullanici_adi": slug0,
                "referans_url": "https://l.instagram.com/",
                "ziyaret_anahtari": "ziyaretci-a-001",
                "cihaz": "mobil",
            },
            {"cf-ipcity": "Istanbul", "cf-ipcountry": "TR"},
        ),
        (
            {
                "olay_turu": "profile_view",
                "sayfa_yolu": f"/{slug0}",
                "uzman_id": ids[0],
                "referans_url": "https://www.google.com/",
                "ziyaret_anahtari": "ziyaretci-b-002",
                "cihaz": "masaustu",
            },
            {"cf-ipcity": "Ankara", "cf-ipcountry": "TR"},
        ),
        (
            {
                "olay_turu": "booking_drawer_open",
                "sayfa_yolu": f"/{slug0}",
                "uzman_id": ids[0],
                "referans_url": "https://www.google.com/",
                "ziyaret_anahtari": "ziyaretci-b-002",
            },
            {"cf-ipcity": "Ankara", "cf-ipcountry": "TR"},
        ),
        (
            {
                "olay_turu": "profile_view",
                "sayfa_yolu": f"/{slug1}",
                "uzman_id": ids[1],
                "referans_url": "https://www.youtube.com/watch?v=123",
                "ziyaret_anahtari": "ziyaretci-c-003",
            },
            {"cf-ipcity": "Izmir", "cf-ipcountry": "TR"},
        ),
    ]
    for govde, baslik in olaylar:
        res = client.post("/api/analitik/olcum", json=govde, headers=baslik)
        assert res.status_code == 204, res.text

    with factory() as db:
        rows = list(db.scalars(select(TrafikOlayi)))
        assert all(not r.sayfa_yolu.startswith("/yonetim") for r in rows)
        assert len(rows) == 5
        # Ziyaretçi anahtarları düz metin saklanmaz, HMAC karmalanır.
        assert all("ziyaretci-a-001" not in r.ziyaretci_karma for r in rows)

    # Yetkisiz erişim engellenir.
    assert client.get("/api/yonetim/trafik-analitigi").status_code == 401
    assert client.get("/api/uzman/trafik-analitigi").status_code == 401

    # Terapist yalnızca kendi profil istatistiklerini görür.
    login(client, 0)
    assert client.get("/api/yonetim/trafik-analitigi").status_code == 403
    uzman_rapor = client.get("/api/uzman/trafik-analitigi?gun=30")
    assert uzman_rapor.status_code == 200
    u_data = uzman_rapor.json()
    assert u_data["profil_adresi"] == f"/{slug0}"
    assert u_data["ozet"]["profil_goruntuleme"] == 2
    assert u_data["ozet"]["tekil_ziyaretci"] == 2
    assert u_data["ozet"]["randevu_cekmece_acilisi"] == 1
    assert {k["anahtar"] for k in u_data["gelis_kaynaklari"]} == {
        "instagram",
        "google",
    }
    # İkinci uzmanın YouTube kaynağı sızmaz.
    assert all(k["anahtar"] != "youtube" for k in u_data["gelis_kaynaklari"])

    # Yönetici tüm platform trafiğini, konumları, en çok gezilen profilleri
    # ve kaynakları görür.
    login(client, 2)
    admin_res = client.get("/api/yonetim/trafik-analitigi?gun=30")
    assert admin_res.status_code == 200
    a_data = admin_res.json()
    assert a_data["aktif_kaynak"] == "site_ici"
    assert a_data["ozet"]["ziyaretci"] == 3
    assert a_data["ozet"]["sayfa_goruntuleme"] == 4
    assert a_data["ozet"]["profil_goruntuleme"] == 3
    top_profiles = a_data["en_cok_ziyaret_edilen_uzmanlar"]
    assert top_profiles[0]["uzman_id"] == ids[0]
    assert top_profiles[0]["profil_goruntuleme"] == 2
    assert top_profiles[1]["uzman_id"] == ids[1]
    assert {s["etiket"] for s in a_data["yonlendiren_kaynaklar"]} == {
        "Instagram",
        "Google",
        "YouTube",
    }
    assert {loc["sehir"] for loc in a_data["ziyaretci_konumlari"]} == {
        "Istanbul",
        "Ankara",
        "Izmir",
    }


def test_ga4_ayarlari_hizmet_hesabi_ve_raporlama(env, monkeypatch):
    client, factory, ids, _ = env
    with factory() as db:
        u0 = db.get(Uzman, ids[0])
        slug0 = u0.kullanici_adi

    login(client, 2)

    # Geçersiz GA4 kimliği 422 döndürmeli.
    bad = client.patch(
        "/api/yonetim/analitik-ayarlar",
        json={"ga_olcum_kimligi": "YANLIS-ID"},
    )
    assert bad.status_code == 422

    # RSA özel anahtarlı sahte Service Account JSON üret ve kaydet.
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=2048
    )
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    sa_json = (
        '{"client_email": "ga-okuyucu@test-proje.iam.gserviceaccount.com", '
        '"private_key": '
        + __import__("json").dumps(pem)
        + ', "token_uri": "https://oauth2.googleapis.com/token"}'
    )

    saved = client.patch(
        "/api/yonetim/analitik-ayarlar",
        json={
            "ga_olcum_kimligi": "g-abcd1234ef",
            "ga4_mulk_kimligi": "456789123",
            "olcum_etkin": True,
            "hizmet_hesabi_json": sa_json,
        },
    )
    assert saved.status_code == 200, saved.text
    s_json = saved.json()
    assert s_json["olcum_kimligi"] == "G-ABCD1234EF"
    assert s_json["mulk_kimligi"] == "456789123"
    assert s_json["baglanti_durumu"] == "hizmet_hesabi"
    assert s_json["hesap_etiketi"] == (
        "ga-okuyucu@test-proje.iam.gserviceaccount.com"
    )
    assert "BEGIN PRIVATE KEY" not in saved.text

    # Genel yapılandırma hemen GA4 ölçüm kimliğini yansıtmalı.
    public_cfg = client.get("/api/analitik/yapilandirma")
    assert public_cfg.status_code == 200
    assert public_cfg.json() == {
        "olcum_etkin": True,
        "ga_olcum_kimligi": "G-ABCD1234EF",
    }

    # Veritabanında şifreli tutulmalı ve denetim gizli anahtar sızdırmamalı.
    with factory() as db:
        row = db.get(AnalitikAyari, "varsayilan")
        assert row.google_kimlik_sifreli
        assert "BEGIN PRIVATE KEY" not in row.google_kimlik_sifreli
        audits = list(db.scalars(select(Denetim)))
        assert any(a.islem == "analitik.ayar_guncelle" for a in audits)

    # GA4 Data API v1beta istemcisini sahte yanıtlarla sına.
    monkeypatch.setattr(
        google_analytics.ga_istemcisi,
        "hizmet_erisim_belirteci",
        lambda kimlik: {"access_token": "ga-erisim-token", "expires_in": 3600},
    )

    def sahte_rapor_calistir(erisim, mulk_kimligi, govde):
        assert erisim == "ga-erisim-token"
        assert mulk_kimligi == "456789123"
        dims = [d["name"] for d in govde["dimensions"]]
        if dims == ["date"]:
            return {
                "rows": [
                    {
                        "dimensionValues": [{"value": "20261113"}],
                        "metricValues": [{"value": "85"}, {"value": "210"}],
                    }
                ],
                "totals": [
                    {"metricValues": [{"value": "85"}, {"value": "210"}]}
                ],
            }
        if dims == ["city", "country"]:
            return {
                "rows": [
                    {
                        "dimensionValues": [
                            {"value": "Istanbul"},
                            {"value": "Turkey"},
                        ],
                        "metricValues": [{"value": "60"}, {"value": "140"}],
                    },
                    {
                        "dimensionValues": [
                            {"value": "Berlin"},
                            {"value": "Germany"},
                        ],
                        "metricValues": [{"value": "25"}, {"value": "70"}],
                    },
                ]
            }
        if dims == ["pagePath"]:
            return {
                "rows": [
                    {
                        "dimensionValues": [{"value": f"/{slug0}"}],
                        "metricValues": [{"value": "120"}, {"value": "55"}],
                    },
                    {
                        "dimensionValues": [{"value": "/kesfet"}],
                        "metricValues": [{"value": "90"}, {"value": "40"}],
                    },
                ]
            }
        return {
            "rows": [
                {
                    "dimensionValues": [
                        {"value": "l.instagram.com"},
                        {"value": "Organic Social"},
                    ],
                    "metricValues": [{"value": "45"}, {"value": "110"}],
                },
                {
                    "dimensionValues": [
                        {"value": "(direct)"},
                        {"value": "Direct"},
                    ],
                    "metricValues": [{"value": "40"}, {"value": "100"}],
                },
            ]
        }

    monkeypatch.setattr(
        google_analytics.ga_istemcisi,
        "rapor_calistir",
        sahte_rapor_calistir,
    )

    ga_res = client.get("/api/yonetim/trafik-analitigi?gun=30&kaynak=ga4")
    assert ga_res.status_code == 200, ga_res.text
    g = ga_res.json()
    assert g["aktif_kaynak"] == "ga4"
    assert g["ga4_veri_hazir"] is True
    assert g["ozet"]["ziyaretci"] == 85
    assert g["ozet"]["sayfa_goruntuleme"] == 210
    assert g["ozet"]["en_yuksek_kaynak"] == "Instagram"
    assert g["en_cok_ziyaret_edilen_uzmanlar"][0]["uzman_id"] == ids[0]
    assert g["en_cok_ziyaret_edilen_uzmanlar"][0]["profil_goruntuleme"] == 120
    assert g["ziyaretci_konumlari"][0]["sehir"] == "Istanbul"
    assert g["ziyaretci_konumlari"][1]["ulke"] == "Germany"

    # Bağlantıyı kes.
    disc = client.delete(
        "/api/yonetim/analitik/google/baglanti",
        headers={"Content-Type": "application/json"},
    )
    assert disc.status_code == 204
    after = client.get("/api/yonetim/trafik-analitigi?gun=30")
    assert after.status_code == 200
    assert after.json()["aktif_kaynak"] == "site_ici"
    assert after.json()["ga4_durumu"]["baglanti_durumu"] == "bagli_degil"


def test_kisa_profil_belgesi_izleyici_ve_referrer_basliklari(env):
    """Profil belgesi Google etiketine izin vermez, URL yolunu paylaşmaz."""
    client, factory, ids, _ = env
    with factory() as db:
        slug = db.get(Uzman, ids[0]).kullanici_adi

    res = client.get(f"/{slug}")
    assert res.status_code == 200
    csp = res.headers["content-security-policy"]
    assert "googletagmanager.com" not in csp
    assert "google-analytics.com" not in csp
    assert res.headers["referrer-policy"] == "strict-origin"
    assert 'content="strict-origin"' in res.text


@pytest.mark.parametrize(
    "path",
    [
        "/davet",
        "/davet/SENTINEL",
        "/DAVET/SENTINEL",
        "/R/SENTINEL",
        "/r/SENTINEL",
        "/panel/onizleme",
        "/yonetim",
        "/randevularim",
        "/RANDEVULARIM?kimlik=SENTINEL",
        "/%64avet/SENTINEL",
        "/r%2FSENTINEL",
        "/x/../davet/SENTINEL",
        "/davet?token=SENTINEL",
        "/davet#SENTINEL",
        "/%2564avet/SENTINEL",
        "/%invalid",
        "https://other.test/davet/SENTINEL",
        "//other.test/SENTINEL",
    ],
)
def test_ozel_olcum_yollari_veritabanina_yazilmaz(env, path):
    """İstemci filtresi atlanıp doğrudan POST yapılsa bile token saklanmaz."""
    client, factory, _, _ = env
    response = client.post(
        "/api/analitik/olcum",
        json={
            "olay_turu": "page_view",
            "sayfa_yolu": path,
            "ziyaret_anahtari": "test-ziyaretci-001",
        },
    )
    assert response.status_code == 204
    with factory() as db:
        assert db.scalars(select(TrafikOlayi)).all() == []


def test_acik_sayfa_sorgu_fragment_ve_referans_tokeni_saklamaz(env):
    """Geçerli kamu sayfası ölçülür; URL sırları kayda taşınmaz."""
    client, factory, _, _ = env
    response = client.post(
        "/api/analitik/olcum",
        json={
            "olay_turu": "page_view",
            "sayfa_yolu": "/davetci?token=SENTINEL#SENTINEL",
            "referans_url": "https://source.test/davet/SENTINEL?q=SENTINEL",
            "ziyaret_anahtari": "test-ziyaretci-001",
        },
    )
    assert response.status_code == 204
    with factory() as db:
        event = db.scalars(select(TrafikOlayi)).one()
        assert event.sayfa_yolu == "/davetci"
        assert event.kaynak_alani == "source.test"
        assert "SENTINEL" not in str(vars(event))
