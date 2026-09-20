"""Örnek adres üretiminin kapsamı ve mevcut kayıtları koruma testleri."""

import pytest
from sqlalchemy import select

from app.config import get_settings
from app.eslestirme_verisi import profil_uret
from app.models import Kullanici, Uzman
from app.ornek_adresler import adresleri_tamamla, ornek_adres


def test_uretilen_adresler_yuz_yuze_profillerde():
    """Yeni örnekler açık adres alır; çevrim içi profilde ofis uydurulmaz."""
    profiles = [profil_uret(i) for i in range(1000)]
    for i, profile in enumerate(profiles):
        if "Yüz yüze" in profile.formatlar:
            assert profile.adres == ornek_adres(i + 6)
            assert all(
                s in profile.adres for s in ["Mahallesi", "Sokak", "No:"]
            )
        else:
            assert profile.adres == ""
    assert len({ornek_adres(i) for i in range(1006)}) == 1006


def test_yalnizca_ornek_ve_bos_adresler_tamamlanir(env, monkeypatch):
    """Düzenlenmiş adres ve hesap sırları korunur; tekrar etkisizdir."""
    _, factory, ids, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "gelistirme")
    with factory.begin() as db:
        first, second = [db.get(Uzman, key) for key in ids]
        for p in (first, second):
            p.formatlar = ["Yüz yüze"]
        user = db.get(Kullanici, first.kullanici_id)
        user.email = "ornek0@example.com"
        original_hash = user.parola_ozeti
        assert adresleri_tamamla(db) == 1
        assert first.adres == ornek_adres(0)
        assert second.adres == ""  # Tanınan örnek hesabı değil.
        assert user.parola_ozeti == original_hash
        assert adresleri_tamamla(db) == 0
        first.adres = "Kullanıcının düzenlediği iş adresi"
        assert adresleri_tamamla(db) == 0
        assert first.adres == "Kullanıcının düzenlediği iş adresi"


def test_eski_yer_tutucu_ve_cevrim_ici_korunur(env, monkeypatch):
    """Eski üretilmiş adres yenilenir; çevrim içi ve etiketsiz kayıt elenir."""
    _, factory, ids, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "gelistirme")
    with factory.begin() as db:
        profile = db.get(Uzman, ids[0])
        user = db.get(Kullanici, profile.kullanici_id)
        user.email = "eslestirme0001@example.com"
        profile.biyografi = "[Kurgusal eşleştirme verisi v1] Test profili."
        profile.adres = "Kurgusal test adresi · Kadıköy / İstanbul"
        assert adresleri_tamamla(db) == 0  # Yalnızca çevrim içi.
        profile.formatlar = ["Yüz yüze"]
        assert adresleri_tamamla(db) == 1
        assert profile.adres == ornek_adres(6)
        profile.biyografi = "Gerçek bir profilin kullanıcı açıklaması."
        profile.adres = ""
        assert adresleri_tamamla(db) == 0


def test_uretimde_adres_uretilmez(env, monkeypatch):
    """Üretimde komut hata verir ve mevcut profil adresi değişmez."""
    _, factory, _, _ = env
    monkeypatch.setattr(get_settings(), "ortam", "uretim")
    with factory.begin() as db:
        with pytest.raises(ValueError, match="geliştirmede"):
            adresleri_tamamla(db)
        assert db.scalar(select(Uzman)).adres == ""
