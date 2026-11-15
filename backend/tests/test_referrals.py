"""Phase 4 anonim referral linkleri, veri minimizasyonu ve olay takibi."""

from urllib.parse import urlparse

from sqlalchemy import select

from app.models import (
    DanisanYonlendirme,
    TerapistDogrulama,
    Uzman,
    YonlendirmeHedefi,
    YonlendirmeOlayi,
)
from app.security import ozet
from tests.conftest import login


def _olustur(client, target_ids, reason="schedule_full", **extra):
    return client.post(
        "/api/uzman/yonlendirmeler",
        json={"neden": reason, "uzman_ids": target_ids, **extra},
    )


def _token(response) -> str:
    return urlparse(response.json()["url"]).path.rsplit("/", 1)[-1]


def test_referral_ham_token_ve_danisan_verisi_saklamaz(env):
    client, factory, ids, _ = env
    login(client)
    created = _olustur(client, [ids[1]], "outside_specialty")
    assert created.status_code == 201, created.text
    assert created.json()["view_count"] == 0
    token = _token(created)

    with factory() as db:
        referral = db.scalar(select(DanisanYonlendirme))
        assert referral.token_ozeti == ozet(token)
        assert referral.token_ozeti != token
        assert referral.neden == "outside_specialty"
        assert referral.goruntulenme_sayisi == 0
        assert db.scalar(select(YonlendirmeHedefi)).uzman_id == ids[1]
        events = list(db.scalars(select(YonlendirmeOlayi)))
        assert [event.olay for event in events] == ["referral_created"]
        assert events[0].hedef_uzman_id is None
    columns = {column.name for column in DanisanYonlendirme.__table__.columns}
    assert columns == {
        "id",
        "yonlendiren_uzman_id",
        "token_ozeti",
        "neden",
        "durum",
        "olusturma",
        "sure_bitimi",
        "view_count",
    }

    rejected = _olustur(
        client,
        [ids[1]],
        danisan_adi="Bu alan kabul edilmemeli",
    )
    assert rejected.status_code == 422


def test_anonymous_acma_ve_profil_tiklamasi_izlenir(env):
    client, factory, ids, _ = env
    login(client)
    created = _olustur(client, [ids[1]])
    token = _token(created)

    opened = client.get(f"/api/yonlendirmeler/{token}")
    assert opened.status_code == 200
    assert opened.json()["yonlendiren"]["id"] == ids[0]
    assert opened.json()["terapistler"][0]["id"] == ids[1]
    assert client.get(f"/api/yonlendirmeler/{token}").status_code == 200

    clicked = client.get(
        f"/api/yonlendirmeler/{token}/tikla/{ids[1]}",
        follow_redirects=False,
    )
    assert clicked.status_code == 303
    assert clicked.headers["location"].endswith(f"/uzman/{ids[1]}")
    with factory() as db:
        events = list(
            db.scalars(
                select(YonlendirmeOlayi).order_by(YonlendirmeOlayi.zaman)
            )
        )
        assert [event.olay for event in events] == [
            "referral_created",
            "referral_opened",
            "referral_opened",
            "profile_clicked_from_referral",
        ]
        referral = db.scalar(select(DanisanYonlendirme))
        assert referral.goruntulenme_sayisi == 2
        assert events[-1].hedef_uzman_id == ids[1]

    history = client.get("/api/uzman/yonlendirmeler")
    assert history.status_code == 200
    assert history.json()["yonlendirmeler"][0]["view_count"] == 2


def test_yalniz_dogrulanmis_farkli_terapistler_hedef_olabilir(env):
    client, factory, ids, _ = env
    assert _olustur(client, [ids[1]]).status_code == 401
    login(client)
    assert _olustur(client, [ids[0]]).status_code == 403
    assert _olustur(client, [ids[1], ids[1]]).status_code == 422
    assert _olustur(client, [ids[1]], reason="invalid").status_code == 422

    with factory() as db:
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[1]
            )
        )
        verification.durum = "pending"
        db.commit()
    assert _olustur(client, [ids[1]]).status_code == 422


def test_adaylar_kendini_ve_dogrulanmamis_profili_gizler(env):
    client, factory, ids, _ = env
    login(client)
    candidates = client.get("/api/uzman/yonlendirme-adaylari")
    assert candidates.status_code == 200
    candidate_ids = [item["id"] for item in candidates.json()["terapistler"]]
    assert candidate_ids == [ids[1]]

    with factory() as db:
        db.get(Uzman, ids[1]).onayli = False
        db.commit()
    assert client.get("/api/uzman/yonlendirme-adaylari").json() == {
        "terapistler": []
    }


def test_suresi_dolan_link_acilmaz(env):
    client, factory, ids, _ = env
    login(client)
    created = _olustur(client, [ids[1]])
    token = _token(created)
    with factory() as db:
        referral = db.scalar(select(DanisanYonlendirme))
        referral.sure_bitimi = 1
        db.commit()

    expired = client.get(f"/api/yonlendirmeler/{token}")
    assert expired.status_code == 410
    with factory() as db:
        referral = db.scalar(select(DanisanYonlendirme))
        assert referral.durum == "expired"
        assert referral.goruntulenme_sayisi == 0
        assert [
            event.olay for event in db.scalars(select(YonlendirmeOlayi))
        ] == ["referral_created"]
