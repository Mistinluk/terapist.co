"""İnternete açık kurgusal önizlemenin güvenlik sözleşmesi.

Önizleme üretim gibi HTTPS/PostgreSQL/Redis ve MFA ister; gerçek veri için
onaylanmış aydınlatma metni gerektirmez. Bu istisna üretime taşınmamalıdır.
"""

import pytest
from cryptography.fernet import Fernet
from pydantic import ValidationError

from app.config import Settings


def preview(**overrides):
    """Gerçek .env veya uzak servislere dokunmadan ayar nesnesi üretir."""
    values = {
        "_env_file": None,
        "ortam": "onizleme",
        "veritabani_url": "postgresql+psycopg://test@postgres/test",
        "redis_url": "redis://redis:6379/0",
        "uygulama_adresi": "https://onizleme.example.com",
        "guvenilir_hostlar": ["onizleme.example.com"],
        "sifreleme_anahtari": Fernet.generate_key().decode(),
        "hiz_siniri_anahtari": "a" * 48,
    }
    values.update(overrides)
    return Settings(**values)


def test_onizleme_guvenli_ve_tek_kokenlidir():
    """Kurgusal önizleme de güvenli çerez/MFA politikasını seçmelidir."""
    settings = preview()
    assert settings.guvenli_yayin
    assert settings.kaynak_izinli("https://onizleme.example.com")
    assert not settings.kaynak_izinli("http://localhost:5173")
    assert not settings.kaynak_izinli("https://baska.example.com")


@pytest.mark.parametrize(
    "overrides",
    [
        {"uygulama_adresi": "http://onizleme.example.com"},
        {"veritabani_url": "sqlite://"},
        {"redis_url": None},
        {"guvenilir_hostlar": ["*"]},
        {"ortam": "uretim"},
    ],
)
def test_onizleme_guvensiz_ayar_ve_uretim_metni_eksikligi(overrides):
    """Önizleme istisnası taşıma güvenliğini veya üretim metnini atlamaz."""
    with pytest.raises(ValidationError):
        preview(**overrides)
