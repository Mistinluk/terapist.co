"""Takvim dolduğunda ziyaretçi bekleme listesi ve KVKK-güvenli yönetim."""

import time

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import select

from app.api.notifications import bildirim_ekle
from app.config import get_settings
from app.models import BeklemeListesiKaydi
from app.schemas import (
    BeklemeListesiDurumGirdi,
    BeklemeListesiGirdi,
    BeklemeListesiKaydiCikti,
)
from app.security import (
    AktifUzman,
    Db,
    coz,
    denetle,
    hiz_siniri,
    istemci,
    sifrele,
)
from app.services import profil_bul

router = APIRouter(tags=["Bekleme listesi"])


@router.post("/bekleme-listesi", status_code=201)
def bekleme_listesine_ekle(
    body: BeklemeListesiGirdi, request: Request, db: Db
):
    hiz_siniri.kontrol("bekleme-listesi:" + istemci(request), 6, 3600)
    settings = get_settings()
    if body.aydinlatma_surumu != settings.aydinlatma_surumu:
        raise HTTPException(
            409, "Aydınlatma metni değişti. Sayfayı yenileyin."
        )
    profile = profil_bul(db, body.uzman_id, kilitle=True)
    if not profile.bekleme_listesi_acik:
        raise HTTPException(
            409, "Bu uzman şu anda bekleme listesi kaydı kabul etmiyor."
        )
    now = int(time.time())
    entry = BeklemeListesiKaydi(
        uzman_id=profile.id,
        danisan_sifreli=sifrele(
            {
                "ad": body.ad,
                "telefon": body.telefon,
                "email": str(body.email or ""),
            }
        ),
        tercih_format=body.tercih_format,
        tercih_zaman=body.tercih_zaman,
        durum="bekliyor",
        aydinlatma_surumu=body.aydinlatma_surumu,
        olusturma=now,
    )
    db.add(entry)
    db.flush()
    denetle(db, "bekleme_listesi.olustur", kaynak_id=entry.id)
    if profile.kullanici_id:
        bildirim_ekle(
            db,
            alici_kullanici_id=profile.kullanici_id,
            tur="sistem_hatirlatma",
            baslik="Yeni bekleme listesi kaydı",
            mesaj=(
                "Takviminizde boşalacak saatler için yeni bir danışan "
                "bekleme listesine katıldı."
            ),
            hedef_yol="/panel?sekme=randevular",
            now=now,
        )
    db.commit()
    return {
        "mesaj": (
            "Bekleme listesi kaydınız alındı. Uygun bir saat açıldığında "
            "uzman sizinle iletişime geçecektir."
        )
    }


@router.get(
    "/uzman/bekleme-listesi", response_model=list[BeklemeListesiKaydiCikti]
)
def bekleme_listesi_getir(me: AktifUzman, db: Db):
    rows = list(
        db.scalars(
            select(BeklemeListesiKaydi)
            .where(BeklemeListesiKaydi.uzman_id == me.id)
            .order_by(
                (BeklemeListesiKaydi.durum == "bekliyor").desc(),
                BeklemeListesiKaydi.olusturma.desc(),
            )
            .limit(100)
        )
    )
    result = []
    for row in rows:
        data = coz(row.danisan_sifreli)
        result.append(
            BeklemeListesiKaydiCikti(
                id=row.id,
                ad=data.get("ad", ""),
                telefon=data.get("telefon", ""),
                email=data.get("email") or None,
                tercih_format=row.tercih_format,
                tercih_zaman=row.tercih_zaman,
                durum=row.durum,
                olusturma=row.olusturma,
                guncelleme=row.guncelleme,
            )
        )
    denetle(db, "bekleme_listesi.listele", me.kullanici_id, me.id)
    db.commit()
    return result


@router.patch("/uzman/bekleme-listesi/{entry_id}", status_code=204)
def bekleme_listesi_guncelle(
    entry_id: str,
    body: BeklemeListesiDurumGirdi,
    me: AktifUzman,
    db: Db,
):
    row = db.scalar(
        select(BeklemeListesiKaydi)
        .where(
            BeklemeListesiKaydi.id == entry_id,
            BeklemeListesiKaydi.uzman_id == me.id,
        )
        .with_for_update()
    )
    if not row:
        raise HTTPException(404, "Bekleme listesi kaydı bulunamadı.")
    row.durum = body.durum
    row.guncelleme = int(time.time())
    denetle(db, "bekleme_listesi." + body.durum, me.kullanici_id, row.id)
    db.commit()
    return Response(status_code=204)


@router.delete("/uzman/bekleme-listesi/{entry_id}", status_code=204)
def bekleme_listesi_sil(entry_id: str, me: AktifUzman, db: Db):
    row = db.scalar(
        select(BeklemeListesiKaydi)
        .where(
            BeklemeListesiKaydi.id == entry_id,
            BeklemeListesiKaydi.uzman_id == me.id,
        )
        .with_for_update()
    )
    if not row:
        raise HTTPException(404, "Bekleme listesi kaydı bulunamadı.")
    db.delete(row)
    denetle(db, "bekleme_listesi.sil", me.kullanici_id, entry_id)
    db.commit()
    return Response(status_code=204)
