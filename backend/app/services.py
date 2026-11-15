"""Randevu zamanı ve alan yetkilendirmesi için ortak iş kuralları."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.google_takvim import takvim_araliklari
from app.models import Randevu, Uzman, UzmanEngeli

ISTANBUL = ZoneInfo("Europe/Istanbul")


def uzmanlar_engelli(db: Session, first_id: str, second_id: str) -> bool:
    """İki uzman arasında yön fark etmeksizin aktif engel var mı?"""
    return bool(
        db.scalar(
            select(UzmanEngeli.engelleyen_uzman_id).where(
                or_(
                    (UzmanEngeli.engelleyen_uzman_id == first_id)
                    & (UzmanEngeli.engellenen_uzman_id == second_id),
                    (UzmanEngeli.engelleyen_uzman_id == second_id)
                    & (UzmanEngeli.engellenen_uzman_id == first_id),
                )
            )
        )
    )


def engelli_uzman_idleri(db: Session, owner_id: str) -> set[str]:
    """Sahibin engellediği veya sahibi engelleyen terapist kimlikleri."""
    rows = db.execute(
        select(
            UzmanEngeli.engelleyen_uzman_id,
            UzmanEngeli.engellenen_uzman_id,
        ).where(
            or_(
                UzmanEngeli.engelleyen_uzman_id == owner_id,
                UzmanEngeli.engellenen_uzman_id == owner_id,
            )
        )
    )
    return {
        blocked_id if blocker_id == owner_id else blocker_id
        for blocker_id, blocked_id in rows
    }


def profil_bul(db: Session, uzman_id: str, kilitle: bool = False) -> Uzman:
    """Yayımlanmış profili getirir; görünmeyen profiller için 404 döner.

    Randevu oluşturulurken kilitle=True, PostgreSQL satır kilidi alır.
    Kilit, çağıranın işlemi bitene kadar eşzamanlı rezervasyonları sıraya
    koyar; veritabanındaki benzersizlik kısıtı da son savunmadır.
    """
    query = select(Uzman).where(
        Uzman.id == uzman_id,
        Uzman.onayli.is_(True),
        Uzman.arsivli.is_(False),
    )
    if kilitle:
        query = query.with_for_update()
    profile = db.scalar(query)
    if not profile:
        raise HTTPException(404, "Uzman bulunamadı.")
    return profile


def _cakisir(start: int, end: int, araliklar: list[list[int]]) -> bool:
    return any(a < end and start < b for a, b in araliklar)


def _icinde(start: int, end: int, araliklar: list[list[int]]) -> bool:
    return any(a <= start and end <= b for a, b in araliklar)


def musait_saatler(
    db: Session, profile: Uzman, takvim_tazeligi: int = 300
) -> list[str]:
    """Bugün dahil 15 gün için boş bir saatlik başlangıçları döndürür.

    Haftalık program İstanbul saatine göre açılır. Bekleyen ve onaylanan
    talepler zamanı kapatır; reddedilen/iptal edilenler kapatmaz. ISO
    değerleri saat dilimi içerir. Bu liste rezervasyon garantisi değildir;
    talep kaydedilirken uygunluk yeniden kontrol edilmelidir.

    Google Takvim bağlıysa görüşme süresiyle çakışan dolu zamanlar çıkarılır.
    Uzman bir müsaitlik takvimi seçtiyse aday saatler haftalık program yerine
    o takvimdeki etkinliklerden gelir; görüşme etkinliğin içine sığmalıdır.
    `takvim_tazeligi` Google verisinin en fazla kaç saniyelik olacağıdır.
    """
    now = datetime.now(ISTANBUL)
    busy = set(
        db.scalars(
            select(Randevu.baslangic).where(
                Randevu.uzman_id == profile.id,
                Randevu.durum.in_(["bekliyor", "onaylandi"]),
                Randevu.baslangic >= int(now.timestamp()),
            )
        )
    )
    google_busy, google_free = takvim_araliklari(db, profile, takvim_tazeligi)
    duration = (profile.seans_suresi_dakika or 60) * 60
    schedule = {item["gun"]: item for item in profile.calisma_saatleri}
    slots = []
    for offset in range(15):
        day = now + timedelta(days=offset)
        if google_free is None:
            hours = schedule.get(day.weekday())
            if not hours:
                continue
            candidates = range(hours["baslangic"], hours["bitis"])
        else:
            candidates = range(24)
        for hour in candidates:
            slot = day.replace(hour=hour, minute=0, second=0, microsecond=0)
            start = int(slot.timestamp())
            if (
                slot <= now
                or start in busy
                or _cakisir(start, start + duration, google_busy)
                or (
                    google_free is not None
                    and not _icinde(start, start + duration, google_free)
                )
            ):
                continue
            slots.append(slot.isoformat())
    return slots
