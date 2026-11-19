"""Yeni/eskiden üretilmiş demo profillerinde yayın sözleşmesi regresyonları.

Liste kartındaki kısa adres, kimlik yönlendirmesi ve JSON aynı profili
açmalıdır. Onarım yalnız kurgusal kayıtları tamamlar; inceleme kararlarını
değiştirmez ve üretimde çalışmaz. Veritabanı env fixture'ına aittir.
"""

import pytest
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import sessionmaker

from app import cli
from app.config import get_settings
from app.db import Base
from app.eslestirme_verisi import UretimAyarlari, veri_ekle
from app.models import Kullanici, TerapistDogrulama, Uzman
from app.ornek_profiller import (
    DEMO_BIYOGRAFI,
    ornek_dogrulamalarini_tamamla,
)


def _profil_acilir(client, profile):
    """Yeni sekmede açılan kart ve eski kimlik URL'sini birlikte sınar."""
    url = f"/{profile.kullanici_adi}"
    page = client.get(url)
    assert page.status_code == 200
    assert 'data-profile="' in page.text
    assert 'src="/assets/app.js"' in page.text
    assert client.head(url).status_code == 200
    redirect = client.get(f"/uzman/{profile.id}", follow_redirects=False)
    assert redirect.status_code == 308
    assert redirect.headers["location"] == url
    data = client.get(f"/api/uzmanlar/kullanici-adi/{profile.kullanici_adi}")
    assert data.status_code == 200
    assert data.json()["id"] == profile.id


def test_alti_demoda_ilk_kurulum_yayin_kayitlarini_ekler(monkeypatch):
    """Boş DB'deki altı kapalı hesabın da yayın kaydı olmalıdır."""
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine)
    monkeypatch.setattr(cli, "SessionLocal", factory)
    try:
        cli.demo()
        with factory() as db:
            assert db.scalar(select(func.count()).select_from(Uzman)) == 6
            assert (
                db.scalar(
                    select(func.count())
                    .select_from(TerapistDogrulama)
                    .where(TerapistDogrulama.durum == "verified")
                )
                == 6
            )
            assert not db.scalar(
                select(Kullanici.id).where(Kullanici.aktif.is_(True))
            )
    finally:
        engine.dispose()


def test_yeni_eslestirme_profilleri_karttan_acilir(env, monkeypatch):
    """İlk dağıtımda eklenen profiller eksik doğrulama yüzünden 404 olmaz."""
    client, factory, _, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "onizleme")
    with factory.begin() as db:
        result = veri_ekle(db, UretimAyarlari(adet=5, giris_hesabi=0))
        profiles = list(
            db.scalars(select(Uzman).where(Uzman.biyografi.startswith("[")))
        )
    assert result["eklenen"] == 5
    assert result["hesaplar"] == []
    for profile in profiles:
        _profil_acilir(client, profile)


def test_eski_alti_demo_onarilir_gercek_profil_korunur(env, monkeypatch):
    """E-posta VE biyografi tanınır; mevcut randevu ve hesap korunur."""
    client, factory, ids, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "onizleme")
    with factory.begin() as db:
        db.execute(delete(TerapistDogrulama))
        demo = db.get(Uzman, ids[0])
        demo.biyografi = DEMO_BIYOGRAFI
        user = db.get(Kullanici, demo.kullanici_id)
        user.email = "ornek0@example.com"
        user.aktif = False
        original_password = user.parola_ozeti
        # Benzer e-posta tek başına gerçek bir başvuruyu onaylayamaz.
        other = db.get(Uzman, ids[1])
        db.get(Kullanici, other.kullanici_id).email = "ornek1@example.com"
    assert client.get(f"/{demo.kullanici_adi}").status_code == 404
    with factory.begin() as db:
        assert ornek_dogrulamalarini_tamamla(db) == 1
        assert ornek_dogrulamalarini_tamamla(db) == 0
        saved = db.get(Kullanici, demo.kullanici_id)
        assert not saved.aktif
        assert saved.parola_ozeti == original_password
    _profil_acilir(client, demo)
    assert client.get(f"/{other.kullanici_adi}").status_code == 404


@pytest.mark.parametrize("status", ["pending", "rejected"])
def test_mevcut_inceleme_karari_degistirilmez(env, monkeypatch, status):
    """Demo kimliği de olsa yönetici kararını otomatik onarım ezemez."""
    client, factory, ids, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "onizleme")
    with factory.begin() as db:
        profile = db.get(Uzman, ids[0])
        profile.biyografi = DEMO_BIYOGRAFI
        db.get(Kullanici, profile.kullanici_id).email = "ornek0@example.com"
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == profile.id
            )
        )
        verification.durum = status
        assert ornek_dogrulamalarini_tamamla(db) == 0
        assert verification.durum == status
    assert client.get(f"/{profile.kullanici_adi}").status_code == 404


def test_uretimde_ornek_onarimi_yapilamaz(env, monkeypatch):
    """Üretim veritabanında hiçbir profil otomatik onaylanmaz."""
    _, factory, _, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "uretim")
    with factory.begin() as db, pytest.raises(ValueError):
        ornek_dogrulamalarini_tamamla(db)
