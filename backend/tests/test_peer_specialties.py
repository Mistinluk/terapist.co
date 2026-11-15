"""Phase 14 kontrollü meslektaş ilişkilendirme kanıtları."""

import pytest
from sqlalchemy import select

from app.models import MeslektasUzmanlikIliskisi, TerapistDogrulama, Uzman
from tests.conftest import login


def _create(
    client,
    target_id,
    specialty="Çocuk Terapisi",
    context="same_training_program",
    **extra,
):
    return client.post(
        f"/api/uzmanlar/{target_id}/meslektas-uzmanliklari",
        json={
            "uzmanlik": specialty,
            "profesyonel_baglam": context,
            **extra,
        },
    )


def _prepare_target(factory, target_id):
    with factory() as db:
        db.get(Uzman, target_id).uzmanliklar = ["Çocuk Terapisi"]
        db.commit()


def test_dogrulanmis_meslektas_alani_iliskilendirir_ve_public_sayilir(env):
    client, factory, ids, _ = env
    _prepare_target(factory, ids[1])
    login(client)
    created = _create(client, ids[1])
    assert created.status_code == 200, created.text
    assert created.json()["alanlar"] == [
        {"uzmanlik": "Çocuk Terapisi", "meslektas_sayisi": 1}
    ]

    public = client.get(f"/api/uzmanlar/{ids[1]}/meslektas-uzmanliklari")
    assert public.status_code == 200
    assert public.json()["toplam_alan"] == 1
    assert "profesyonel_baglam" not in public.text
    with factory() as db:
        row = db.scalar(select(MeslektasUzmanlikIliskisi))
        assert row.iliskilendiren_uzman_id == ids[0]
        assert row.hedef_uzman_id == ids[1]
        assert row.profesyonel_baglam == "same_training_program"


def test_ayni_meslektas_ayni_alanda_yalniz_bir_kez_sayilir(env):
    client, factory, ids, _ = env
    _prepare_target(factory, ids[1])
    login(client)
    assert _create(client, ids[1]).status_code == 200
    updated = _create(client, ids[1], context="worked_together")
    assert updated.status_code == 200
    assert updated.json()["alanlar"][0]["meslektas_sayisi"] == 1
    with factory() as db:
        rows = list(db.scalars(select(MeslektasUzmanlikIliskisi)))
        assert len(rows) == 1
        assert rows[0].profesyonel_baglam == "worked_together"


def test_yetkisiz_kendi_ve_gecersiz_alan_engellenir(env):
    client, factory, ids, _ = env
    _prepare_target(factory, ids[1])
    assert _create(client, ids[1]).status_code == 401
    login(client)
    assert _create(client, ids[0], "Kaygı").status_code == 403
    assert _create(client, ids[1], "Profilde olmayan alan").status_code == 422
    invalid_context = _create(client, ids[1], context="friend")
    assert invalid_context.status_code == 422
    testimonial = _create(
        client,
        ids[1],
        yorum="Bu terapist çok iyidir.",
    )
    assert testimonial.status_code == 422


@pytest.mark.parametrize(
    "context",
    [
        "worked_together",
        "same_training_program",
        "supervision_context",
        "referred_client_to",
        "received_client_referral",
        "follows_professional_work",
    ],
)
def test_alti_kontrollu_profesyonel_baglam_kabul_edilir(env, context):
    client, factory, ids, _ = env
    _prepare_target(factory, ids[1])
    login(client)
    assert _create(client, ids[1], context=context).status_code == 200


def test_profildeki_yaklasim_da_iliskilendirilebilir(env):
    client, factory, ids, _ = env
    with factory() as db:
        target = db.get(Uzman, ids[1])
        target.uzmanliklar = ["Kaygı bozuklukları"]
        target.ekoller = ["BDT"]
        db.commit()
    login(client)
    created = _create(client, ids[1], specialty="BDT")
    assert created.status_code == 200, created.text
    assert created.json()["alanlar"] == [
        {"uzmanlik": "BDT", "meslektas_sayisi": 1}
    ]


def test_dogrulanmamis_katkida_bulunan_public_sayidan_cikar(env):
    client, factory, ids, _ = env
    _prepare_target(factory, ids[1])
    login(client)
    assert _create(client, ids[1]).status_code == 200
    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()
    result = client.get(f"/api/uzmanlar/{ids[1]}/meslektas-uzmanliklari")
    assert result.json() == {"toplam_alan": 0, "alanlar": []}


def test_dogrulanmamis_hedef_gizlenir(env):
    client, factory, ids, _ = env
    with factory() as db:
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[1]
            )
        )
        verification.durum = "pending"
        db.commit()
    assert (
        client.get(
            f"/api/uzmanlar/{ids[1]}/meslektas-uzmanliklari"
        ).status_code
        == 404
    )
