"""Yerel adres kolaylığı ile üretim kaynak sınırının regresyon testleri.

monkeypatch ayarları yalnızca test süresince değiştirir. Yerelde aynı portlu
loopback adreslerine izin verilirken şema/port değişimi ve yanıltıcı host
yazımları reddedilmelidir. Hazırlık kontrolünün DB hatası ayrıca taklit edilir.
"""

from unittest.mock import Mock

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError

from app import main
from app.models import Kullanici
from tests.test_appointments import payload


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "[::1]"])
def test_gelistirmede_uyeliksiz_randevu(env, monkeypatch, host):
    """Loopback adresi farklı yazılsa da aynı portta üyesiz talep kabul
    edilmelidir.
    """
    client, factory, ids, _ = env
    monkeypatch.setattr(main.settings, "ortam", "gelistirme")
    monkeypatch.setattr(
        main.settings, "uygulama_adresi", "http://localhost:8080"
    )
    with factory() as db:
        before = db.scalar(select(func.count()).select_from(Kullanici))
    assert not client.cookies
    response = client.post(
        "/api/randevular",
        json=payload(client, ids[0]),
        headers={"Origin": f"http://{host}:8080"},
    )
    assert response.status_code == 201, response.text
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(Kullanici)) == before


@pytest.mark.parametrize(
    "origin",
    [
        "null",
        "http://localhost:5173",
        "http://127.0.0.1:8081",
        "https://localhost:8080",
        "http://127.0.0.1.sahte.example:8080",
        "http://baska.example:8080",
        "http://localhost:8080/",
        "http://localhost:8080@baska.example",
    ],
)
def test_yabanci_kaynaklar_engellenir(env, monkeypatch, origin):
    """Yerel adres istisnası farklı port, protokol veya sahte hosta
    genişlememelidir.
    """
    client, _, _, _ = env
    monkeypatch.setattr(main.settings, "ortam", "gelistirme")
    monkeypatch.setattr(
        main.settings, "uygulama_adresi", "http://localhost:8080"
    )
    assert (
        client.post(
            "/api/randevular", json={}, headers={"Origin": origin}
        ).status_code
        == 403
    )
    del client.headers["Origin"]
    assert client.post("/api/randevular", json={}).status_code == 403


def test_uretimde_yalnizca_tanimli_kaynak(env, monkeypatch):
    """Üretimde loopback takma adı da reddedilir; izinli Origin
    doğrulamaya ulaşır.
    """
    client, _, _, _ = env
    monkeypatch.setattr(main.settings, "ortam", "uretim")
    monkeypatch.setattr(
        main.settings, "uygulama_adresi", "https://localhost:8080"
    )
    assert (
        client.post(
            "/api/randevular",
            json={},
            headers={"Origin": "https://127.0.0.1:8080"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/randevular",
            json={},
            headers={"Origin": "https://localhost:8080"},
        ).status_code
        == 422
    )


def test_hazirlik_veritabanini_sorgular(env, monkeypatch):
    """DB kopunca hazırlık 503 verirken süreç sağlığı 200 kalır;
    ayrıntı sızmaz.
    """
    client, factory, _, _ = env
    monkeypatch.setattr(main, "engine", factory.kw["bind"])
    assert client.get("/api/hazir").status_code == 200
    broken = Mock()
    broken.connect.side_effect = OperationalError(
        "gizli_sorgu", {}, RuntimeError("gizli_adres")
    )
    monkeypatch.setattr(main, "engine", broken)
    response = client.get("/api/hazir")
    assert response.status_code == 503
    assert "gizli" not in response.text
    assert client.get("/api/saglik").status_code == 200
