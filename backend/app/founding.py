"""Doğrulama sırasına göre değişmez kurucu terapist kimliği tahsisi."""

import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    KurucuProgramiAyari,
    KurucuUye,
    TerapistDogrulama,
    Uzman,
)

VARSAYILAN_AZAMI_UYE = 500


def program_ayari(
    db: Session, *, kilitle: bool = False
) -> KurucuProgramiAyari:
    query = select(KurucuProgramiAyari).where(KurucuProgramiAyari.id == 1)
    if kilitle:
        query = query.with_for_update()
    setting = db.scalar(query)
    if setting:
        return setting
    setting = KurucuProgramiAyari(
        id=1,
        azami_uye=VARSAYILAN_AZAMI_UYE,
        guncelleme=int(time.time()),
        guncelleyen_kullanici_id=None,
    )
    db.add(setting)
    db.flush()
    return setting


def kuruculari_tamamla(db: Session, yonetici_id: str) -> list[KurucuUye]:
    """Boş kontenjanı ilk doğrulanan terapistlerden başlayarak doldurur."""
    setting = program_ayari(db, kilitle=True)
    last_number = db.scalar(select(func.max(KurucuUye.kurucu_no))) or 0
    next_number = last_number + 1
    if next_number > setting.azami_uye:
        return []
    candidates = db.execute(
        select(Uzman.id, TerapistDogrulama.incelenme)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .outerjoin(KurucuUye, KurucuUye.uzman_id == Uzman.id)
        .where(
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
            KurucuUye.id.is_(None),
        )
        .order_by(
            func.coalesce(
                TerapistDogrulama.incelenme,
                TerapistDogrulama.gonderilme,
            ),
            TerapistDogrulama.gonderilme,
            Uzman.id,
        )
        .limit(setting.azami_uye - next_number + 1)
    )
    assigned = []
    now = int(time.time())
    for profile_id, verified_at in candidates:
        founding = KurucuUye(
            uzman_id=profile_id,
            kurucu_no=next_number,
            verilme=verified_at or now,
            veren_kullanici_id=yonetici_id,
        )
        db.add(founding)
        assigned.append(founding)
        next_number += 1
    db.flush()
    return assigned


def program_ozeti(db: Session) -> dict:
    setting = program_ayari(db)
    assigned = db.scalar(select(func.count()).select_from(KurucuUye)) or 0
    last_number = db.scalar(select(func.max(KurucuUye.kurucu_no))) or 0
    next_number = last_number + 1
    return {
        "azami_uye": setting.azami_uye,
        "atanmis_uye": assigned,
        "kalan": max(setting.azami_uye - last_number, 0),
        "siradaki_numara": (
            next_number if next_number <= setting.azami_uye else None
        ),
    }
