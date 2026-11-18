"""Üyesiz takip: çerez sahipliği, iptal ve sayfadan bağımsız sayım."""

import time

from app.models import Randevu
from app.randevu_takip import CEREZ, OMUR
from app.security import fernet
from tests.conftest import login
from tests.test_appointments import payload


def test_talep_iki_panelde_ve_yonetimde_gorunur(env):
    """Aynı kayıt danışanda, uzmanda ve yönetim toplamında görünmelidir."""
    client, _, ids, _ = env
    response = client.post("/api/randevular", json=payload(client, ids[0]))
    assert response.status_code == 201
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=strict" in response.headers["set-cookie"].lower()
    booking_id = response.json()["randevu_id"]
    rows = client.get("/api/danisan/randevular").json()
    assert [r["id"] for r in rows] == [booking_id]
    assert rows[0]["durum"] == "bekliyor"
    assert "telefon" not in rows[0] and "danisan_oturum_ozeti" not in rows[0]
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
    assert (
        client.get("/api/danisan/randevular").json()[0]["durum"] == "onaylandi"
    )
    assert client.get("/api/danisan/randevu-ozeti").json()["onaylandi"] == 1
    login(client, 1)
    assert booking_id not in [
        r["id"] for r in client.get("/api/uzman/randevular").json()
    ]
    login(client, 2)
    assert client.get("/api/yonetim/randevular").json()["ozet"]["toplam"] == 2


def test_baska_tarayici_veya_kimlik_bilmek_erisim_vermez(env):
    """Çerezsiz, başka ve süresi geçmiş oturum kaydı göremez/iptal edemez."""
    client, _, ids, _ = env
    booking_id = client.post(
        "/api/randevular", json=payload(client, ids[0])
    ).json()["randevu_id"]
    cookie = client.cookies.get(CEREZ)
    cookie_record = next(c for c in client.cookies.jar if c.name == CEREZ)
    raw = fernet.decrypt(cookie.encode())
    for candidate in (
        "",
        "bozuk",
        fernet.encrypt(b"danisan:" + b"a" * 43).decode(),
        fernet.encrypt_at_time(raw, int(time.time()) - OMUR - 5).decode(),
    ):
        client.cookies.clear()
        if candidate:
            client.cookies.set(CEREZ, candidate)
        assert client.get("/api/danisan/randevular").json() == []
        assert (
            client.post(
                f"/api/danisan/randevular/{booking_id}/iptal", json={}
            ).status_code
            == 404
        )
    client.cookies.clear()
    # Tarayıcı gibi özgün domain/path ile sakla; çıkış bunları siler.
    client.cookies.jar.set_cookie(cookie_record)
    assert (
        client.post(
            f"/api/danisan/randevular/{booking_id}/iptal", json={}
        ).status_code
        == 204
    )
    assert client.get("/api/danisan/randevu-ozeti").json()["iptal"] == 1
    assert (
        client.delete(
            "/api/danisan/oturum", headers={"Content-Type": "application/json"}
        ).status_code
        == 204
    )
    assert client.get("/api/danisan/randevular").json() == []


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
