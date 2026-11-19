"""Tek randevuluk özel bağlantı, durum kuralları ve yetkili istatistikler."""

import hmac
import secrets
import time
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Randevu
from app.schemas import RandevuBaglantiCikti
from app.security import ozet

OMUR = 90 * 86400
DURUMLAR = ("bekliyor", "onaylandi", "tamamlandi", "iptal", "reddedildi")


def baglanti_uret(booking: Randevu) -> RandevuBaglantiCikti:
    """90 günlük, tek randevuya yetkili link üretir; eski linki geçersiz kılar.

    256 bit rastgele anahtar URL'nin # parçasındadır. Tarayıcı bu parçayı
    HTTP belge isteğine veya Referer başlığına eklemez. Ham anahtar yalnız
    yetkili kullanıcıya döner. DB özeti, denetim kaydı randevu kimliğini tutar.
    """
    token = secrets.token_urlsafe(32)
    booking.takip_anahtar_ozeti = ozet(token)
    booking.takip_son_kullanim = int(time.time()) + OMUR
    return RandevuBaglantiCikti(
        takip_yolu=f"/randevularim/{booking.id}#anahtar={token}",
        takip_son_kullanim=datetime.fromtimestamp(
            booking.takip_son_kullanim, UTC
        ),
    )


def baglanti_dogrula(booking: Randevu | None, token: str) -> Randevu:
    """Kimlik tek başına erişim vermez; süresi dolan/yenilenen link kapanır."""
    if (
        not booking
        or not booking.takip_anahtar_ozeti
        or not booking.takip_son_kullanim
        or booking.takip_son_kullanim <= int(time.time())
        or not hmac.compare_digest(booking.takip_anahtar_ozeti, ozet(token))
    ):
        raise HTTPException(
            404, "Randevu bağlantısı geçersiz veya süresi dolmuş."
        )
    return booking


def degistirilebilir_dogrula(booking: Randevu) -> None:
    """Yalnızca başlamamış, bekleyen/onaylı randevu değiştirilebilir."""
    if booking.durum not in {"bekliyor", "onaylandi"} or (
        booking.baslangic <= int(time.time())
    ):
        raise HTTPException(409, "Bu randevu artık değiştirilemez.")


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
