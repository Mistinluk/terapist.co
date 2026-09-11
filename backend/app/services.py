"""Randevu zamanı ve alan yetkilendirmesi için ortak iş kuralları."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select

from app.models import Randevu, Uzman

ISTANBUL = ZoneInfo("Europe/Istanbul")


def profil_bul(db, uzman_id, kilitle=False):
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


def musait_saatler(db, profile: Uzman) -> list[str]:
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
    schedule = {item["gun"]: item for item in profile.calisma_saatleri}
    slots = []
    for offset in range(15):
        day = now + timedelta(days=offset)
        hours = schedule.get(day.weekday())
        if not hours:
            continue
        for hour in range(hours["baslangic"], hours["bitis"]):
            slot = day.replace(hour=hour, minute=0, second=0, microsecond=0)
            if slot > now and int(slot.timestamp()) not in busy:
                slots.append(slot.isoformat())
    return slots
