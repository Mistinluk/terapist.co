"""Phase 12 görünürlük, raporlama, kaldırma ve engelleme davranışları."""

import time

from sqlalchemy import select

from app.models import (
    Denetim,
    Kullanici,
    KurucuUye,
    MeslektasUzmanlikIliskisi,
    ModerasyonRaporu,
    ProfesyonelBaglanti,
    Tavsiye,
    Uzman,
    UzmanEngeli,
    baglanti_cifti,
)
from tests.conftest import login
from tests.test_connections import _request


def _professional_records(factory, ids):
    now = int(time.time())
    with factory() as db:
        owner = db.get(Uzman, ids[0])
        colleague = db.get(Uzman, ids[1])
        owner.kullanici_adi = "gizlilik-sahibi"
        owner.uzmanliklar = ["Kaygı"]
        colleague.uzmanliklar = ["Çocuk Terapisi"]
        admin_id = db.scalar(
            select(Kullanici.id).where(Kullanici.rol == "yonetici")
        )
        db.add_all(
            [
                ProfesyonelBaglanti(
                    isteyen_uzman_id=colleague.id,
                    alici_uzman_id=owner.id,
                    cift_anahtari=baglanti_cifti(owner.id, colleague.id),
                    iliski_turu="invited_to_platform",
                    durum="accepted",
                    istek_zamani=now,
                    yanit_zamani=now,
                ),
                MeslektasUzmanlikIliskisi(
                    iliskilendiren_uzman_id=colleague.id,
                    hedef_uzman_id=owner.id,
                    uzmanlik="Kaygı",
                    profesyonel_baglam="follows_professional_work",
                    olusturma=now,
                    guncelleme=now,
                ),
                Tavsiye(
                    veren_id=owner.id,
                    alan_id=colleague.id,
                    uzmanlik="Çocuk Terapisi",
                    olusturma=now,
                ),
                KurucuUye(
                    uzman_id=owner.id,
                    kurucu_no=11,
                    verilme=now,
                    veren_kullanici_id=admin_id,
                ),
            ]
        )
        db.commit()


def test_gorunurluk_tercihleri_public_profili_ve_pasaportu_sinirlar(env):
    client, factory, ids, _ = env
    _professional_records(factory, ids)
    login(client)
    hidden = {
        "davet_edeni_goster": False,
        "mesleki_agi_goster": False,
        "uzmanlik_iliskilerini_goster": False,
        "tavsiyeleri_goster": False,
        "yonlendirme_agini_goster": False,
        "kurucu_durumunu_goster": False,
    }
    response = client.put("/api/uzman/gorunurluk", json=hidden)
    assert response.status_code == 200, response.text
    assert response.json() == hidden
    assert client.get("/api/uzman/profil").json()["kurucu_no"] == 11
    assert client.get(f"/api/uzmanlar/{ids[0]}").json()["kurucu_no"] is None
    assert client.get(f"/api/uzmanlar/{ids[0]}/baglantilar").json() == {
        "toplam": 0,
        "baglantilar": [],
    }
    peer = client.get(f"/api/uzmanlar/{ids[0]}/meslektas-uzmanliklari").json()
    assert peer == {"toplam_alan": 0, "alanlar": []}
    assert client.get(f"/api/uzmanlar/{ids[0]}/tavsiyeler").json() == {
        "toplam": 0,
        "gruplar": [],
    }
    passport = client.get("/passport/gizlilik-sahibi")
    assert "Terapist.co'ya davet etti" not in passport.text
    assert "1 meslektaş" not in passport.text
    assert "Çocuk Terapisi" not in passport.text
    assert "Founding Therapist #0011" not in passport.text
    assert "Kurucu statüsü" not in passport.text


def test_baglanti_raporu_yalniz_tarafca_acilir_ve_admin_sonuclandirir(env):
    client, factory, ids, _ = env
    login(client)
    connection_id = _request(client, ids[1]).json()["id"]
    reported = client.post(
        f"/api/uzman/baglantilar/{connection_id}/rapor",
        json={"aciklama": "İlişki türü gerçeği yansıtmıyor."},
    )
    assert reported.status_code == 201, reported.text
    report_id = reported.json()["id"]
    assert (
        client.post(
            f"/api/uzman/baglantilar/{connection_id}/rapor",
            json={},
        ).status_code
        == 409
    )

    login(client, 2)
    reports = client.get("/api/yonetim/moderasyon-raporlari").json()
    assert reports[0]["id"] == report_id
    assert reports[0]["tur"] == "connection"
    reviewed = client.patch(
        f"/api/yonetim/moderasyon-raporlari/{report_id}",
        json={"durum": "resolved"},
    )
    assert reviewed.json()["durum"] == "resolved"
    with factory() as db:
        report = db.get(ModerasyonRaporu, report_id)
        assert report.inceleyen_kullanici_id is not None
        actions = {row.islem for row in db.scalars(select(Denetim))}
        assert "moderasyon.connection.rapor" in actions
        assert "moderasyon.rapor_resolved" in actions


def test_profil_sahibi_yanlis_iliskiyi_raporlar_ve_kaldirir(env):
    client, factory, ids, _ = env
    _professional_records(factory, ids)
    login(client, 1)
    assert (
        client.get("/api/uzman/endorsementlar").json()["endorsementlar"] == []
    )
    login(client)
    own = client.get("/api/uzman/endorsementlar").json()["endorsementlar"]
    assert len(own) == 1
    association_id = own[0]["id"]
    reported = client.post(
        f"/api/uzman/endorsementlar/{association_id}/rapor",
        json={"aciklama": "Bu alanda birlikte çalışmadık."},
    )
    assert reported.status_code == 201
    removed = client.request(
        "DELETE",
        f"/api/uzman/endorsementlar/{association_id}",
        json={},
    )
    assert removed.status_code == 204
    with factory() as db:
        assert db.get(MeslektasUzmanlikIliskisi, association_id) is None
        report = db.get(ModerasyonRaporu, reported.json()["id"])
        assert report.kaynak_id == association_id


def test_engelleme_iliskiyi_kaldirir_ve_yeni_etkilesimi_durdurur(env):
    client, factory, ids, _ = env
    _professional_records(factory, ids)
    login(client)
    blocked = client.post(f"/api/uzman/engeller/{ids[1]}", json={})
    assert blocked.status_code == 201, blocked.text
    with factory() as db:
        connection = db.scalar(select(ProfesyonelBaglanti))
        assert connection.durum == "revoked"
        assert db.scalar(select(MeslektasUzmanlikIliskisi)) is None
        assert db.scalar(select(Tavsiye)) is None
        assert db.get(UzmanEngeli, (ids[0], ids[1])) is not None
    assert _request(client, ids[1]).status_code == 403
    assert (
        client.post(
            f"/api/uzmanlar/{ids[1]}/meslektas-uzmanliklari",
            json={
                "uzmanlik": "Çocuk Terapisi",
                "profesyonel_baglam": "same_training_program",
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/uzman/tavsiyeler",
            json={"uzman_id": ids[1], "uzmanlik": "Çocuk Terapisi"},
        ).status_code
        == 403
    )
    assert (
        client.request(
            "DELETE", f"/api/uzman/engeller/{ids[1]}", json={}
        ).status_code
        == 204
    )
    assert client.get("/api/uzman/engeller").json() == {"engeller": []}
