"""Özel bağlantı erişimi, kaldırılan danışan listesi ve yönetici yetkisi.

Eski tarayıcı çerezleri de dahil hiçbir anonim oturum liste/istatistik
alamaz. Tek randevu anahtarı yalnız o kaydı açar; toplamlar yönetimdedir.
"""

import time

import pytest

from app.models import Randevu
from app.security import fernet, ozet
from tests.conftest import login
from tests.test_appointment_links import private, reserve


def test_talep_yalniz_ozel_baglantida_ve_yetkili_panellerde_gorunur(env):
    """Yeni çerez oluşturulmaz; özel link ve uzman aynı kaydı gösterir."""
    client, factory, ids, _ = env
    result, token = reserve(client, ids[0])
    booking_id = result["randevu_id"]
    assert "terapist_danisan" not in client.cookies
    with factory() as db:
        assert db.get(Randevu, booking_id).danisan_oturum_ozeti is None
    assert private(client, result, token).json()["durum"] == "bekliyor"
    login(client)
    assert booking_id in [
        r["id"] for r in client.get("/api/uzman/randevular").json()
    ]
    assert (
        client.patch(
            f"/api/uzman/randevular/{booking_id}", json={"durum": "onaylandi"}
        ).status_code
        == 204
    )
    assert private(client, result, token).json()["durum"] == "onaylandi"
    login(client, 1)
    assert booking_id not in [
        r["id"] for r in client.get("/api/uzman/randevular").json()
    ]
    login(client, 2)
    assert client.get("/api/yonetim/randevular").json()["ozet"]["toplam"] == 2


def test_eski_cerez_liste_istatistik_veya_anahtarsiz_islem_acamaz(env):
    """Önceki sürümün geçerli çerezi bile yeni yetki sınırını aşamaz."""
    client, factory, ids, _ = env
    result, token = reserve(client, ids[0])
    booking_id = result["randevu_id"]
    old_token = "a" * 43
    with factory.begin() as db:
        db.get(Randevu, booking_id).danisan_oturum_ozeti = ozet(old_token)
    cookie = fernet.encrypt(f"danisan:{old_token}".encode()).decode()
    for candidate in ("", cookie):
        client.cookies.clear()
        if candidate:
            client.cookies.set("terapist_danisan", candidate)
        for path in ("/randevular", "/randevu-ozeti"):
            assert client.get("/api/danisan" + path).status_code == 404
        for action in ("iptal", "baglanti"):
            assert (
                client.post(
                    f"/api/danisan/randevular/{booking_id}/{action}", json={}
                ).status_code
                == 404
            )
        assert (
            client.post(
                f"/api/danisan/randevu/{booking_id}/goruntule", json={}
            ).status_code
            == 422
        )
        assert private(client, result, "x" * 43).status_code == 404
        assert private(client, result, token).status_code == 200


@pytest.mark.parametrize(
    "path", ["/ozet", "/analitik", "/randevular", "/trafik-analitigi"]
)
def test_genel_istatistikler_yalniz_yoneticiye_aciktir(env, path):
    """Anonim 401, uzman 403 alır; yönetici genel sonuçları okuyabilir."""
    client, _, _, _ = env
    route = "/api/yonetim" + path
    assert client.get(route).status_code == 401
    login(client)
    assert client.get(route).status_code == 403
    login(client, 2)
    assert client.get(route).status_code == 200


def test_tamamlanma_zamani_ve_tum_sayfalarin_istatistigi(env):
    """Gelecek görüşme tamamlanmaz; geçmiş onaylı görüşme açıkça tamamlanır."""
    client, factory, ids, booking_id = env
    login(client)
    path = f"/api/uzman/randevular/{booking_id}"
    assert client.patch(path, json={"durum": "tamamlandi"}).status_code == 409
    assert client.patch(path, json={"durum": "onaylandi"}).status_code == 204
    assert client.patch(path, json={"durum": "tamamlandi"}).status_code == 409
    with factory() as db:
        row = db.get(Randevu, booking_id)
        row.baslangic = int(time.time()) - 7200
        row.bitis = int(time.time()) - 3600
        for index in range(55):
            db.add(
                Randevu(
                    uzman_id=ids[0],
                    baslangic=row.baslangic - (index + 1) * 3600,
                    durum="iptal",
                    danisan_sifreli=row.danisan_sifreli,
                    olusturma=int(time.time()),
                    aydinlatma_surumu="taslak-1",
                )
            )
        db.commit()
    assert client.patch(path, json={"durum": "tamamlandi"}).status_code == 204
    assert len(client.get("/api/uzman/randevular").json()) == 50
    stats = client.get("/api/uzman/randevu-ozeti").json()
    assert stats == {
        "toplam": 56,
        "bekliyor": 0,
        "onaylandi": 0,
        "tamamlandi": 1,
        "iptal": 55,
        "reddedildi": 0,
    }
    login(client, 1)
    assert client.get("/api/uzman/randevu-ozeti").json()["toplam"] == 0
    login(client, 2)
    summary = client.get("/api/yonetim/randevular?durum=tamamlandi").json()
    assert summary["ozet"]["tamamlandi"] == 1
    assert summary["toplam_kayit"] == 1
