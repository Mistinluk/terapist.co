"""Profil kaynaklarında sahiplik, sıralama, görünürlük ve HTTPS doğrulaması."""

from sqlalchemy import select

from app.models import ProfilKaynagi, TerapistDogrulama, Uzman
from tests.conftest import login


def _add(client, title="Örnek kaynak", url="https://example.com/yazi"):
    return client.post(
        "/api/uzman/kaynaklar",
        json={
            "baslik": title,
            "aciklama": "Danışanlar için kurgusal okuma önerisi.",
            "url": url,
            "kategori": "yazi",
        },
    )


def test_kaynak_yalniz_sahibi_tarafindan_eklenir_ve_https_zorunludur(env):
    client, _, ids, _ = env
    assert _add(client).status_code == 401
    login(client)
    assert _add(client, url="javascript:alert(1)").status_code == 422
    assert _add(client, url="http://example.com").status_code == 422
    assert _add(client, url="https://user:pass@example.com").status_code == 422
    created = _add(client)
    assert created.status_code == 201, created.text
    assert (
        client.get(f"/api/uzmanlar/{ids[0]}/kaynaklar").json()[0]["id"]
        == created.json()["id"]
    )
    assert (
        client.get("/api/uzman/kaynaklar").json()[0]["baslik"]
        == "Örnek kaynak"
    )


def test_sahip_siralayabilir_baska_hesap_kaynaklari_degistiremez(env):
    client, factory, ids, _ = env
    login(client)
    first = _add(client, "Birinci kaynak").json()["id"]
    second = _add(client, "İkinci kaynak").json()["id"]
    edited = client.patch(
        f"/api/uzman/kaynaklar/{first}",
        json={
            "baslik": "Güncellenen kaynak",
            "aciklama": "Yeni açıklama",
            "url": "https://example.com/yeni",
            "kategori": "kitap",
        },
    )
    assert edited.status_code == 200
    assert edited.json()["baslik"] == "Güncellenen kaynak"
    assert (
        client.patch(
            "/api/uzman/kaynaklar/sira", json={"ids": [second, first]}
        ).status_code
        == 204
    )
    assert [
        row["id"] for row in client.get("/api/uzman/kaynaklar").json()
    ] == [
        second,
        first,
    ]
    assert (
        client.patch(
            "/api/uzman/kaynaklar/sira", json={"ids": [first, first]}
        ).status_code
        == 422
    )
    login(client, 1)
    assert (
        client.patch(
            f"/api/uzman/kaynaklar/{first}",
            json={
                "baslik": "Başkasının kaynağı",
                "url": "https://example.com",
                "kategori": "diger",
            },
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/uzman/kaynaklar/{first}",
            headers={"Content-Type": "application/json"},
        ).status_code
        == 404
    )
    assert (
        client.patch(
            "/api/uzman/kaynaklar/sira", json={"ids": [second, first]}
        ).status_code
        == 422
    )
    with factory() as db:
        assert db.get(ProfilKaynagi, first).uzman_id == ids[0]


def test_kaynak_yalniz_yayindaki_profilde_acilir(env):
    client, factory, ids, _ = env
    login(client)
    resource_id = _add(client).json()["id"]
    clicked = client.get(
        f"/api/kaynaklar/{resource_id}/ac", follow_redirects=False
    )
    assert clicked.status_code == 302
    assert clicked.headers["location"] == "https://example.com/yazi"
    with factory() as db:
        assert db.get(ProfilKaynagi, resource_id).tiklama_sayisi == 1
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()
    assert client.get(f"/api/uzmanlar/{ids[0]}/kaynaklar").status_code == 404
    assert client.get(f"/api/kaynaklar/{resource_id}/ac").status_code == 404
    assert len(client.get("/api/uzman/kaynaklar").json()) == 1


def test_kaldirma_sonrasi_yeni_kaynak_siranin_sonuna_eklenir(env):
    client, _, _, _ = env
    login(client)
    first = _add(client, "Birinci kaynak").json()["id"]
    second = _add(client, "İkinci kaynak").json()["id"]
    assert (
        client.delete(
            f"/api/uzman/kaynaklar/{first}",
            headers={"Content-Type": "application/json"},
        ).status_code
        == 204
    )
    third = _add(client, "Üçüncü kaynak").json()["id"]
    assert [
        row["id"] for row in client.get("/api/uzman/kaynaklar").json()
    ] == [
        second,
        third,
    ]


def test_yeni_profil_alanlari_dogrulanir(env):
    client, _, _, _ = env
    login(client)
    profile = client.get("/api/uzman/profil").json()
    update = {
        key: value
        for key, value in profile.items()
        if key
        not in {
            "id",
            "kullanici_adi",
            "uye_olma",
            "kurucu_no",
            "onayli",
            "arsivli",
        }
    }
    update["terapi_yaklasimi"] = "Danışanla birlikte hedef belirlerim."
    update["seans_suresi_dakika"] = 50
    update["sosyal_baglantilar"] = {"instagram": "https://instagram.com/ornek"}
    saved = client.put("/api/uzman/profil", json=update)
    assert saved.status_code == 200, saved.text
    assert saved.json()["seans_suresi_dakika"] == 50
    assert saved.json()["terapi_yaklasimi"] == update["terapi_yaklasimi"]
    update["sosyal_baglantilar"] = {"instagram": "https://evil.example/"}
    assert client.put("/api/uzman/profil", json=update).status_code == 422
