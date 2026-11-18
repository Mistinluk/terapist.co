"""Google randevu yazma: kalıcılık, tekrar deneme, gizlilik ve iptal."""

import json
from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

from app.google_takvim import GoogleHatasi, GoogleIstemcisi
from app.models import GoogleTakvimBaglantisi, Randevu, RandevuTakvimIsi
from app.randevu_takvim import bir_is_calistir
from tests.conftest import login
from tests.test_appointments import payload
from tests.test_google_calendar import bagla
from tests.test_google_calendar import google as google


def test_talep_onay_iptal_google_ile_tutarli(env, google):
    """İstek, onay ve danışan iptali tek Google kaydının ömrünü yönetir."""
    client, factory, ids, _ = env
    login(client)
    bagla(client)
    while bir_is_calistir(factory):
        pass
    body = payload(client, ids[0])
    result = client.post("/api/randevular", json=body)
    assert result.status_code == 201
    booking_id = result.json()["randevu_id"]
    assert bir_is_calistir(factory)
    with factory() as db:
        job = db.get(RandevuTakvimIsi, booking_id)
        event_id = job.etkinlik_id
        assert job.durum == "esitlendi"
    event = google.events[event_id]
    assert event["status"] == "tentative"
    assert event["visibility"] == "private"
    assert body["ad"] not in json.dumps(event)
    assert body["telefon"] not in json.dumps(event)
    assert not {"attendees", "description", "location"} & event.keys()
    assert (
        client.patch(
            f"/api/uzman/randevular/{booking_id}", json={"durum": "onaylandi"}
        ).status_code
        == 204
    )
    assert bir_is_calistir(factory)
    assert google.events[event_id]["status"] == "confirmed"
    assert (
        client.post(
            f"/api/danisan/randevular/{booking_id}/iptal", json={}
        ).status_code
        == 204
    )
    assert bir_is_calistir(factory)
    assert event_id not in google.events
    assert not bir_is_calistir(factory)


def test_kayip_google_yaniti_randevuyu_kaybettirmez(env, google):
    """Google yanıtı kaybolunca aynı etkinlik yeniden kullanılır."""
    client, factory, ids, _ = env
    login(client)
    bagla(client)
    while bir_is_calistir(factory):
        pass
    count = len(google.events)
    google.write_error = "baglanti"
    booking_id = client.post(
        "/api/randevular", json=payload(client, ids[0])
    ).json()["randevu_id"]
    assert bir_is_calistir(factory)
    with factory() as db:
        assert db.get(Randevu, booking_id).durum == "bekliyor"
        job = db.get(RandevuTakvimIsi, booking_id)
        assert job.durum == "hata" and job.deneme == 1
        event_id = job.etkinlik_id
        retry_at = job.sonraki_deneme
    assert not bir_is_calistir(factory)
    google.write_error = None
    assert bir_is_calistir(factory, retry_at + 1)
    assert len(google.events) == count + 1
    assert event_id in google.events
    with factory() as db:
        assert db.get(RandevuTakvimIsi, booking_id).durum == "esitlendi"


def test_izinsiz_baglanti_yazmaz_ve_talep_devam_eder(env, google):
    """Eski salt-okuma izniyle takvime yazılmaz; yeniden izin istenir."""
    client, factory, ids, _ = env
    google.scope = google.scope.replace(
        " https://www.googleapis.com/auth/calendar.events.owned", ""
    )
    login(client)
    bagla(client)
    assert (
        client.get("/api/uzman/google-takvim").json()["randevu_yazma_izni"]
        is False
    )
    assert (
        client.post(
            "/api/randevular", json=payload(client, ids[0])
        ).status_code
        == 201
    )
    with factory() as db:
        assert db.scalar(select(RandevuTakvimIsi)) is None


def test_etkinlik_olusturma_cakismasinda_ayni_kimlik(monkeypatch):
    """HTTP 404 → POST 409 → PUT sırası mükerrer kayıt üretmez."""
    client = GoogleIstemcisi()
    calls = []

    def request(url, **kwargs):
        calls.append((url, kwargs))
        if len(calls) == 1:
            raise GoogleHatasi("baglanti", 404)
        if len(calls) == 2:
            raise GoogleHatasi("baglanti", 409)
        return {}

    monkeypatch.setattr(client, "_istek", request)
    client.etkinlik_yaz("sahte", "abcdef123", {"summary": "Randevu"})
    assert len(calls) == 3
    assert calls[1][1]["govde"]["id"] == "abcdef123"
    assert calls[0][0] == calls[2][0]
    assert "sendUpdates=none" in calls[0][0]


def test_iki_calisan_ayni_google_isini_gondermez(env, google, monkeypatch):
    """PostgreSQL SKIP LOCKED ile ikinci çalışan kullanılan işi atlar."""
    client, factory, _, _ = env
    with factory() as db:
        if db.bind.dialect.name != "postgresql":
            pytest.skip("Kuyruk satır kilidi gerçek PostgreSQL'de sınanır.")
    login(client)
    bagla(client)
    entered, release = Event(), Event()

    def slow_write(*args):
        entered.set()
        assert release.wait(10)

    from app.google_takvim import google_istemcisi

    monkeypatch.setattr(google_istemcisi, "etkinlik_yaz", slow_write)
    with ThreadPoolExecutor(max_workers=1) as pool:
        first = pool.submit(bir_is_calistir, factory)
        try:
            assert entered.wait(5)
            assert not bir_is_calistir(factory)
        finally:
            release.set()
        assert first.result(timeout=10)


def test_baglanti_kilitliyken_is_kaybolmaz(env, google):
    """OAuth bağlantıyı değiştirirken çalışan kilit bekleyip takılmaz."""
    client, factory, _, booking_id = env
    with factory() as db:
        if db.bind.dialect.name != "postgresql":
            pytest.skip("NOWAIT davranışı gerçek PostgreSQL'de sınanır.")
    login(client)
    bagla(client)
    with factory() as connection_update:
        connection_update.scalar(
            select(GoogleTakvimBaglantisi).with_for_update()
        )
        with pytest.raises(OperationalError):
            bir_is_calistir(factory)
    with factory() as db:
        assert db.get(RandevuTakvimIsi, booking_id).durum == "bekliyor"
    assert bir_is_calistir(factory)
    with factory() as db:
        assert db.get(RandevuTakvimIsi, booking_id).durum == "esitlendi"
