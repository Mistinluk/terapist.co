"""Phase 2 mesleki bağlantı, consent ve yetkilendirme davranışları."""

from sqlalchemy import select

from app.models import ProfesyonelBaglanti, TerapistDogrulama, Uzman
from tests.conftest import login


def _request(client, target_id, relation="worked_together"):
    return client.post(
        f"/api/uzmanlar/{target_id}/baglanti",
        json={"iliski_turu": relation},
    )


def test_desteklenen_iliski_turleri_kontrollu_katalogdan_gelir(env):
    """Kullanıcı yalnız ürünün izin verdiği altı ilişki türünü seçebilir."""
    client, _, _, _ = env
    response = client.get("/api/baglanti-turleri")
    assert response.status_code == 200
    assert [item["slug"] for item in response.json()] == [
        "colleague",
        "worked_together",
        "same_institution",
        "training_colleague",
        "supervision_relationship",
        "professional_acquaintance",
    ]


def test_istek_kabul_edilince_iki_profilde_gorunur(env):
    """A'nın isteği ancak B kabul ettikten sonra iki public ağda görünür."""
    client, factory, ids, _ = env
    login(client)
    created = _request(client, ids[1])
    assert created.status_code == 201, created.text
    connection_id = created.json()["id"]
    assert created.json()["durum"] == "pending"
    assert created.json()["yon"] == "outgoing"
    first_network = client.get(f"/api/uzmanlar/{ids[0]}/baglantilar")
    second_network = client.get(f"/api/uzmanlar/{ids[1]}/baglantilar")
    assert first_network.json()["toplam"] == 0
    assert second_network.json()["toplam"] == 0
    with factory() as db:
        assert db.get(ProfesyonelBaglanti, connection_id).durum == "pending"

    login(client, 1)
    own = client.get("/api/uzman/baglantilar").json()
    assert own["gelen_istekler"][0]["terapist"]["id"] == ids[0]
    accepted = client.patch(
        f"/api/uzman/baglanti-istekleri/{connection_id}",
        json={"durum": "accepted"},
    )
    assert accepted.status_code == 200, accepted.text
    for owner, other in [(ids[0], ids[1]), (ids[1], ids[0])]:
        network = client.get(f"/api/uzmanlar/{owner}/baglantilar").json()
        assert network["toplam"] == 1
        assert network["baglantilar"][0]["terapist"]["id"] == other
        assert network["baglantilar"][0]["iliski_turu"] == "worked_together"


def test_yalniz_alici_yanitlayabilir_ve_ters_duplicate_engellenir(env):
    """Requester kabul edemez; ters yönlü ikinci kayıt oluşmaz."""
    client, factory, ids, _ = env
    login(client)
    created = _request(client, ids[1])
    connection_id = created.json()["id"]
    assert (
        client.patch(
            f"/api/uzman/baglanti-istekleri/{connection_id}",
            json={"durum": "accepted"},
        ).status_code
        == 404
    )
    login(client, 1)
    assert _request(client, ids[0], "colleague").status_code == 409
    with factory() as db:
        assert len(list(db.scalars(select(ProfesyonelBaglanti)))) == 1


def test_reddedilen_istek_public_aga_girmez(env):
    """Reject kalıcı consent kaydıdır ve public ağda görünmez."""
    client, _, ids, _ = env
    login(client)
    connection_id = _request(client, ids[1]).json()["id"]
    login(client, 1)
    rejected = client.patch(
        f"/api/uzman/baglanti-istekleri/{connection_id}",
        json={"durum": "rejected"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["durum"] == "rejected"
    assert (
        client.patch(
            f"/api/uzman/baglanti-istekleri/{connection_id}",
            json={"durum": "accepted"},
        ).status_code
        == 409
    )
    network = client.get(f"/api/uzmanlar/{ids[1]}/baglantilar")
    assert network.json()["toplam"] == 0


def test_yetkisiz_kendi_ve_dogrulanmamis_istekler_engellenir(env):
    """Mutation oturum, farklı hedef ve doğrulanmış terapist gerektirir."""
    client, factory, ids, _ = env
    assert _request(client, ids[1]).status_code == 401
    login(client)
    assert _request(client, ids[0]).status_code == 403
    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()
    assert _request(client, ids[1]).status_code == 403
