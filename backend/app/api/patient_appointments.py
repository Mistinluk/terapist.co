"""Danışanın kayıt olmadan, kendi tarayıcısıyla randevularını izlemesi."""

import time
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy import select

from app.api.notifications import bildirim_ekle
from app.models import Randevu, Uzman
from app.randevu_takip import CEREZ, danisan_kosulu, sayimlar
from app.randevu_takvim import kuyruga_ekle
from app.schemas import DanisanRandevuCikti, RandevuOzeti
from app.security import Db, denetle

router = APIRouter(prefix="/danisan", tags=["Danışan randevuları"])


@router.get("/randevular", response_model=list[DanisanRandevuCikti])
def liste(
    request: Request,
    db: Db,
    sayfa: Annotated[int, Query(ge=1)] = 1,
):
    """Yalnız çerezin sahibi olan danışanın taleplerini gösterir."""
    rows = db.execute(
        select(Randevu, Uzman.ad)
        .join(Uzman)
        .where(danisan_kosulu(request))
        .order_by(Randevu.baslangic.desc(), Randevu.id)
        .offset((sayfa - 1) * 50)
        .limit(50)
    )
    return [
        DanisanRandevuCikti(
            id=b.id,
            uzman_adi=ad,
            uzman_id=b.uzman_id,
            durum=b.durum,
            baslangic=datetime.fromtimestamp(b.baslangic, UTC),
            bitis=datetime.fromtimestamp(b.bitis or b.baslangic + 3600, UTC),
        )
        for b, ad in rows
    ]


@router.get("/randevu-ozeti", response_model=RandevuOzeti)
def ozet(request: Request, db: Db):
    return sayimlar(db, danisan_kosulu(request))


@router.post("/randevular/{randevu_id}/iptal", status_code=204)
def iptal(randevu_id: str, request: Request, db: Db):
    """Danışan yalnız kendi gelecekteki aktif talebini iptal edebilir."""
    booking = db.scalar(
        select(Randevu)
        .where(Randevu.id == randevu_id, danisan_kosulu(request))
        .with_for_update()
    )
    if not booking:
        raise HTTPException(404, "Randevu bulunamadı.")
    if booking.durum not in {
        "bekliyor",
        "onaylandi",
    } or booking.baslangic <= int(time.time()):
        raise HTTPException(409, "Bu randevu iptal edilemez.")
    booking.durum = "iptal"
    kuyruga_ekle(db, booking)
    profile = db.get(Uzman, booking.uzman_id)
    bildirim_ekle(
        db,
        alici_kullanici_id=profile.kullanici_id,
        randevu_id=booking.id,
        tur="randevu_guncelleme",
        baslik="Randevu iptal edildi",
        mesaj="Danışan randevusunu iptal etti.",
        hedef_yol="/panel?sekme=randevular",
        now=int(time.time()),
    )
    denetle(db, "randevu.danisan_iptal", kaynak_id=booking.id)
    db.commit()


@router.delete("/oturum", status_code=204)
def cikis(response: Response):
    """Paylaşılan cihazda erişimi kapatır; randevuları iptal etmez."""
    response.delete_cookie(CEREZ, path="/api")
