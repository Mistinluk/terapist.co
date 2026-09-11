"""Şifreli randevu talepleri ve yalnızca sahibi olan uzmanın erişimi."""

import time
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.models import Randevu
from app.schemas import DurumGirdi, RandevuCikti, RandevuGirdi
from app.security import (
    AktifUzman,
    Db,
    coz,
    denetle,
    hiz_siniri,
    istemci,
    sifrele,
)
from app.services import ISTANBUL, musait_saatler, profil_bul

router = APIRouter(tags=["Randevular"])


@router.post("/randevular", status_code=201)
def talep(body: RandevuGirdi, request: Request, db: Db):
    hiz_siniri.kontrol("randevu:" + istemci(request), 5, 3600)
    settings = get_settings()
    if body.aydinlatma_surumu != settings.aydinlatma_surumu:
        raise HTTPException(
            409, "Aydınlatma metni değişti. Sayfayı yenileyin."
        )
    profile = profil_bul(db, body.uzman_id, kilitle=True)
    slot = body.baslangic.astimezone(ISTANBUL).isoformat()
    if slot not in musait_saatler(db, profile):
        raise HTTPException(409, "Bu saat uygun değil. Başka bir saat seçin.")
    booking = Randevu(
        uzman_id=profile.id,
        baslangic=int(body.baslangic.timestamp()),
        danisan_sifreli=sifrele({"ad": body.ad, "telefon": body.telefon}),
        olusturma=int(time.time()),
        aydinlatma_surumu=body.aydinlatma_surumu,
    )
    db.add(booking)
    try:
        db.flush()
        denetle(db, "randevu.olustur", kaynak_id=booking.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu saat doldu. Başka bir saat seçin."
        ) from None
    return {
        "mesaj": "Randevu talebiniz alındı. Uzman sizinle iletişime geçecek."
    }


@router.get("/uzman/randevular", response_model=list[RandevuCikti])
def randevular(
    me: AktifUzman,
    db: Db,
    sayfa: Annotated[int, Query(ge=1)] = 1,
):
    bookings = db.scalars(
        select(Randevu)
        .where(Randevu.uzman_id == me.id)
        .order_by(Randevu.baslangic.desc())
        .offset((sayfa - 1) * 50)
        .limit(50)
    )
    result = [
        RandevuCikti(
            id=b.id,
            uzman_id=b.uzman_id,
            baslangic=datetime.fromtimestamp(b.baslangic, UTC),
            durum=b.durum,
            ad=coz(b.danisan_sifreli)["ad"],
            telefon=coz(b.danisan_sifreli)["telefon"],
        )
        for b in bookings
    ]
    denetle(db, "randevu.listele", me.kullanici_id, me.id)
    db.commit()
    return result


@router.patch("/uzman/randevular/{randevu_id}", status_code=204)
def durum_degistir(randevu_id: str, body: DurumGirdi, me: AktifUzman, db: Db):
    booking = db.scalar(
        select(Randevu)
        .where(Randevu.id == randevu_id, Randevu.uzman_id == me.id)
        .with_for_update()
    )
    if not booking:
        raise HTTPException(404, "Randevu bulunamadı.")
    transitions = {
        "bekliyor": {"onaylandi", "reddedildi", "iptal"},
        "onaylandi": {"iptal"},
    }
    if body.durum not in transitions.get(booking.durum, set()):
        raise HTTPException(409, "Bu randevunun durumu değiştirilemez.")
    booking.durum = body.durum
    denetle(db, "randevu." + body.durum, me.kullanici_id, booking.id)
    db.commit()
