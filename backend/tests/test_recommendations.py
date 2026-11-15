"""Phase 3 alan bazlı terapist önerilerinin güven ve görünürlük kuralları."""

from sqlalchemy import select

from app.models import Tavsiye, TerapistDogrulama, Uzman
from tests.conftest import login


def _alanlari_hazirla(factory, ids):
    with factory() as db:
        db.get(Uzman, ids[0]).uzmanliklar = ["Kaygı"]
        db.get(Uzman, ids[1]).uzmanliklar = ["Çocuk Terapisi"]
        db.commit()


def _olustur(client, target_id, specialty="Çocuk Terapisi"):
    return client.post(
        "/api/uzman/tavsiyeler",
        json={"uzmanlik": specialty, "uzman_id": target_id},
    )


def test_uzmanlik_ve_adaylar_yalniz_dogrulanmis_profillerden_gelir(env):
    client, factory, ids, _ = env
    _alanlari_hazirla(factory, ids)
    login(client)

    specialties = client.get("/api/uzman/tavsiye-uzmanliklari")
    assert specialties.status_code == 200
    assert specialties.json() == {"uzmanliklar": ["Çocuk Terapisi"]}

    candidates = client.get(
        "/api/uzman/tavsiye-adaylari",
        params={"uzmanlik": "Çocuk Terapisi"},
    )
    assert candidates.status_code == 200
    assert candidates.json()["terapistler"] == [
        {"id": ids[1], "ad": "Örnek Uzman 1"}
    ]
    assert (
        client.get(
            "/api/uzman/tavsiye-adaylari",
            params={"uzmanlik": "Kaygı"},
        ).status_code
        == 422
    )


def test_oneri_olusturulur_ve_profilde_alan_altinda_gorunur(env):
    client, factory, ids, _ = env
    _alanlari_hazirla(factory, ids)
    login(client)

    created = _olustur(client, ids[1])
    assert created.status_code == 201, created.text
    assert created.json()["terapist"]["id"] == ids[1]
    own = client.get("/api/uzman/tavsiyeler").json()
    assert own["tavsiyeler"][0]["uzmanlik"] == "Çocuk Terapisi"

    public = client.get(f"/api/uzmanlar/{ids[0]}/tavsiyeler").json()
    assert public == {
        "toplam": 1,
        "gruplar": [
            {
                "uzmanlik": "Çocuk Terapisi",
                "terapistler": [{"id": ids[1], "ad": "Örnek Uzman 1"}],
            }
        ],
    }
    with factory() as db:
        recommendation = db.get(Tavsiye, (ids[0], ids[1]))
        assert recommendation.uzmanlik == "Çocuk Terapisi"
        assert recommendation.olusturma > 0


def test_duplicate_kendi_profili_ve_yanlis_alan_engellenir(env):
    client, factory, ids, _ = env
    _alanlari_hazirla(factory, ids)
    login(client)

    assert _olustur(client, ids[1]).status_code == 201
    assert _olustur(client, ids[1]).status_code == 409
    assert _olustur(client, ids[0]).status_code == 403
    assert _olustur(client, ids[1], "Yetişkin Terapisi").status_code == 422
    assert _olustur(client, ids[1], "Kaygı").status_code == 422


def test_yetkisiz_ve_dogrulanmamis_oneri_engellenir(env):
    client, factory, ids, _ = env
    _alanlari_hazirla(factory, ids)
    assert _olustur(client, ids[1]).status_code == 401

    login(client)
    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()
    assert _olustur(client, ids[1]).status_code == 403


def test_hedef_dogrulamasini_kaybederse_public_listeden_gizlenir(env):
    client, factory, ids, _ = env
    _alanlari_hazirla(factory, ids)
    login(client)
    assert _olustur(client, ids[1]).status_code == 201

    with factory() as db:
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[1]
            )
        )
        verification.durum = "pending"
        db.commit()

    public = client.get(f"/api/uzmanlar/{ids[0]}/tavsiyeler").json()
    assert public == {"toplam": 0, "gruplar": []}
    own = client.get("/api/uzman/tavsiyeler").json()["tavsiyeler"]
    assert own[0]["aktif"] is False
    deleted = client.request(
        "DELETE",
        f"/api/uzman/tavsiyeler/{ids[1]}",
        json={},
    )
    assert deleted.status_code == 204
    assert client.get("/api/uzman/tavsiyeler").json()["tavsiyeler"] == []
