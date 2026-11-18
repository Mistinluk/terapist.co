"""Üyesiz özel bağlantı: yetki sınırı, süre, tarih değişimi ve takvim.

Her senaryo SQLite ve yapılandırıldıysa ayrı PostgreSQL test DB'sinde
çalışır. Google istemcisi sahtedir; canlı hesaplara istek gönderilmez.
Çerezlerin temizlenmesi, linkin başka cihazdaki erişimini temsil eder.
"""

import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier
from urllib.parse import urlsplit

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.main import app
from app.models import Denetim, Randevu, RandevuTakvimIsi, Uzman
from app.randevu_takvim import bir_is_calistir
from app.security import ozet
from tests.conftest import login
from tests.test_appointments import payload
from tests.test_google_calendar import bagla
from tests.test_google_calendar import google as google


def reserve(client, profile_id):
    """API'den gerçek bir talep ve yalnız bu talebe ait anahtar üretir."""
    response = client.post("/api/randevular", json=payload(client, profile_id))
    assert response.status_code == 201, response.text
    result = response.json()
    return result, urlsplit(result["takip_yolu"]).fragment.split("=", 1)[1]


def private(client, result, token, action="goruntule", **values):
    """Anahtarı yalnız JSON gövdesinde taşıyan üyesiz isteği gönderir."""
    return client.post(
        f"/api/danisan/randevu/{result['randevu_id']}/{action}",
        json={"anahtar": token, **values},
    )


def test_link_baska_cihazda_tek_kayit_acar_ve_iptal_eder(env):
    """İletişim/anahtar sızmaz; üyesiz iptal panel ve sayımı değiştirir."""
    client, factory, ids, unrelated_id = env
    result, token = reserve(client, ids[0])
    assert len(token) == 43 and "?" not in result["takip_yolu"]
    client.cookies.clear()
    assert client.get("/api/danisan/randevular").json() == []
    response = private(client, result, token)
    assert response.status_code == 200
    assert set(response.json()) == {
        "id",
        "uzman_id",
        "uzman_adi",
        "baslangic",
        "bitis",
        "durum",
        "takip_son_kullanim",
    }
    assert (
        private(client, {"randevu_id": unrelated_id}, token).status_code == 404
    )
    with factory() as db:
        row = db.get(Randevu, result["randevu_id"])
        assert row.takip_anahtar_ozeti == ozet(token)
        assert row.takip_son_kullanim > int(time.time()) + 89 * 86400
        for event in db.scalars(select(Denetim)):
            assert token not in str(vars(event))
    assert private(client, result, token, "iptal").status_code == 204
    assert private(client, result, token).json()["durum"] == "iptal"
    login(client)
    panel = client.get("/api/uzman/randevular").json()
    assert (
        next(b for b in panel if b["id"] == result["randevu_id"])["durum"]
        == "iptal"
    )
    assert client.get("/api/uzman/randevu-ozeti").json()["iptal"] == 1


def test_anahtar_gereklidir_suresi_dolunca_tum_islemler_kapanir(env):
    """Bozuk, eksik, query'deki ve süresi dolmuş anahtar yetki vermez."""
    client, factory, ids, _ = env
    result, token = reserve(client, ids[0])
    path = f"/api/danisan/randevu/{result['randevu_id']}"
    for action in ("goruntule", "saatler", "iptal", "tarih"):
        values = (
            {"baslangic": payload(client, ids[0])["baslangic"]}
            if action == "tarih"
            else {}
        )
        assert (
            private(client, result, "x" * 43, action, **values).status_code
            == 404
        )
        response = client.post(f"{path}/{action}?anahtar={token}", json={})
        assert response.status_code == 422
        assert token not in response.text
    invalid = private(client, result, token + "invalid")
    assert invalid.status_code == 422 and token not in invalid.text
    response = client.post(
        f"{path}/goruntule",
        json={"anahtar": token},
        headers={"Origin": "https://untrusted.example"},
    )
    assert response.status_code == 403
    with factory() as db:
        db.get(Randevu, result["randevu_id"]).takip_son_kullanim = (
            int(time.time()) - 1
        )
        db.commit()
    for action in ("goruntule", "saatler", "iptal", "tarih"):
        values = (
            {"baslangic": payload(client, ids[0])["baslangic"]}
            if action == "tarih"
            else {}
        )
        assert (
            private(client, result, token, action, **values).status_code == 404
        )


def test_yenileme_yalniz_sahibine_acik_ve_eski_linki_kapatir(env):
    """Tarayıcı/uzman yeni link verebilir; diğer uzman veya anonim veremez."""
    client, _, ids, _ = env
    result, token = reserve(client, ids[0])
    route = f"/randevular/{result['randevu_id']}/baglanti"
    issued = client.post("/api/danisan" + route, json={})
    assert issued.status_code == 200
    assert private(client, result, token).status_code == 404
    token = urlsplit(issued.json()["takip_yolu"]).fragment.split("=", 1)[1]
    client.cookies.clear()
    assert private(client, result, token).status_code == 200
    assert client.post("/api/danisan" + route, json={}).status_code == 404
    assert client.post("/api/uzman" + route, json={}).status_code == 401
    login(client, 1)
    assert client.post("/api/uzman" + route, json={}).status_code == 404
    login(client)
    issued = client.post("/api/uzman" + route, json={})
    assert issued.status_code == 200
    assert private(client, result, token).status_code == 404
    token = urlsplit(issued.json()["takip_yolu"]).fragment.split("=", 1)[1]
    client.cookies.clear()
    assert private(client, result, token).status_code == 200


def test_tarih_degisiminde_kimlik_sure_ve_sayim_korunur(env):
    """Yeniden onay gerekir; yeni talep zamanı gecikme hesabını sıfırlar."""
    client, factory, ids, _ = env
    result, token = reserve(client, ids[0])
    old = private(client, result, token).json()
    created = int(time.time()) - 40 * 86400
    with factory() as db:
        row = db.get(Randevu, result["randevu_id"])
        row.durum = "onaylandi"
        row.bitis = row.baslangic + 50 * 60
        row.olusturma = created
        db.get(Uzman, ids[0]).seans_suresi_dakika = 30
        db.commit()
    new_slot = private(client, result, token, "saatler").json()["saatler"][0]
    response = private(client, result, token, "tarih", baslangic=new_slot)
    assert response.status_code == 200, response.text
    row = response.json()
    assert row["id"] == old["id"] and row["durum"] == "bekliyor"
    assert (
        datetime.fromisoformat(row["bitis"])
        - datetime.fromisoformat(row["baslangic"])
    ).total_seconds() == 3000
    slots = client.get(f"/api/uzmanlar/{ids[0]}/saatler").json()["saatler"]
    assert new_slot not in slots
    assert datetime.fromisoformat(old["baslangic"]) in [
        datetime.fromisoformat(s) for s in slots
    ]
    assert (
        client.get("/api/danisan/randevular").json()[0]["baslangic"]
        == row["baslangic"]
    )
    with factory() as db:
        stored = db.get(Randevu, row["id"])
        assert stored.olusturma == created
        assert stored.son_talep_zamani >= int(time.time()) - 10
        assert db.scalar(select(func.count()).select_from(Randevu)) == 2
    login(client)
    panel = client.get("/api/uzman/randevular").json()
    assert (
        next(b for b in panel if b["id"] == row["id"])["baslangic"]
        == row["baslangic"]
    )
    notices = client.get("/api/bildirimler").json()["kayitlar"]
    assert any(n["baslik"] == "Randevu tarihi değiştirildi" for n in notices)
    assert not any(n["baslik"] == "Yanıt bekleyen randevu" for n in notices)
    login(client, 2)
    admin = client.get(f"/api/yonetim/randevular/{row['id']}").json()
    assert admin["yanit_gecikti"] is False
    assert admin["bekleme_suresi_saat"] == 0


@pytest.mark.parametrize("kind", ["dolu", "ayni", "gecmis", "saat_dilimsiz"])
def test_reddedilen_tarih_eski_randevuyu_korur(env, kind):
    """Dolu/geçersiz saate geçiş, eski tarih veya durumu değiştirmemelidir."""
    client, _, ids, _ = env
    result, token = reserve(client, ids[0])
    old = private(client, result, token).json()
    other, other_token = reserve(client, ids[0])
    if kind == "dolu":
        selected = private(client, other, other_token).json()["baslangic"]
    elif kind == "ayni":
        selected = old["baslangic"]
    elif kind == "gecmis":
        selected = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    else:
        selected = "2030-01-01T10:00:00"
    response = private(client, result, token, "tarih", baslangic=selected)
    assert response.status_code == (422 if kind == "saat_dilimsiz" else 409)
    assert private(client, result, token).json() == old


@pytest.mark.parametrize(
    "status", ["iptal", "reddedildi", "tamamlandi", "gecmis"]
)
def test_kapali_ve_gecmis_randevu_degismez(env, status):
    """Geçerli link geçmiş durumu gösterir, fakat randevuyu yeniden açmaz."""
    client, factory, ids, _ = env
    result, token = reserve(client, ids[0])
    selected = payload(client, ids[0])["baslangic"]
    with factory() as db:
        row = db.get(Randevu, result["randevu_id"])
        if status == "gecmis":
            row.baslangic = int(time.time()) - 60
        else:
            row.durum = status
        db.commit()
    assert private(client, result, token).status_code == 200
    for action in ("saatler", "iptal", "tarih"):
        values = {"baslangic": selected} if action == "tarih" else {}
        assert (
            private(client, result, token, action, **values).status_code == 409
        )


def test_yeni_tarih_ayni_google_etkinligini_tasir(env, google):
    """Üyesiz taşıma mevcut etkinliği günceller; iptal onu kaldırır."""
    client, factory, ids, _ = env
    login(client)
    bagla(client)
    while bir_is_calistir(factory):
        pass
    result, token = reserve(client, ids[0])
    assert bir_is_calistir(factory)
    with factory() as db:
        event_id = db.get(RandevuTakvimIsi, result["randevu_id"]).etkinlik_id
    event_count = len(google.events)
    client.cookies.clear()
    slot = private(client, result, token, "saatler").json()["saatler"][0]
    assert (
        private(client, result, token, "tarih", baslangic=slot).status_code
        == 200
    )
    assert bir_is_calistir(factory)
    event = google.events[event_id]
    assert len(google.events) == event_count
    assert datetime.fromisoformat(
        event["start"]["dateTime"]
    ) == datetime.fromisoformat(slot)
    assert event["status"] == "tentative" and token not in json.dumps(event)
    assert private(client, result, token, "iptal").status_code == 204
    assert bir_is_calistir(factory)
    assert event_id not in google.events


def test_iki_tarih_degisikligi_ayni_saati_alamaz(env):
    """PostgreSQL kilidi aynı hedef saate gelen eşzamanlı talepleri ayırır."""
    client, factory, ids, _ = env
    with factory() as db:
        if db.bind.dialect.name != "postgresql":
            pytest.skip("Satır kilidi yalnız PostgreSQL'de sınanır.")
    bookings = [reserve(client, ids[0]), reserve(client, ids[0])]
    slot = payload(client, ids[0])["baslangic"]
    barrier = Barrier(2)

    def move(pair):
        with TestClient(app, raise_server_exceptions=False) as guest:
            guest.headers["Origin"] = "http://localhost:5173"
            barrier.wait(timeout=10)
            result, token = pair
            return private(
                guest, result, token, "tarih", baslangic=slot
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(move, bookings)) == [200, 409]
    with factory() as db:
        stamp = int(datetime.fromisoformat(slot).timestamp())
        assert (
            db.scalar(
                select(func.count())
                .select_from(Randevu)
                .where(Randevu.baslangic == stamp)
            )
            == 1
        )
