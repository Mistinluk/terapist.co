"""Eski PHP SQLite şemasından aktarımın yalıtılmış testleri.

Kaynak dosya tmp_path altında kurgusal olarak oluşturulur; gerçek legacy
veritabanı açılmaz. Ön kontrolün yazmaması, özel alanların şifrelenmesi ve
hata halinde tüm hedef işleminin geri alınması sınanır."""

import hashlib
import json
import sqlite3

import pytest
from sqlalchemy import func, select

from app.db import Base
from app.models import Kullanici, Randevu, Uzman
from app.security import coz, parolalar
from scripts import eski_veri_aktar
from tests.conftest import PAROLA, login


def source_file(tmp_path, duplicate=False):
    """Eski şemayı tmp_path'te kurar; duplicate çakışmayla rollback
    sınaması sağlar.
    """
    source = tmp_path / "kaynak.sqlite"
    with sqlite3.connect(source) as db:
        db.execute("""
            CREATE TABLE psikologlar (
                id INTEGER, ad TEXT, sehir TEXT, ilce TEXT, email TEXT,
                biyografi TEXT, ucret TEXT, ekoller TEXT, kitle TEXT,
                format TEXT, calisma_saatleri TEXT, onayli INTEGER
            )
        """)
        db.execute(
            "INSERT INTO psikologlar VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                1,
                "Kurgusal Uzman",
                "İstanbul",
                "Kadıköy",
                "uzman0@example.com",
                "Tamamen kurgusal ve geçerli bir test profilidir.",
                "₺1500",
                '["BDT"]',
                '["Yetişkin"]',
                '["Online"]',
                json.dumps({"Pazartesi": "09:00 - 17:00"}),
                1,
            ),
        )
        db.execute("""
            CREATE TABLE randevular (
                uzman_id INTEGER, tarih TEXT, saat TEXT, durum TEXT,
                danisan_ad TEXT, danisan_telefon TEXT, danisan_notu TEXT
            )
        """)
        for _ in range(2 if duplicate else 1):
            db.execute(
                "INSERT INTO randevular VALUES (?,?,?,?,?,?,?)",
                (
                    1,
                    "2026-09-14",
                    "09:00",
                    "bekliyor",
                    "Kurgusal Danışan",
                    "05000000000",
                    "Kurgusal eski not",
                ),
            )
    return source


def test_aktarim_on_kontrol_yazmaz(env, tmp_path, monkeypatch):
    """Ön kontrol hedef sayısını ve kaynak dosyanın SHA-256 özetini
    değiştirmemelidir.
    """
    _, factory, _, _ = env
    monkeypatch.setattr(eski_veri_aktar, "SessionLocal", factory)
    source = source_file(tmp_path)
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    eski_veri_aktar.aktar(source, False)
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(Uzman)) == 2
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before


def test_aktarim_notlari_sifreler_ve_kaynak_degismez(
    env, tmp_path, monkeypatch
):
    """Eski not şifreli taşınmalı, normal randevu yanıtına
    çıkmamalıdır.
    """
    client, factory, _, _ = env
    engine = factory.kw["bind"]
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(eski_veri_aktar, "SessionLocal", factory)
    source = source_file(tmp_path)
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    eski_veri_aktar.aktar(source, True)
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before
    with factory() as db:
        booking = db.scalar(select(Randevu))
        assert "Kurgusal" not in booking.danisan_sifreli
        assert coz(booking.danisan_sifreli)["eski_not"] == "Kurgusal eski not"
        assert booking.aydinlatma_surumu == "eski-sistemde-dogrulanmamis"
        db.scalar(select(Kullanici)).parola_ozeti = parolalar.hash(PAROLA)
        db.commit()
    login(client)
    response = client.get("/api/uzman/randevular")
    assert response.status_code == 200
    assert "eski_not" not in response.text
    assert "Kurgusal eski not" not in response.text


def test_aktarim_hatasinda_tum_islem_geri_alinir(env, tmp_path, monkeypatch):
    """Çakışan kaynak talebi, önceden eklenen kullanıcı/profili de geri
    aldırmalıdır.
    """
    _, factory, _, _ = env
    engine = factory.kw["bind"]
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(eski_veri_aktar, "SessionLocal", factory)
    with pytest.raises(SystemExit):
        eski_veri_aktar.aktar(source_file(tmp_path, duplicate=True), True)
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(Uzman)) == 0
        assert db.scalar(select(func.count()).select_from(Kullanici)) == 0
