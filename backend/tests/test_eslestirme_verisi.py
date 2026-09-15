"""Kurgusal veri çeşitliliği, giriş ve mevcut kayıtların korunması."""

import json
import sys

import pyotp
import pytest
from sqlalchemy import func, select

from app import eslestirme_verisi as veri
from app.models import Kullanici, Randevu, Uzman
from app.security import parolalar


def test_bin_gecerli_ve_tekrarlanabilir_profil():
    profiles = [veri.profil_uret(i) for i in range(1000)]
    assert len({p.ad for p in profiles}) == 1000
    assert len({p.sehir for p in profiles}) == 20
    assert len({tuple(p.formatlar) for p in profiles}) == 3
    assert any(s.gun == 6 for p in profiles for s in p.calisma_saatleri)
    assert any(s.bitis >= 21 for p in profiles for s in p.calisma_saatleri)
    assert min(p.ucret for p in profiles) == 800
    assert max(p.ucret for p in profiles) == 5000
    assert veri.profil_uret(42) == profiles[42]


def test_ekleme_tekrari_ve_mfa(env, monkeypatch):
    client, factory, ids, booking_id = env
    monkeypatch.setattr(veri.get_settings(), "ortam", "gelistirme")
    settings = veri.UretimAyarlari(adet=25)
    with factory.begin() as db:
        before = db.scalar(select(func.count()).select_from(Kullanici))
        result = veri.veri_ekle(db, settings)
    assert result["eklenen"] == 25
    assert len(result["hesaplar"]) == 5
    assert len({a["parola"] for a in result["hesaplar"]}) == 5
    assert len({a["mfa_anahtari"] for a in result["hesaplar"]}) == 5
    account = result["hesaplar"][0]
    with factory.begin() as db:
        user = db.scalar(
            select(Kullanici).where(Kullanici.email == account["email"])
        )
        original_hash = user.parola_ozeti
        assert parolalar.verify(account["parola"], original_hash)
        repeated = veri.veri_ekle(db, settings)
        assert repeated == {"eklenen": 0, "atlanan": 25, "hesaplar": []}
        assert user.parola_ozeti == original_hash
        assert (
            db.scalar(select(func.count()).select_from(Kullanici))
            == before + 25
        )
        assert db.get(Randevu, booking_id) is not None
        assert db.get(Uzman, ids[0]).ad == "Örnek Uzman 0"
        disabled = db.scalar(
            select(Kullanici).where(
                Kullanici.email == "eslestirme0006@example.com"
            )
        )
        assert not disabled.aktif
    body = {"email": account["email"], "parola": account["parola"]}
    assert client.post("/api/oturum/giris", json=body).status_code == 401
    body["dogrulama_kodu"] = pyotp.parse_uri(account["mfa_uri"]).now()
    assert client.post("/api/oturum/giris", json=body).status_code == 200
    assert client.get("/api/uzman/profil").json()["id"] == account["uzman_id"]


def test_uretim_ortaminda_reddedilir(env, monkeypatch):
    _, factory, _, _ = env
    monkeypatch.setattr(veri.get_settings(), "ortam", "uretim")
    with factory.begin() as db, pytest.raises(ValueError):
        veri.veri_ekle(db, veri.UretimAyarlari())


def test_parola_dosyasi_ezilmez_ve_db_geri_alinir(env, monkeypatch, tmp_path):
    _, factory, _, _ = env
    monkeypatch.setattr(veri.get_settings(), "ortam", "gelistirme")
    monkeypatch.setattr(veri, "SessionLocal", factory)
    path = tmp_path / "hesaplar.json"
    path.write_text(json.dumps({"onceki": "korunacak"}))
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "test",
            "--adet",
            "5",
            "--hesap-dosyasi",
            str(path),
        ],
    )
    with pytest.raises(FileExistsError):
        veri.main()
    assert json.loads(path.read_text()) == {"onceki": "korunacak"}
    with factory() as db:
        assert (
            db.scalar(
                select(Kullanici).where(
                    Kullanici.email == "eslestirme0001@example.com"
                )
            )
            is None
        )
