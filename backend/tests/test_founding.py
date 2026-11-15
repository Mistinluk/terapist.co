"""Phase 7 kurucu terapist kapasitesi, sırası ve değişmez kimliği."""

from sqlalchemy import delete, select

from app.models import (
    KurucuProgramiAyari,
    KurucuUye,
    TerapistDogrulama,
    Uzman,
)
from tests.conftest import login


def _reset_program(factory, ids):
    with factory() as db:
        db.execute(delete(KurucuUye))
        db.execute(delete(KurucuProgramiAyari))
        for profile_id in ids:
            db.get(Uzman, profile_id).onayli = False
            verification = db.scalar(
                select(TerapistDogrulama).where(
                    TerapistDogrulama.uzman_id == profile_id
                )
            )
            verification.durum = "pending"
            verification.incelenme = None
            verification.inceleyen_kullanici_id = None
        db.commit()


def _set_maximum(client, maximum):
    return client.patch(
        "/api/yonetim/kurucu-programi", json={"azami_uye": maximum}
    )


def _verify(client, profile_id, approved=True):
    return client.patch(
        f"/api/yonetim/uzmanlar/{profile_id}",
        json={"onayli": approved},
    )


def test_ilk_dogrulananlar_sirali_kurucu_kimligi_alir(env):
    client, factory, ids, _ = env
    _reset_program(factory, ids)
    login(client, 2)
    assert _set_maximum(client, 2).status_code == 200

    assert _verify(client, ids[1]).status_code == 204
    assert _verify(client, ids[0]).status_code == 204

    with factory() as db:
        founders = list(
            db.scalars(select(KurucuUye).order_by(KurucuUye.kurucu_no))
        )
        assert [(row.uzman_id, row.kurucu_no) for row in founders] == [
            (ids[1], 1),
            (ids[0], 2),
        ]
    public = client.get(f"/api/uzmanlar/{ids[1]}")
    assert public.json()["kurucu_no"] == 1
    summary = client.get("/api/yonetim/kurucu-programi").json()
    assert summary == {
        "azami_uye": 2,
        "atanmis_uye": 2,
        "kalan": 0,
        "siradaki_numara": None,
    }


def test_kapasite_artinca_onceki_dogrulanmis_terapist_siraya_girer(env):
    client, factory, ids, _ = env
    _reset_program(factory, ids)
    login(client, 2)
    assert _set_maximum(client, 1).status_code == 200
    assert _verify(client, ids[0]).status_code == 204
    assert _verify(client, ids[1]).status_code == 204
    with factory() as db:
        assert db.get(Uzman, ids[1]).kurucu_no is None

    raised = _set_maximum(client, 2)

    assert raised.status_code == 200
    assert raised.json()["atanmis_uye"] == 2
    with factory() as db:
        assert db.get(Uzman, ids[0]).kurucu_no == 1
        assert db.get(Uzman, ids[1]).kurucu_no == 2
    assert _set_maximum(client, 1).status_code == 409


def test_kurucu_kimligi_yayindan_kalkinca_korunur(env):
    client, factory, ids, _ = env
    _reset_program(factory, ids)
    login(client, 2)
    assert _set_maximum(client, 1).status_code == 200
    assert _verify(client, ids[0]).status_code == 204
    assert _verify(client, ids[0], approved=False).status_code == 204
    assert _verify(client, ids[0]).status_code == 204

    with factory() as db:
        founders = list(db.scalars(select(KurucuUye)))
        assert len(founders) == 1
        assert founders[0].uzman_id == ids[0]
        assert founders[0].kurucu_no == 1


def test_kurucu_programi_yalniz_yonetici_tarafindan_degistirilir(env):
    client, _, _, _ = env
    assert client.get("/api/yonetim/kurucu-programi").status_code == 401
    login(client)
    assert _set_maximum(client, 500).status_code == 403
    login(client, 2)
    assert _set_maximum(client, -1).status_code == 422
    assert (
        client.post(
            "/api/yonetim/uzmanlar/gecersiz/kurucu", json={"kurucu_no": 99}
        ).status_code
        == 404
    )
