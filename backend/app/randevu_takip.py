"""Üyesiz danışan oturumu, durum kuralları ve randevu istatistikleri."""

import secrets
import time

from cryptography.fernet import InvalidToken
from fastapi import HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Randevu
from app.security import fernet, ozet

CEREZ = "terapist_danisan"
OMUR = 90 * 86400
DURUMLAR = ("bekliyor", "onaylandi", "tamamlandi", "iptal", "reddedildi")


def oturum_anahtari(request: Request) -> str | None:
    """HttpOnly çerezi doğrular; URL, ad veya telefon erişim anahtarı olmaz."""
    cookie = request.cookies.get(CEREZ, "")
    if not cookie or len(cookie) > 512:
        return None
    try:
        raw = fernet.decrypt(cookie.encode(), ttl=OMUR).decode()
    except (InvalidToken, ValueError, UnicodeError):
        return None
    if not raw.startswith("danisan:") or len(raw) != 51:
        return None
    return raw[8:]


def oturum_yaz(response: Response, token: str) -> None:
    """Randevu kalıcılaştıktan sonra 90 günlük tarayıcı erişimini verir."""
    response.set_cookie(
        CEREZ,
        fernet.encrypt(f"danisan:{token}".encode()).decode(),
        max_age=OMUR,
        httponly=True,
        samesite="strict",
        path="/api",
        secure=get_settings().ortam == "uretim",
    )


def yeni_veya_mevcut_anahtar(request: Request) -> str:
    return oturum_anahtari(request) or secrets.token_urlsafe(32)


def danisan_kosulu(request: Request):
    """Çerezsiz veya bozuk çerezli istemci hiçbir satıra erişemez."""
    token = oturum_anahtari(request)
    return Randevu.danisan_oturum_ozeti == (ozet(token) if token else "")


def sayimlar(db: Session, kosul) -> dict[str, int]:
    """Sayfalama uygulanmadan, yalnız yetkili kayıtların toplamını sayar."""
    values = dict(
        db.execute(
            select(Randevu.durum, func.count())
            .where(kosul)
            .group_by(Randevu.durum)
        ).all()
    )
    return {
        "toplam": sum(values.values()),
        **{status: values.get(status, 0) for status in DURUMLAR},
    }


def tamamlanma_dogrula(booking: Randevu, durum: str) -> None:
    """Tamamlanma, uzmanın onaylı ve süresi bitmiş görüşme beyanıdır."""
    if durum == "tamamlandi" and (
        booking.durum != "onaylandi"
        or (booking.bitis or booking.baslangic + 3600) > int(time.time())
    ):
        raise HTTPException(
            409, "Yalnızca süresi bitmiş, onaylı randevu tamamlanabilir."
        )
