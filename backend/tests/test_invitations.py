"""Phase 1 davet, doğrulama ve Founding Therapist davranışları."""

import time
from urllib.parse import urlsplit

from sqlalchemy import select

from app.models import (
    Davet,
    ProfesyonelBaglanti,
    Tavsiye,
    TerapistDogrulama,
    Uzman,
)
from tests.conftest import PAROLA, login


def _profil(client, uzman_id, ad="Davetli Uzman"):
    profile = client.get(f"/api/uzmanlar/{uzman_id}").json()
    for field in [
        "id",
        "kullanici_adi",
        "uye_olma",
        "kurucu_no",
        "onayli",
        "arsivli",
    ]:
        profile.pop(field)
    profile["ad"] = ad
    return profile


def _token(response):
    return urlsplit(response.json()["kabul_url"]).path.rsplit("/", 1)[-1]


def test_dogrulanmis_terapist_davet_olusturur_ve_kota_azalir(env):
    """Doğrulanmış A terapisti B için tek kullanımlık davet oluşturur."""
    client, factory, _, _ = env
    login(client)
    created = client.post(
        "/api/davetler",
        json={"email": "davetli@example.com", "ad": "Davetli Uzman"},
    )
    assert created.status_code == 201, created.text
    assert created.json()["iliski_turu"] == "invited_to_platform"
    assert created.json()["onerilen_uzmanlik"] is None
    assert "token" not in created.json()
    summary = client.get("/api/davetlerim")
    assert summary.status_code == 200
    assert summary.json()["davet_limiti"] == 3
    assert summary.json()["kullanilan"] == 1
    assert summary.json()["kalan"] == 2
    with factory() as db:
        invitation = db.scalar(select(Davet))
        assert invitation.email == "davetli@example.com"
        assert _token(created) not in invitation.token_ozeti


def test_davet_kabul_edilir_hesap_ve_iliski_hazirlanir(env):
    """Kabul; hesap, bekleyen doğrulama ve iki yönlü kimlik oluşturur."""
    client, factory, ids, _ = env
    login(client)
    created = client.post(
        "/api/davetler",
        json={
            "email": "yeni-terapist@example.com",
            "ad": "Yeni Terapist",
            "uzmanlik": "Çocuk Terapisi",
        },
    )
    token = _token(created)
    detail = client.get(f"/api/davetler/{token}")
    assert detail.status_code == 200
    assert detail.json()["davet_eden"] == "Örnek Uzman 0"
    invited_profile = _profil(client, ids[0], ad="Yeni Terapist")
    invited_profile["uzmanliklar"] = ["Çocuk Terapisi"]
    accepted = client.post(
        f"/api/davetler/{token}/kabul",
        json={
            "parola": PAROLA,
            "profil": invited_profile,
        },
    )
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["mfa_anahtari"]
    with factory() as db:
        invitation = db.scalar(select(Davet))
        assert invitation.durum == "accepted"
        assert invitation.davet_eden_uzman_id == ids[0]
        assert invitation.kabul_eden_uzman_id
        assert invitation.iliski_turu == "invited_to_platform"
        connection = db.scalar(select(ProfesyonelBaglanti))
        assert connection.isteyen_uzman_id == ids[0]
        assert connection.alici_uzman_id == invitation.kabul_eden_uzman_id
        assert connection.iliski_turu == "invited_to_platform"
        assert connection.durum == "accepted"
        recommendation = db.scalar(select(Tavsiye))
        assert recommendation.veren_id == ids[0]
        assert recommendation.alan_id == invitation.kabul_eden_uzman_id
        assert recommendation.uzmanlik == "Çocuk Terapisi"
        invited = db.get(Uzman, invitation.kabul_eden_uzman_id)
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == invited.id
            )
        )
        assert not invited.onayli
        assert verification.durum == "pending"
    assert client.get(f"/api/davetler/{token}").status_code == 409

    login(client, 2)
    references = client.get("/api/yonetim/referanslar")
    assert references.status_code == 200
    assert references.json()["davetler"][0]["davet_eden"]["ad"] == (
        "Örnek Uzman 0"
    )
    assert references.json()["davetler"][0]["uzmanlik"] == "Çocuk Terapisi"
    assert references.json()["oneriler"][0]["onerilen"]["ad"] == (
        "Yeni Terapist"
    )


def test_duplicate_davet_engellenir(env):
    """Aynı e-posta başka terapistçe de yeniden davet edilemez."""
    client, _, _, _ = env
    login(client)
    body = {"email": "tek@example.com", "ad": "Tek Davet"}
    assert client.post("/api/davetler", json=body).status_code == 201
    assert client.post("/api/davetler", json=body).status_code == 409
    login(client, 1)
    assert client.post("/api/davetler", json=body).status_code == 409


def test_suresi_dolmus_token_calismiyor(env):
    """Süresi dolan davet görüntülenemez veya hesap açmakta kullanılamaz."""
    client, factory, ids, _ = env
    login(client)
    created = client.post("/api/davetler", json={"email": "eski@example.com"})
    token = _token(created)
    with factory() as db:
        invitation = db.scalar(select(Davet))
        invitation.sure_bitimi = int(time.time()) - 1
        db.commit()
    assert client.get(f"/api/davetler/{token}").status_code == 410
    result = client.post(
        f"/api/davetler/{token}/kabul",
        json={"parola": PAROLA, "profil": _profil(client, ids[0])},
    )
    assert result.status_code == 410


def test_yetkisiz_ve_dogrulanmamis_hesap_davet_edemez(env):
    """Oturumsuz veya doğrulanmamış uzman mutation çalıştıramaz."""
    client, factory, ids, _ = env
    body = {"email": "korumali@example.com"}
    assert client.post("/api/davetler", json=body).status_code == 401
    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()
    login(client)
    assert client.post("/api/davetler", json=body).status_code == 403


def test_terapist_kendi_calisma_alani_icin_oneri_daveti_olusturamaz(env):
    client, factory, ids, _ = env
    with factory() as db:
        db.get(Uzman, ids[0]).uzmanliklar = ["Kaygı"]
        db.commit()
    login(client)
    response = client.post(
        "/api/davetler",
        json={
            "email": "yanlis-alan@example.com",
            "ad": "Yanlış Alan",
            "uzmanlik": "Kaygı",
        },
    )
    assert response.status_code == 422


def test_davet_limiti_yonetilir(env):
    """Kişisel davet kotası aşılmaz ve yönetici tarafından değiştirilebilir."""
    client, factory, ids, _ = env
    login(client)
    for index in range(3):
        assert (
            client.post(
                "/api/davetler", json={"email": f"kota{index}@example.com"}
            ).status_code
            == 201
        )
    assert (
        client.post(
            "/api/davetler", json={"email": "fazla@example.com"}
        ).status_code
        == 409
    )
    login(client, 2)
    assert (
        client.patch(
            f"/api/yonetim/uzmanlar/{ids[0]}/davet-limiti",
            json={"davet_limiti": 5},
        ).status_code
        == 204
    )
    with factory() as db:
        assert db.get(Uzman, ids[0]).davet_limiti == 5
