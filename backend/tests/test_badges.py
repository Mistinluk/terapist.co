"""Phase 8 doğrulanmış website rozeti ve veri-minimal olay takibi."""

from sqlalchemy import select

from app.models import (
    TerapistDogrulama,
    Uzman,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
)
from tests.conftest import login


def test_rozet_yalniz_dogrulanmis_terapist_tarafindan_olusturulur(env):
    client, factory, ids, _ = env
    assert client.get("/api/uzman/website-badge").status_code == 401
    assert client.post("/api/uzman/website-badge", json={}).status_code == 401

    login(client)
    summary = client.get("/api/uzman/website-badge")
    assert summary.status_code == 200
    assert summary.json() == {"uygun": True, "rozet": None}

    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()

    assert client.get("/api/uzman/website-badge").json()["uygun"] is False
    assert client.post("/api/uzman/website-badge", json={}).status_code == 403


def test_rozet_tekil_olusturulur_ve_responsive_embed_kodu_doner(env):
    client, factory, ids, _ = env
    login(client)

    created = client.post("/api/uzman/website-badge", json={})
    repeated = client.post("/api/uzman/website-badge", json={})

    assert created.status_code == 201
    assert repeated.status_code == 201
    result = created.json()
    assert repeated.json()["id"] == result["id"]
    assert result["pasaport_url"].endswith(
        "/" + client.get("/api/uzman/profil").json()["kullanici_adi"]
    )
    assert f"/badge/{result['id']}/click" in result["embed_code"]
    assert f"/badge/{result['id']}.svg" in result["embed_code"]
    assert 'alt="Terapist.co Doğrulanmış Terapist"' in result["embed_code"]
    assert "max-width:280px" in result["embed_code"]
    assert "height:auto" in result["embed_code"]
    assert 'decoding="async"' in result["embed_code"]
    assert 'referrerpolicy="no-referrer"' in result["embed_code"]
    assert "<script" not in result["embed_code"]
    with factory() as db:
        badges = list(db.scalars(select(WebsiteRozeti)))
        events = list(db.scalars(select(WebsiteRozetiOlayi)))
        assert len(badges) == 1
        assert badges[0].uzman_id == ids[0]
        assert [event.olay for event in events] == ["badge_created"]


def test_rozet_gorseli_yayinlanir_ve_tiklama_pasaporta_gider(env):
    client, factory, _, _ = env
    login(client)
    result = client.post("/api/uzman/website-badge", json={}).json()

    image = client.get(f"/badge/{result['id']}.svg")
    head = client.head(f"/badge/{result['id']}.svg")
    clicked = client.get(
        f"/badge/{result['id']}/click", follow_redirects=False
    )

    assert image.status_code == 200
    assert head.status_code == 200
    assert image.headers["content-type"].startswith("image/svg+xml")
    assert "data:image/png;base64," in image.text
    assert 'preserveAspectRatio="xMidYMid meet"' in image.text
    assert image.headers["cache-control"] == (
        "public, max-age=60, must-revalidate"
    )
    assert image.headers["cross-origin-resource-policy"] == "cross-origin"
    assert "Terapist.co" in image.text
    assert "<script" not in image.text
    assert clicked.status_code == 303
    assert clicked.headers["location"] == result["pasaport_url"]
    assert clicked.headers["cache-control"] == "no-store"
    with factory() as db:
        events = list(
            db.scalars(
                select(WebsiteRozetiOlayi).order_by(
                    WebsiteRozetiOlayi.zaman,
                    WebsiteRozetiOlayi.olay,
                )
            )
        )
        assert sorted(event.olay for event in events) == [
            "badge_clicked",
            "badge_created",
        ]
        columns = {
            column.name for column in WebsiteRozetiOlayi.__table__.columns
        }
        assert columns == {"id", "rozet_id", "olay", "zaman"}


def test_dogrulamasi_kalkan_rozet_yayinlanmaz_ve_tiklama_izlenmez(env):
    client, factory, ids, _ = env
    login(client)
    result = client.post("/api/uzman/website-badge", json={}).json()
    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[0]
            )
        )
        verification.durum = "pending"
        db.commit()

    assert client.get(f"/badge/{result['id']}.svg").status_code == 404
    summary = client.get("/api/uzman/website-badge")
    assert summary.status_code == 200
    assert summary.json() == {"uygun": False, "rozet": None}
    assert (
        client.get(
            f"/badge/{result['id']}/click", follow_redirects=False
        ).status_code
        == 404
    )
    with factory() as db:
        assert [
            event.olay for event in db.scalars(select(WebsiteRozetiOlayi))
        ] == ["badge_created"]
