import time

import pyotp
from sqlalchemy import select

from app.config import Settings
from app.models import Denetim, Kullanici, Oturum, Randevu
from app.security import sifrele
from tests.conftest import PAROLA, login


def test_kimliksiz_erisim_kapali(env):
    client, _, _, _ = env
    for path in ["/uzman/randevular", "/uzman/profil", "/yonetim/uzmanlar"]:
        assert client.get("/api" + path).status_code == 401


def test_yalnizca_kendi_randevulari(env):
    client, _, _, booking_id = env
    login(client, 1)
    assert client.get("/api/uzman/randevular").json() == []
    assert (
        client.patch(
            f"/api/uzman/randevular/{booking_id}",
            json={"durum": "onaylandi"},
        ).status_code
        == 404
    )
    assert client.get("/api/yonetim/uzmanlar").status_code == 403


def test_yonetici_danisan_okuyamaz(env):
    client, _, _, _ = env
    login(client, 2)
    assert client.get("/api/uzman/randevular").status_code == 403
    result = client.get("/api/yonetim/ozet")
    assert result.status_code == 200
    assert "Kurgusal" not in result.text
    assert result.json()["randevu"] == 1


def test_csrf_origin_ve_get_yazma_engeli(env):
    client, _, _, booking_id = env
    login(client)
    url = f"/api/uzman/randevular/{booking_id}"
    assert client.get(url).status_code == 405
    assert (
        client.patch(
            url,
            json={"durum": "onaylandi"},
            headers={
                "X-CSRF-Token": "yanlis",
            },
        ).status_code
        == 403
    )
    assert (
        client.patch(
            url,
            json={"durum": "onaylandi"},
            headers={
                "Origin": "https://baska.example.com",
            },
        ).status_code
        == 403
    )
    assert client.patch(url, json={"durum": "onaylandi"}).status_code == 204
    assert client.patch(url, json={"durum": "reddedildi"}).status_code == 409


def test_oturum_cerezi_ozeti_ve_cikis(env):
    client, factory, _, _ = env
    response = login(client)
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie
    with factory() as db:
        session = db.scalar(select(Oturum))
        assert session.ozet != client.cookies["terapist_oturum"]
    before = client.get("/api/oturum/ben").json()["csrf"]
    assert client.get("/api/oturum/ben").json()["csrf"] == before
    assert client.post("/api/oturum/cikis", json={}).status_code == 204
    assert client.get("/api/oturum/ben").status_code == 401


def test_hareketsiz_oturum_suresi(env):
    client, factory, _, _ = env
    login(client)
    with factory() as db:
        db.scalar(select(Oturum)).son_erisim = int(time.time()) - 901
        db.commit()
    assert client.get("/api/uzman/randevular").status_code == 401


def test_sifreleme_ve_denetim_veri_sizdirmaz(env):
    client, factory, _, _ = env
    login(client)
    response = client.get("/api/uzman/randevular")
    assert response.json()[0]["ad"] == "Kurgusal Danışan"
    assert response.headers["cache-control"] == "no-store"
    with factory() as db:
        encrypted = db.scalar(select(Randevu)).danisan_sifreli
        assert "Kurgusal" not in encrypted and "05000000000" not in encrypted
        events = list(db.scalars(select(Denetim)))
        assert any(e.islem == "randevu.listele" for e in events)
        assert "Kurgusal" not in str([e.__dict__ for e in events])


def test_dogrulama_hatasi_girdiyi_yansitmaz(env):
    client, _, ids, _ = env
    response = client.post(
        "/api/randevular",
        json={
            "uzman_id": ids[0],
            "ad": "GIZLI_TEST_VERISI",
            "telefon": "hatali",
        },
    )
    assert response.status_code == 422
    assert "GIZLI_TEST_VERISI" not in response.text
    assert "hatali" not in response.text
    assert response.headers["cache-control"] == "no-store"


def test_hiz_siniri(env):
    client, _, _, _ = env
    for _ in range(10):
        assert (
            client.post(
                "/api/oturum/giris",
                json={
                    "email": "olmayan@example.com",
                    "parola": "yanlis",
                },
            ).status_code
            == 401
        )
    response = client.post(
        "/api/oturum/giris",
        json={
            "email": "olmayan@example.com",
            "parola": "yanlis",
        },
    )
    assert response.status_code == 429
    assert "retry-after" in response.headers


def test_mfa_ve_tekrar_kullanim(env):
    client, factory, _, _ = env
    secret = pyotp.random_base32()
    with factory() as db:
        db.scalar(
            select(Kullanici).where(Kullanici.email == "uzman0@example.com")
        ).mfa_sirri = sifrele({"anahtar": secret})
        db.commit()
    body = {"email": "uzman0@example.com", "parola": PAROLA}
    assert client.post("/api/oturum/giris", json=body).status_code == 401
    body["dogrulama_kodu"] = pyotp.TOTP(secret).now()
    assert client.post("/api/oturum/giris", json=body).status_code == 200
    assert client.post("/api/oturum/giris", json=body).status_code == 401


def test_uretim_eksik_yapilandirmayla_acilmaz(env):
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(ortam="uretim")


def test_buyuk_istek_ve_bilinmeyen_host(env):
    client, _, _, _ = env
    response = client.post("/api/oturum/giris", json={"ad": "a" * 33000})
    assert response.status_code == 413
    assert response.headers["cache-control"] == "no-store"
    assert (
        client.get(
            "/api/saglik", headers={"Host": "sahte.example.com"}
        ).status_code
        == 400
    )
