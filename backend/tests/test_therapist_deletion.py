"""Kalıcı silmede yetki, geçmişin korunması, FK sırası ve geri alma.

Yalnız ortak fixture'ın geçici DB'si kullanılır. SQLite FK kontrolü bu
dosyada ayrıca açılır; TEST_POSTGRES_URL ile aynı senaryolar PostgreSQL'de
de çalışır. Gerçek hesap, medya veya randevular bu testlere alınmaz.
"""

import time
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select

from app.config import get_settings
from app.main import app
from app.media import MEDYA_URL_ONEKI
from app.models import (
    BeklemeListesiKaydi,
    Bildirim,
    DanisanYonlendirme,
    Davet,
    Denetim,
    GoogleTakvimBaglantisi,
    Kullanici,
    KurucuUye,
    MesajKonusu,
    MeslektasUzmanlikIliskisi,
    ModerasyonRaporu,
    Oturum,
    ProfesyonelBaglanti,
    ProfilKaynagi,
    Randevu,
    Tavsiye,
    TerapistDogrulama,
    TrafikOlayi,
    Uzman,
    UzmanEngeli,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
    YonlendirmeHedefi,
    YonlendirmeOlayi,
    baglanti_cifti,
)
from app.security import sifrele
from tests.conftest import login


@pytest.fixture
def deletion_env(env):
    """SQLite silme testlerinde de yabancı anahtarları denetler."""
    _, factory, _, _ = env
    with factory() as db:
        if db.bind.dialect.name == "sqlite":
            db.connection().exec_driver_sql("PRAGMA foreign_keys=ON")
    return env


def request_data(factory, profile_id):
    """Ekranda yazılan hedef kullanıcı adı ve açık onayı hazırlar."""
    with factory() as db:
        return {
            "kullanici_adi": db.get(Uzman, profile_id).kullanici_adi,
            "kalici_sil": True,
        }


def endpoint(profile_id):
    """Arşiv işlemiyle karışmayan kalıcı silme adresini döndürür."""
    return f"/api/yonetim/uzmanlar/{profile_id}/kalici-sil"


def test_yetki_csrf_ve_acik_onay_zorunlu(deletion_env):
    """Anonim/uzman ve hatalı onay hiçbir hesap veya kaydı silemez."""
    client, factory, ids, _ = deletion_env
    path = endpoint(ids[1])
    body = request_data(factory, ids[1])
    assert client.get(path).status_code == 401
    assert client.request("DELETE", path, json=body).status_code == 401
    login(client)
    assert client.get(path).status_code == 403
    assert client.request("DELETE", path, json=body).status_code == 403
    login(client, 2)
    assert (
        client.request(
            "DELETE",
            path,
            json=body,
            headers={
                "X-CSRF-Token": "yanlis",
            },
        ).status_code
        == 403
    )
    for invalid in ({}, {**body, "kalici_sil": False}):
        assert client.request("DELETE", path, json=invalid).status_code == 422
    assert (
        client.request(
            "DELETE",
            path,
            json={
                **body,
                "kullanici_adi": "baska-uzman",
            },
        ).status_code
        == 409
    )
    with factory() as db:
        assert db.get(Uzman, ids[1]) is not None


@pytest.mark.parametrize(
    "status", ["bekliyor", "onaylandi", "tamamlandi", "iptal", "reddedildi"]
)
def test_her_durumdaki_randevu_korunur(deletion_env, status):
    """İptal veya tamamlanma geçmişi kalıcı silme iznine dönüşmez."""
    client, factory, ids, booking_id = deletion_env
    with factory() as db:
        row = db.get(Randevu, booking_id)
        row.durum = status
        encrypted = row.danisan_sifreli
        db.commit()
    login(client, 2)
    preview = client.get(endpoint(ids[0])).json()
    assert preview["silinebilir"] is False
    assert "Randevu geçmişi" in preview["engeller"][0]
    response = client.request(
        "DELETE", endpoint(ids[0]), json=request_data(factory, ids[0])
    )
    assert response.status_code == 409
    with factory() as db:
        assert db.get(Randevu, booking_id).danisan_sifreli == encrypted
        assert db.get(Randevu, booking_id).durum == status
        assert db.get(Uzman, ids[0]).onayli is True
        assert not db.scalar(
            select(Denetim.id).where(Denetim.islem == "uzman.kalici_sil")
        )


def test_onizlemeden_sonra_eklenen_randevu_da_korunur(deletion_env):
    """Eski bir silinebilir önizlemesi sonradan alınan randevuyu silemez."""
    client, factory, ids, _ = deletion_env
    login(client, 2)
    assert client.get(endpoint(ids[1])).json()["silinebilir"] is True
    with factory() as db:
        db.add(
            Randevu(
                uzman_id=ids[1],
                baslangic=int(time.time()) + 86400,
                danisan_sifreli=sifrele(
                    {"ad": "Kurgusal", "telefon": "05000000000"}
                ),
                olusturma=int(time.time()),
                aydinlatma_surumu="test",
            )
        )
        db.commit()
    assert (
        client.request(
            "DELETE", endpoint(ids[1]), json=request_data(factory, ids[1])
        ).status_code
        == 409
    )


@pytest.mark.parametrize(
    "kind", ["yonetici", "bekleme", "google", "mesaj", "moderasyon"]
)
def test_korunan_iliskiler_silmeyi_engeller(deletion_env, kind):
    """Yönetici yetkileri ve danışan/iletişim geçmişi dolaylı silinmez."""
    client, factory, ids, _ = deletion_env
    now = int(time.time())
    with factory() as db:
        target = db.get(Uzman, ids[1])
        other = db.get(Uzman, ids[0])
        if kind == "yonetici":
            db.get(Kullanici, target.kullanici_id).rol = "yonetici"
        elif kind == "bekleme":
            db.add(
                BeklemeListesiKaydi(
                    uzman_id=target.id,
                    danisan_sifreli="kurgusal",
                    aydinlatma_surumu="test",
                    olusturma=now,
                )
            )
        elif kind == "google":
            db.add(
                GoogleTakvimBaglantisi(
                    uzman_id=target.id,
                    token_sifreli="kurgusal",
                    hesap_sifreli="kurgusal",
                    olusturma=now,
                    guncelleme=now,
                )
            )
        elif kind == "mesaj":
            db.add(
                MesajKonusu(
                    baslik="Test",
                    katilimci_a_id=target.kullanici_id,
                    katilimci_b_id=other.kullanici_id,
                    son_mesaj_zamani=now,
                    olusturma=now,
                )
            )
        else:
            db.add(
                ModerasyonRaporu(
                    raporlayan_uzman_id=other.id,
                    hedef_uzman_id=target.id,
                    tur="connection",
                    kaynak_id="test",
                    olusturma=now,
                )
            )
        db.commit()
    login(client, 2)
    assert client.get(endpoint(ids[1])).json()["silinebilir"] is False
    assert (
        client.request(
            "DELETE", endpoint(ids[1]), json=request_data(factory, ids[1])
        ).status_code
        == 409
    )


def test_iliskiler_oturumlar_ve_hesap_silinir_diger_uzman_korunur(
    deletion_env,
):
    """İlişkiler temizlenir; diğer profil, randevu ve denetim korunur."""
    client, factory, ids, booking_id = deletion_env
    now = int(time.time())
    login(client, 1)
    with factory() as db:
        target, other = db.get(Uzman, ids[1]), db.get(Uzman, ids[0])
        account_id = target.kullanici_id
        admin_id = db.scalar(
            select(Kullanici.id).where(Kullanici.rol == "yonetici")
        )
        badge = WebsiteRozeti(uzman_id=target.id, olusturma=now)
        own = DanisanYonlendirme(
            yonlendiren_uzman_id=target.id,
            token_ozeti="a" * 64,
            neden="budget",
            olusturma=now,
            sure_bitimi=now + 3600,
        )
        incoming = DanisanYonlendirme(
            yonlendiren_uzman_id=other.id,
            token_ozeti="b" * 64,
            neden="budget",
            olusturma=now,
            sure_bitimi=now + 3600,
        )
        db.add_all([badge, own, incoming])
        db.flush()
        incoming_id = incoming.id
        db.add_all(
            [
                WebsiteRozetiOlayi(
                    rozet_id=badge.id, olay="badge_clicked", zaman=now
                ),
                ProfilKaynagi(
                    uzman_id=target.id,
                    baslik="Test",
                    url="https://example.com",
                    olusturma=now,
                ),
                KurucuUye(
                    uzman_id=target.id,
                    kurucu_no=1,
                    verilme=now,
                    veren_kullanici_id=admin_id,
                ),
                YonlendirmeHedefi(
                    yonlendirme_id=own.id, uzman_id=other.id, sira=0
                ),
                YonlendirmeHedefi(
                    yonlendirme_id=incoming.id, uzman_id=target.id, sira=0
                ),
                YonlendirmeOlayi(
                    yonlendirme_id=own.id,
                    hedef_uzman_id=other.id,
                    olay="profile_clicked_from_referral",
                    zaman=now,
                ),
                YonlendirmeOlayi(
                    yonlendirme_id=incoming.id,
                    hedef_uzman_id=target.id,
                    olay="profile_clicked_from_referral",
                    zaman=now,
                ),
                ProfesyonelBaglanti(
                    isteyen_uzman_id=other.id,
                    alici_uzman_id=target.id,
                    cift_anahtari=baglanti_cifti(*ids),
                    iliski_turu="colleague",
                    istek_zamani=now,
                ),
                Tavsiye(veren_id=target.id, alan_id=other.id),
                MeslektasUzmanlikIliskisi(
                    iliskilendiren_uzman_id=other.id,
                    hedef_uzman_id=target.id,
                    uzmanlik="Kaygı",
                    profesyonel_baglam="worked_together",
                    olusturma=now,
                    guncelleme=now,
                ),
                UzmanEngeli(
                    engelleyen_uzman_id=target.id,
                    engellenen_uzman_id=other.id,
                    olusturma=now,
                ),
                Davet(
                    davet_eden_uzman_id=target.id,
                    email="kurgusal1@example.com",
                    token_ozeti="c" * 64,
                    olusturma=now,
                    sure_bitimi=now + 3600,
                ),
                Davet(
                    davet_eden_uzman_id=other.id,
                    kabul_eden_uzman_id=target.id,
                    email="kurgusal2@example.com",
                    token_ozeti="d" * 64,
                    durum="accepted",
                    olusturma=now,
                    sure_bitimi=now + 3600,
                ),
                Bildirim(
                    alici_kullanici_id=account_id,
                    baslik="Test",
                    mesaj="Test",
                    olusturma=now,
                ),
                Bildirim(
                    alici_kullanici_id=other.kullanici_id,
                    gonderen_kullanici_id=account_id,
                    baslik="Korunur",
                    mesaj="Test",
                    olusturma=now,
                ),
                TrafikOlayi(
                    zaman=now,
                    tarih_gun="2026-11-18",
                    ziyaretci_karma="a" * 32,
                    olay_turu="profile_view",
                    sayfa_yolu="/profil",
                    sayfa_turu="terapist_profili",
                    uzman_id=target.id,
                    kaynak_kategorisi="dogrudan",
                    kaynak_etiketi="Test",
                ),
            ]
        )
        db.commit()
    login(client, 2)
    body = request_data(factory, ids[1])
    assert client.get(f"/api/uzmanlar/{ids[1]}").status_code == 200
    response = client.request(
        "DELETE", endpoint(ids[1]), json=request_data(factory, ids[1])
    )
    assert response.status_code == 204, response.text
    assert client.get(endpoint(ids[1])).status_code == 404
    assert client.get(f"/api/uzmanlar/{ids[1]}").status_code == 404
    assert (
        client.get(
            f"/api/uzmanlar/kullanici-adi/{body['kullanici_adi']}"
        ).status_code
        == 404
    )
    with factory() as db:
        assert db.get(Uzman, ids[1]) is None
        assert db.get(Kullanici, account_id) is None
        assert not db.scalar(
            select(Oturum.ozet).where(Oturum.kullanici_id == account_id)
        )
        assert db.get(Uzman, ids[0]) is not None
        assert db.get(Randevu, booking_id) is not None
        assert db.get(DanisanYonlendirme, incoming_id) is not None
        assert db.scalar(select(YonlendirmeOlayi)).hedef_uzman_id is None
        assert db.scalar(select(Davet)).durum == "revoked"
        assert db.scalar(select(Bildirim)).gonderen_kullanici_id is None
        assert db.scalar(
            select(Denetim.id).where(Denetim.islem == "uzman.kalici_sil")
        )
        assert (
            db.scalar(select(func.count()).select_from(TerapistDogrulama)) == 1
        )


def test_fk_hatasi_tum_silmeleri_geri_alir(deletion_env):
    """Yeni/beklenmeyen bir FK çocukları da koruyan kontrollü 409 üretir."""
    client, factory, ids, _ = deletion_env
    with factory() as db:
        account_id = db.get(Uzman, ids[1]).kullanici_id
        # Eski yönetici rolünden kalmış, başka bir profilin kurucu kaydı.
        db.add(
            KurucuUye(
                uzman_id=ids[0],
                kurucu_no=1,
                verilme=int(time.time()),
                veren_kullanici_id=account_id,
            )
        )
        db.commit()
    login(client, 2)
    response = client.request(
        "DELETE", endpoint(ids[1]), json=request_data(factory, ids[1])
    )
    assert response.status_code == 409
    with factory() as db:
        assert db.get(Uzman, ids[1]) is not None
        assert db.get(Kullanici, account_id) is not None
        assert db.scalar(
            select(TerapistDogrulama.id).where(
                TerapistDogrulama.uzman_id == ids[1]
            )
        )
        assert not db.scalar(
            select(Denetim.id).where(Denetim.islem == "uzman.kalici_sil")
        )


def test_arsivli_gecmissiz_profil_listelenir_ve_silinebilir(deletion_env):
    """Arşiv filtresi, eski profillerin silme kontrolünü açar."""
    client, factory, ids, _ = deletion_env
    login(client, 2)
    assert (
        client.request(
            "DELETE", f"/api/yonetim/uzmanlar/{ids[1]}", json={}
        ).status_code
        == 204
    )
    assert ids[1] not in [
        row["id"] for row in client.get("/api/yonetim/uzmanlar").json()
    ]
    assert [
        row["id"]
        for row in client.get("/api/yonetim/uzmanlar?onay=arsivli").json()
    ] == [ids[1]]
    assert (
        client.request(
            "DELETE", endpoint(ids[1]), json=request_data(factory, ids[1])
        ).status_code
        == 204
    )


@pytest.mark.parametrize("shared", [False, True])
def test_medya_yalniz_baska_profil_kullanmiyorsa_silinir(
    deletion_env, monkeypatch, tmp_path, shared
):
    """Kalıcı silme paylaşılan görseli kaldırmaz; yerel kopyayı temizler."""
    client, factory, ids, _ = deletion_env
    monkeypatch.setattr(get_settings(), "medya_dizini", str(tmp_path))
    directory = tmp_path / "profil_fotograflari"
    directory.mkdir()
    filename = "a" * 32 + ".webp"
    image = directory / filename
    image.write_bytes(b"yalnizca-dosya-silme-testi")
    with factory() as db:
        db.get(Uzman, ids[1]).profil_fotografi_url = MEDYA_URL_ONEKI + filename
        if shared:
            db.get(Uzman, ids[0]).arka_plan_gorseli_url = (
                MEDYA_URL_ONEKI + filename
            )
        db.commit()
    login(client, 2)
    assert (
        client.request(
            "DELETE", endpoint(ids[1]), json=request_data(factory, ids[1])
        ).status_code
        == 204
    )
    assert image.exists() is shared


def test_postgresql_randevu_ile_silme_yarisinda_gecmis_korunur(deletion_env):
    """Gerçek profil kilidinde bekleyen DELETE, yeni randevuyu görüp durur."""
    client, factory, ids, _ = deletion_env
    engine = factory.kw["bind"]
    if engine.dialect.name != "postgresql":
        pytest.skip("Satır kilidi gerçek PostgreSQL üzerinde sınanır.")
    login(client, 2)
    body = request_data(factory, ids[1])
    reached_lock = Event()

    def observe_lock(connection, cursor, statement, parameters, context, many):
        """DELETE'in kilit sorgusuna ulaştığını olay dinleyicisiyle izler."""
        if "FOR UPDATE" in statement and "uzmanlar" in statement:
            reached_lock.set()

    def remove():
        """Silme isteğinin ayrı HTTP/DB oturumunu kullanmasını sağlar."""
        with TestClient(app, raise_server_exceptions=False) as other:
            other.cookies.update(client.cookies)
            return other.request(
                "DELETE",
                endpoint(ids[1]),
                json=body,
                headers={
                    "Origin": "http://localhost:5173",
                    "X-CSRF-Token": client.headers["X-CSRF-Token"],
                },
            )

    with factory() as booking_db, ThreadPoolExecutor(max_workers=1) as pool:
        booking_db.scalar(
            select(Uzman).where(Uzman.id == ids[1]).with_for_update()
        )
        event.listen(engine, "before_cursor_execute", observe_lock)
        try:
            future = pool.submit(remove)
            assert reached_lock.wait(timeout=10)
            booking_db.add(
                Randevu(
                    uzman_id=ids[1],
                    baslangic=int(time.time()) + 86400,
                    danisan_sifreli="kurgusal",
                    olusturma=int(time.time()),
                    aydinlatma_surumu="test",
                )
            )
            booking_db.commit()
            response = future.result(timeout=15)
            assert response.status_code == 409, response.text
        finally:
            booking_db.rollback()
            event.remove(engine, "before_cursor_execute", observe_lock)
    with factory() as db:
        assert db.get(Uzman, ids[1]) is not None
        assert db.scalar(select(Randevu.id).where(Randevu.uzman_id == ids[1]))
