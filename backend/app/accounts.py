"""Başvuru ve davet kabulünün paylaştığı uzman hesabı kuralları."""

import re
import time
import unicodedata

import pyotp
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Kullanici, TerapistDogrulama, Uzman
from app.schemas import ProfilGirdi
from app.security import parolalar, sifrele


def _kullanici_adi_temeli(ad: str) -> str:
    translated = ad.lower().translate(str.maketrans("çğıöşü", "cgiosu"))
    normalized = unicodedata.normalize("NFKD", translated)
    ascii_name = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )
    slug = re.sub(r"[^a-z0-9]+", "", ascii_name)
    return (slug or "terapist")[:70]


def kullanici_adi_uret(db: Session, ad: str) -> str:
    """Okunabilir, tiresiz ve benzersiz profil adı üretir."""
    base = _kullanici_adi_temeli(ad)
    candidate = base
    suffix = 2
    while db.scalar(select(Uzman.id).where(Uzman.kullanici_adi == candidate)):
        candidate = f"{base[: 80 - len(str(suffix))]}{suffix}"
        suffix += 1
    return candidate


def uzman_hesabi_hazirla(
    db: Session,
    email: str,
    parola: str,
    profil: ProfilGirdi,
    kullanici_adi: str | None = None,
) -> tuple[Kullanici, Uzman, str]:
    """Hesap, profil ve bekleyen doğrulamayı aynı işlem içinde hazırlar."""
    secret = pyotp.random_base32()
    user = Kullanici(
        email=email.lower(),
        parola_ozeti=parolalar.hash(parola),
        mfa_sirri=sifrele({"anahtar": secret}),
    )
    db.add(user)
    db.flush()
    expert = Uzman(
        kullanici_id=user.id,
        kullanici_adi=kullanici_adi or kullanici_adi_uret(db, profil.ad),
        uye_olma=int(time.time()),
        **profil.model_dump(mode="json"),
    )
    db.add(expert)
    db.flush()
    db.add(
        TerapistDogrulama(
            uzman_id=expert.id,
            durum="pending",
            gonderilme=int(time.time()),
            incelenme=None,
            inceleyen_kullanici_id=None,
        )
    )
    return user, expert, secret


def mfa_yaniti(user: Kullanici, secret: str, mesaj: str) -> dict:
    """Kurulum sırrını yalnız hesap oluşturma yanıtında gösterir."""
    return {
        "mesaj": mesaj,
        "mfa_anahtari": secret,
        "mfa_uri": pyotp.TOTP(secret).provisioning_uri(
            user.email, issuer_name="Terapist.co"
        ),
    }
