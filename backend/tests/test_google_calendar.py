"""Google Takvim bağlantısı: OAuth geri dönüşü, gizlilik ve saat filtresi.

Google'a gerçek istek gitmez; `google_istemcisi` yöntemleri kurgusal
yanıtlarla değiştirilir. Testler bağlantının yalnız zaman aralıklarını
sakladığını, anahtarları şifrelediğini ve herkese açık saatleri dolu
zamanlara/müsaitlik takvimine göre süzdüğünü doğrular.
"""

import base64
import json
import time
from datetime import datetime
from urllib.parse import parse_qs, urlsplit

import pytest
from sqlalchemy import select

from app.config import get_settings
from app.google_takvim import GoogleHatasi, birlestir, google_istemcisi
from app.models import GoogleTakvimBaglantisi, GoogleTakvimKanali
from app.security import coz, sifrele
from tests.conftest import login

KAPSAM = (
    "openid email https://www.googleapis.com/auth/calendar.events.freebusy "
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
    " https://www.googleapis.com/auth/calendar.events.owned"
)
TAKVIMLER = [
    {"id": "uzman@example.com", "ad": "Kişisel", "birincil": True},
    {"id": "musait@group.calendar", "ad": "Terapist.co", "birincil": False},
]


def id_token(email="uzman@example.com", aud="test-istemci"):
    def part(value):
        raw = json.dumps(value).encode()
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    claims = {"aud": aud, "iss": "https://accounts.google.com", "email": email}
    return f"{part({'alg': 'none'})}.{part(claims)}.imza"


class SahteGoogle:
    def __init__(self):
        self.scope = KAPSAM
        self.periods: dict[str, list[list[int]]] = {}
        self.freebusy_calls = 0
        self.revoked: list[str] = []
        self.watches: list[dict] = []
        self.stopped: list[tuple[str, str]] = []
        self.error: str | None = None
        self.events: dict[str, dict] = {}
        self.write_error: str | None = None

    def etkinlik_yaz(self, erisim, etkinlik_id, govde):
        self.events[etkinlik_id] = govde
        if self.write_error:
            # Google yazdı fakat yanıt kayboldu: retry aynı kaydı bulmalı.
            raise GoogleHatasi(self.write_error)

    def etkinlik_sil(self, erisim, etkinlik_id):
        self.events.pop(etkinlik_id, None)

    def kod_degistir(self, code, verifier):
        assert code == "yetki-kodu"
        assert len(verifier) >= 43
        return {
            "access_token": "erisim-anahtari",
            "refresh_token": "yenileme-anahtari",
            "expires_in": 3600,
            "scope": self.scope,
            "id_token": id_token(),
        }

    def erisim_yenile(self, refresh_token):
        return {"access_token": "yeni-erisim", "expires_in": 3600}

    def iptal_et(self, token):
        self.revoked.append(token)

    def takvimler(self, erisim):
        return [dict(item) for item in TAKVIMLER]

    def dolu_zamanlar(self, erisim, ids, bas, bit):
        self.freebusy_calls += 1
        if self.error:
            raise GoogleHatasi(self.error)
        return {value: self.periods.get(value, []) for value in ids}

    def izle(self, erisim, takvim_id, kanal_id, adres, token):
        self.watches.append(
            {
                "takvim_id": takvim_id,
                "kanal_id": kanal_id,
                "adres": adres,
                "token": token,
            }
        )
        return {
            "id": kanal_id,
            "resourceId": f"kaynak-{takvim_id}",
            "expiration": str((int(time.time()) + 7 * 86400) * 1000),
        }

    def izlemeyi_durdur(self, erisim, kanal_id, kaynak_id):
        self.stopped.append((kanal_id, kaynak_id))


@pytest.fixture
def google(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "google_istemci_kimligi", "test-istemci")
    monkeypatch.setattr(
        settings,
        "google_istemci_sirri",
        type(settings.google_istemci_sirri)("test-sir"),
    )
    fake = SahteGoogle()
    for name in [
        "kod_degistir",
        "erisim_yenile",
        "iptal_et",
        "takvimler",
        "dolu_zamanlar",
        "izle",
        "izlemeyi_durdur",
        "etkinlik_yaz",
        "etkinlik_sil",
    ]:
        monkeypatch.setattr(google_istemcisi, name, getattr(fake, name))
    return fake


def bagla(client):
    response = client.post("/api/uzman/google-takvim/baglanti", json={})
    assert response.status_code == 200, response.text
    url = response.json()["yonlendirme_url"]
    state = parse_qs(urlsplit(url).query)["state"][0]
    return client.get(
        "/api/google-takvim/geri-donus",
        params={"state": state, "code": "yetki-kodu"},
        follow_redirects=False,
    )


def saatler(client, uzman_id):
    response = client.get(f"/api/uzmanlar/{uzman_id}/saatler")
    assert response.status_code == 200, response.text
    return response.json()["saatler"]


def unix(value: str) -> int:
    return int(datetime.fromisoformat(value).timestamp())


def test_yapilandirma_yoksa_baglanti_kapali(env, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "google_istemci_kimligi", "")
    monkeypatch.setattr(
        settings,
        "google_istemci_sirri",
        type(settings.google_istemci_sirri)(""),
    )
    client, _, _, _ = env
    assert client.get("/api/uzman/google-takvim").status_code == 401
    login(client)
    assert client.get("/api/uzman/google-takvim").json() == {
        "yapilandirildi": False,
        "bagli": False,
        "email": None,
        "durum": None,
        "son_senkron": None,
        "hata": None,
        "takvimler": [],
        "musaitlik_takvimi": None,
        "dolu_takvimleri": [],
        "dolu_aralik_sayisi": 0,
        "musait_aralik_sayisi": None,
        "webhook_etkin": False,
        "webhook_kanal_sayisi": 0,
        "webhook_son_bildirim": None,
        "randevu_yazma_izni": False,
        "bekleyen_aktarim": 0,
        "hatali_aktarim": 0,
    }
    response = client.post("/api/uzman/google-takvim/baglanti", json={})
    assert response.status_code == 503


def test_yetki_adresi_pkce_ve_dar_kapsam(env, google):
    client, _, _, _ = env
    login(client)
    response = client.post("/api/uzman/google-takvim/baglanti", json={})
    query = parse_qs(urlsplit(response.json()["yonlendirme_url"]).query)
    assert query["client_id"] == ["test-istemci"]
    assert query["redirect_uri"] == [
        "http://localhost:5173/api/google-takvim/geri-donus"
    ]
    assert query["code_challenge_method"] == ["S256"]
    assert query["access_type"] == ["offline"]
    scopes = set(query["scope"][0].split())
    assert scopes == set(KAPSAM.split())
    assert "https://www.googleapis.com/auth/calendar.events" not in scopes
    assert (
        "https://www.googleapis.com/auth/calendar.events.readonly"
        not in scopes
    )
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "Path=/api/google-takvim" in cookie
    assert "samesite=lax" in cookie.lower()
    assert query["state"][0] not in cookie


def test_baglanti_kurulur_anahtarlar_sifreli_saklanir(env, google):
    client, factory, ids, _ = env
    login(client)
    response = bagla(client)
    assert response.status_code == 303
    assert response.headers["location"] == (
        "http://localhost:5173/panel?sekme=profil&takvim=baglandi"
    )
    status = client.get("/api/uzman/google-takvim").json()
    assert status["bagli"] and status["durum"] == "aktif"
    assert status["email"] == "uzman@example.com"
    assert status["dolu_takvimleri"] == ["uzman@example.com"]
    assert status["musaitlik_takvimi"] is None
    assert [c["id"] for c in status["takvimler"]] == [
        "uzman@example.com",
        "musait@group.calendar",
    ]
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        assert row.uzman_id == ids[0]
        assert "yenileme-anahtari" not in row.token_sifreli
        assert "uzman@example.com" not in row.hesap_sifreli
        assert coz(row.token_sifreli)["refresh_token"] == "yenileme-anahtari"
    # Başka uzman bu bağlantıyı görmez.
    login(client, 1)
    assert client.get("/api/uzman/google-takvim").json()["bagli"] is False


def test_state_eslesmezse_baglanti_kurulmaz(env, google):
    client, factory, _, _ = env
    login(client)
    client.post("/api/uzman/google-takvim/baglanti", json={})
    response = client.get(
        "/api/google-takvim/geri-donus",
        params={"state": "baska-deger", "code": "yetki-kodu"},
        follow_redirects=False,
    )
    assert response.headers["location"].endswith("takvim=gecersiz")
    client.cookies.clear()
    response = client.get(
        "/api/google-takvim/geri-donus",
        params={"state": "x", "code": "yetki-kodu"},
        follow_redirects=False,
    )
    assert response.headers["location"].endswith("takvim=gecersiz")
    with factory() as db:
        assert db.scalar(select(GoogleTakvimBaglantisi)) is None


def test_kullanici_vazgecerse_veya_izin_eksikse(env, google):
    client, factory, _, _ = env
    login(client)
    response = client.post("/api/uzman/google-takvim/baglanti", json={})
    state = parse_qs(urlsplit(response.json()["yonlendirme_url"]).query)
    response = client.get(
        "/api/google-takvim/geri-donus",
        params={"state": state["state"][0], "error": "access_denied"},
        follow_redirects=False,
    )
    assert response.headers["location"].endswith("takvim=iptal")
    google.scope = "openid email"
    response = bagla(client)
    assert response.headers["location"].endswith("takvim=izin")
    assert google.revoked == ["yenileme-anahtari"]
    with factory() as db:
        assert db.scalar(select(GoogleTakvimBaglantisi)) is None


def test_google_dolu_zamani_saati_ve_talebi_kapatir(env, google):
    client, _, ids, _ = env
    baseline = saatler(client, ids[0])
    target = baseline[1]
    start = unix(target)
    # Görüşme 60 dakika; 30. dakikadaki kısa etkinlik de çakışmadır.
    google.periods["uzman@example.com"] = [[start + 1800, start + 2400]]
    login(client)
    bagla(client)
    slots = saatler(client, ids[0])
    assert target not in slots
    assert baseline[0] in slots
    response = client.post(
        "/api/randevular",
        json={
            "uzman_id": ids[0],
            "baslangic": target,
            "ad": "Kurgusal Başvuru",
            "telefon": "05000000000",
            "aydinlatma_okundu": True,
            "aydinlatma_surumu": "taslak-1",
        },
    )
    assert response.status_code == 409


def test_bitisik_dolu_zaman_saati_kapatmaz(env, google):
    client, _, ids, _ = env
    baseline = saatler(client, ids[0])
    start = unix(baseline[1])
    google.periods["uzman@example.com"] = [[start - 1800, start]]
    login(client)
    bagla(client)
    assert baseline[1] in saatler(client, ids[0])


def test_musaitlik_takvimi_aday_saatleri_belirler(env, google):
    client, _, ids, _ = env
    baseline = saatler(client, ids[0])
    start = unix(baseline[2])
    google.periods["musait@group.calendar"] = [[start, start + 2 * 3600]]
    login(client)
    bagla(client)
    response = client.put(
        "/api/uzman/google-takvim/ayarlar",
        json={
            "musaitlik_takvimi": "musait@group.calendar",
            "dolu_takvimleri": ["uzman@example.com"],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["musait_aralik_sayisi"] == 1
    assert [unix(s) for s in saatler(client, ids[0])] == [
        start,
        start + 3600,
    ]


def test_ayar_dogrulamasi(env, google):
    client, _, _, _ = env
    login(client)
    bagla(client)
    url = "/api/uzman/google-takvim/ayarlar"
    assert (
        client.put(url, json={"dolu_takvimleri": ["bilinmeyen"]}).status_code
        == 422
    )
    assert (
        client.put(
            url,
            json={
                "musaitlik_takvimi": "uzman@example.com",
                "dolu_takvimleri": ["uzman@example.com"],
            },
        ).status_code
        == 422
    )
    google.error = "baglanti"
    response = client.put(
        url,
        json={
            "musaitlik_takvimi": "musait@group.calendar",
            "dolu_takvimleri": [],
        },
    )
    assert response.status_code == 502
    status = client.get("/api/uzman/google-takvim").json()
    # Google'a ulaşılamadığında yeni seçim saklanmaz.
    assert status["musaitlik_takvimi"] is None
    assert status["dolu_takvimleri"] == ["uzman@example.com"]


def test_onbellek_tazelik_suresince_google_a_gitmez(env, google):
    client, _, ids, _ = env
    login(client)
    bagla(client)
    calls = google.freebusy_calls
    saatler(client, ids[0])
    saatler(client, ids[0])
    assert google.freebusy_calls == calls


def test_yetki_kaldirilinca_son_dolu_zamanlar_korunur(env, google):
    client, factory, ids, _ = env
    baseline = saatler(client, ids[0])
    start = unix(baseline[1])
    google.periods["uzman@example.com"] = [[start, start + 3600]]
    login(client)
    bagla(client)
    google.error = "yetki_kaldirildi"
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        row.son_deneme = 0
        db.commit()
    assert baseline[1] not in saatler(client, ids[0])
    status = client.get("/api/uzman/google-takvim").json()
    assert status["durum"] == "koptu"
    assert "yeniden" in status["hata"]
    assert (
        client.post("/api/uzman/google-takvim/esitle", json={}).status_code
        == 409
    )


def test_gecici_hata_eski_veriyi_kullanir_ve_erisim_yenilenir(env, google):
    client, factory, ids, _ = env
    baseline = saatler(client, ids[0])
    start = unix(baseline[1])
    google.periods["uzman@example.com"] = [[start, start + 3600]]
    login(client)
    bagla(client)
    google.error = "baglanti"
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        row.son_deneme = 0
        db.commit()
    assert baseline[1] not in saatler(client, ids[0])
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        assert row.durum == "aktif" and row.son_hata == "baglanti"
        assert "access_token" not in coz(row.token_sifreli)
    google.error = None
    response = client.post("/api/uzman/google-takvim/esitle", json={})
    assert response.status_code == 200
    assert response.json()["hata"] is None
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        assert coz(row.token_sifreli)["access_token"] == "yeni-erisim"


def test_baglanti_kaldirilir_ve_google_yetkisi_iptal_edilir(env, google):
    client, factory, ids, _ = env
    baseline = saatler(client, ids[0])
    start = unix(baseline[1])
    google.periods["uzman@example.com"] = [[start, start + 3600]]
    login(client)
    bagla(client)
    assert baseline[1] not in saatler(client, ids[0])
    assert (
        client.delete(
            "/api/uzman/google-takvim",
            headers={"Content-Type": "application/json"},
        ).status_code
        == 204
    )
    assert google.revoked == ["yenileme-anahtari"]
    assert baseline[1] in saatler(client, ids[0])
    with factory() as db:
        assert db.scalar(select(GoogleTakvimBaglantisi)) is None


def test_ayni_hesapla_yeniden_baglaninca_secimler_korunur(env, google):
    client, factory, _, _ = env
    login(client)
    bagla(client)
    client.put(
        "/api/uzman/google-takvim/ayarlar",
        json={
            "musaitlik_takvimi": "musait@group.calendar",
            "dolu_takvimleri": ["uzman@example.com"],
        },
    )
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        row.durum = "koptu"
        row.token_sifreli = sifrele({"refresh_token": "eski"})
        db.commit()
    assert bagla(client).headers["location"].endswith("takvim=baglandi")
    status = client.get("/api/uzman/google-takvim").json()
    assert status["durum"] == "aktif"
    assert status["musaitlik_takvimi"] == "musait@group.calendar"


def test_araliklar_birlestirilir():
    assert birlestir([[5, 9], [1, 3], [3, 4], [8, 12], [20, 20]]) == [
        [1, 4],
        [5, 12],
    ]


def test_webhook_kanali_kurulur_ve_ek_google_istegini_engeller(
    env, google, monkeypatch
):
    settings = get_settings()
    monkeypatch.setattr(
        settings,
        "google_webhook_adresi",
        "https://ornek.terapist.co/api/google-takvim/webhook",
    )
    client, factory, ids, _ = env
    login(client)
    bagla(client)
    assert len(google.watches) == 1
    assert google.watches[0]["takvim_id"] == "uzman@example.com"
    status = client.get("/api/uzman/google-takvim").json()
    assert status["webhook_etkin"] is True
    assert status["webhook_kanal_sayisi"] == 1
    calls = google.freebusy_calls
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        row.son_deneme = 0
        db.commit()
    saatler(client, ids[0])
    # Webhook kanalı etkin olduğu için TTL geçmiş olsa da Google'a gitmez.
    assert google.freebusy_calls == calls


def test_webhook_bildirimi_dogrulanir_esitler_ve_kaldirilir(
    env, google, monkeypatch
):
    settings = get_settings()
    monkeypatch.setattr(
        settings,
        "google_webhook_adresi",
        "https://ornek.terapist.co/api/google-takvim/webhook",
    )
    client, factory, ids, _ = env
    baseline = saatler(client, ids[0])
    target = baseline[1]
    start = unix(target)
    login(client)
    bagla(client)
    watch = google.watches[0]
    calls_after_connect = google.freebusy_calls

    # İlk sync bildirimi Google API'ye ek istek atmaz.
    sync_resp = client.post(
        "/api/google-takvim/webhook",
        headers={
            "X-Goog-Channel-ID": watch["kanal_id"],
            "X-Goog-Resource-ID": "kaynak-uzman@example.com",
            "X-Goog-Resource-State": "sync",
            "X-Goog-Channel-Token": watch["token"],
        },
    )
    assert sync_resp.status_code == 204
    assert google.freebusy_calls == calls_after_connect

    # Geçersiz belirteç reddedilir.
    bad_resp = client.post(
        "/api/google-takvim/webhook",
        headers={
            "X-Goog-Channel-ID": watch["kanal_id"],
            "X-Goog-Resource-ID": "kaynak-uzman@example.com",
            "X-Goog-Resource-State": "exists",
            "X-Goog-Channel-Token": "yanlis-token",
        },
    )
    assert bad_resp.status_code == 403

    # Gerçek değişiklik bildirimi geldiğinde eşitler.
    google.periods["uzman@example.com"] = [[start, start + 3600]]
    with factory() as db:
        row = db.scalar(select(GoogleTakvimBaglantisi))
        row.son_deneme = int(time.time()) - 60
        db.commit()
    exists_resp = client.post(
        "/api/google-takvim/webhook",
        headers={
            "X-Goog-Channel-ID": watch["kanal_id"],
            "X-Goog-Resource-ID": "kaynak-uzman@example.com",
            "X-Goog-Resource-State": "exists",
            "X-Goog-Channel-Token": watch["token"],
        },
    )
    assert exists_resp.status_code == 204
    assert google.freebusy_calls == calls_after_connect + 1
    assert target not in saatler(client, ids[0])

    # Ardışık ikinci bildirim cooldown içinde olduğu için kotayı korur.
    second_resp = client.post(
        "/api/google-takvim/webhook",
        headers={
            "X-Goog-Channel-ID": watch["kanal_id"],
            "X-Goog-Resource-ID": "kaynak-uzman@example.com",
            "X-Goog-Resource-State": "exists",
            "X-Goog-Channel-Token": watch["token"],
        },
    )
    assert second_resp.status_code == 204
    assert google.freebusy_calls == calls_after_connect + 1

    # Bağlantı kaldırıldığında kanal Google tarafında durdurulur ve silinir.
    assert (
        client.delete(
            "/api/uzman/google-takvim",
            headers={"Content-Type": "application/json"},
        ).status_code
        == 204
    )
    assert google.stopped == [(watch["kanal_id"], "kaynak-uzman@example.com")]
    with factory() as db:
        assert db.scalar(select(GoogleTakvimKanali)) is None
