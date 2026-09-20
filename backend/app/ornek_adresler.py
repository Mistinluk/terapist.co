"""Kurgusal uzmanların tıklanabilir açık adreslerini üretir ve tamamlar.

Adresler gerçek muayenehane veya doğrulanmış konum değildir. Şehir/ilçe
profil alanlarından gelir; bu modül yalnızca örnek sokak ve bina üretir.
"""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Kullanici, Uzman


def ornek_adres(index: int) -> str:
    """Aynı indeks için aynı kurgusal adresi, gizli veri almadan üretir."""
    return (
        f"Örnek Mahallesi, Deneme {index // 100 + 1}. Sokak "
        f"No: {index % 100 + 1}, Kat: {index % 4 + 1}, "
        f"Daire: {index % 12 + 1}"
    )


def adresleri_tamamla(db: Session) -> int:
    """Geliştirmedeki tanınan örneklerin boş/eski yer tutucu adresini doldurur.

    E-posta kalıbı ve kurgusal biyografi birlikte aranır. Kullanıcının
    değiştirdiği açık adres, çevrim içi profil, parola ve MFA korunur.
    İşlemi çağıran commit eder; tekrar çalıştırma değişiklik oluşturmaz.
    """
    if get_settings().ortam != "gelistirme":
        raise ValueError("Örnek adresler yalnızca geliştirmede oluşturulur.")
    changed = 0
    rows = db.execute(
        select(Uzman, Kullanici.email).join(
            Kullanici, Uzman.kullanici_id == Kullanici.id
        )
    )
    for profile, email in rows:
        if "Yüz yüze" not in profile.formatlar:
            continue
        demo = re.fullmatch(r"ornek([0-5])@example\.com", email)
        generated = re.fullmatch(r"eslestirme(\d{4})@example\.com", email)
        if demo and "kurgusal" in profile.biyografi.lower():
            index = int(demo[1])
        elif (
            generated
            and 1 <= int(generated[1]) <= 1000
            and profile.biyografi.startswith("[Kurgusal eşleştirme verisi v1]")
        ):
            index = int(generated[1]) + 5
        else:
            continue
        old_placeholder = (
            f"Kurgusal test adresi · {profile.ilce} / {profile.sehir}"
        )
        if profile.adres.strip() not in {"", old_placeholder}:
            continue
        profile.adres = ornek_adres(index)
        changed += 1
    return changed
