"""Şifreli randevu talepleri ve yalnızca sahibi olan uzmanın erişimi."""

import time
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.api.notifications import bildirim_ekle, tarih_etiketi
from app.config import get_settings
from app.models import (
    Bildirim,
    Kullanici,
    Randevu,
    RandevuBildirimi,
    RandevuTakvimIsi,
)
from app.randevu_takip import (
    baglanti_uret,
    oturum_yaz,
    sayimlar,
    tamamlanma_dogrula,
    yeni_veya_mevcut_anahtar,
)
from app.randevu_takvim import kuyruga_ekle
from app.schemas import (
    DurumGirdi,
    RandevuBaglantiCikti,
    RandevuCikti,
    RandevuGirdi,
    RandevuOzeti,
)
from app.security import (
    AktifUzman,
    Db,
    coz,
    denetle,
    hiz_siniri,
    istemci,
    ozet,
    sifrele,
)
from app.services import ISTANBUL, musait_saatler, profil_bul

router = APIRouter(tags=["Randevular"])


@router.post("/randevular", status_code=201)
def talep(body: RandevuGirdi, request: Request, response: Response, db: Db):
    hiz_siniri.kontrol("randevu:" + istemci(request), 5, 3600)
    settings = get_settings()
    if body.aydinlatma_surumu != settings.aydinlatma_surumu:
        raise HTTPException(
            409, "Aydınlatma metni değişti. Sayfayı yenileyin."
        )
    profile = profil_bul(db, body.uzman_id, kilitle=True)
    slot = body.baslangic.astimezone(ISTANBUL).isoformat()
    # Talep anında Google Takvim verisi en fazla bir dakikalık olmalıdır.
    if slot not in musait_saatler(db, profile, takvim_tazeligi=60):
        db.commit()
        raise HTTPException(409, "Bu saat uygun değil. Başka bir saat seçin.")
    token = yeni_veya_mevcut_anahtar(request)
    booking = Randevu(
        uzman_id=profile.id,
        baslangic=int(body.baslangic.timestamp()),
        bitis=int(body.baslangic.timestamp())
        + (profile.seans_suresi_dakika or 60) * 60,
        danisan_oturum_ozeti=ozet(token),
        danisan_sifreli=sifrele({"ad": body.ad, "telefon": body.telefon}),
        olusturma=int(time.time()),
        aydinlatma_surumu=body.aydinlatma_surumu,
    )
    db.add(booking)
    try:
        db.flush()
        link = baglanti_uret(booking)
        kuyruga_ekle(db, booking)
        denetle(db, "randevu.olustur", kaynak_id=booking.id)
        slot_label = tarih_etiketi(booking.baslangic)
        if profile.kullanici_id:
            bildirim_ekle(
                db,
                alici_kullanici_id=profile.kullanici_id,
                randevu_id=booking.id,
                tur="yeni_randevu",
                baslik="Yeni randevu talebi",
                mesaj=f"{slot_label} için yeni bir randevu talebi aldınız.",
                hedef_yol="/panel?sekme=randevular",
                now=booking.olusturma,
            )
        admin_ids = db.scalars(
            select(Kullanici.id).where(Kullanici.rol == "yonetici")
        ).all()
        for admin_id in admin_ids:
            bildirim_ekle(
                db,
                alici_kullanici_id=admin_id,
                randevu_id=booking.id,
                tur="yeni_randevu",
                baslik="Yeni randevu talebi",
                mesaj=(
                    f"{profile.ad} için {slot_label} tarihli yeni "
                    "randevu talebi oluşturuldu."
                ),
                hedef_yol="/yonetim?sekme=randevular",
                now=booking.olusturma,
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu saat doldu. Başka bir saat seçin."
        ) from None
    oturum_yaz(response, token)
    return {
        "mesaj": "Randevu talebiniz alındı. Uzman onayı bekleniyor.",
        "randevu_id": booking.id,
        **link.model_dump(mode="json"),
    }


@router.post(
    "/uzman/randevular/{randevu_id}/baglanti",
    response_model=RandevuBaglantiCikti,
)
def danisan_baglantisi(randevu_id: str, me: AktifUzman, db: Db):
    """Uzman kendi randevusunun linkini danışana iletmek için yenileyebilir."""
    hiz_siniri.kontrol("takip-uret:" + me.id, 30, 3600)
    booking = db.scalar(
        select(Randevu)
        .where(Randevu.id == randevu_id, Randevu.uzman_id == me.id)
        .with_for_update()
    )
    if not booking:
        raise HTTPException(404, "Randevu bulunamadı.")
    result = baglanti_uret(booking)
    denetle(db, "randevu.baglanti_yenile", me.kullanici_id, booking.id)
    db.commit()
    return result


@router.get("/uzman/randevular", response_model=list[RandevuCikti])
def randevular(
    me: AktifUzman,
    db: Db,
    sayfa: Annotated[int, Query(ge=1)] = 1,
):
    bookings = db.execute(
        select(Randevu, RandevuTakvimIsi.durum)
        .outerjoin(RandevuTakvimIsi)
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
            bitis=datetime.fromtimestamp(b.bitis or b.baslangic + 3600, UTC),
            takvim_durumu=takvim_durumu,
        )
        for b, takvim_durumu in bookings
    ]
    denetle(db, "randevu.listele", me.kullanici_id, me.id)
    db.commit()
    return result


@router.get("/uzman/randevu-ozeti", response_model=RandevuOzeti)
def randevu_ozeti(me: AktifUzman, db: Db):
    """Uzmanın tüm sayfalardaki kayıtlarını durum bazında sayar."""
    return sayimlar(db, Randevu.uzman_id == me.id)


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
        "onaylandi": {"iptal", "tamamlandi"},
    }
    if body.durum not in transitions.get(booking.durum, set()):
        raise HTTPException(409, "Bu randevunun durumu değiştirilemez.")
    tamamlanma_dogrula(booking, body.durum)
    booking.durum = body.durum
    kuyruga_ekle(db, booking)
    now = int(time.time())
    db.execute(
        update(RandevuBildirimi)
        .where(
            RandevuBildirimi.randevu_id == booking.id,
            RandevuBildirimi.uzman_id == me.id,
            RandevuBildirimi.okundu.is_(False),
        )
        .values(okundu=True, okunma_zamani=now)
    )
    db.execute(
        update(Bildirim)
        .where(
            Bildirim.randevu_id == booking.id,
            Bildirim.alici_kullanici_id == me.kullanici_id,
            Bildirim.okundu.is_(False),
        )
        .values(okundu=True, okunma_zamani=now)
    )
    denetle(db, "randevu." + body.durum, me.kullanici_id, booking.id)
    db.commit()


@router.get("/uzman/bildirimler")
def uzman_bildirimleri(me: AktifUzman, db: Db):
    """Yöneticinin randevular için gönderdiği bildirimleri listeler."""

    rows = db.execute(
        select(RandevuBildirimi, Randevu.baslangic, Randevu.durum)
        .join(Randevu, Randevu.id == RandevuBildirimi.randevu_id)
        .where(RandevuBildirimi.uzman_id == me.id)
        .order_by(
            RandevuBildirimi.okundu.asc(), RandevuBildirimi.olusturma.desc()
        )
        .limit(20)
    ).all()
    unread_count = db.scalar(
        select(func.count())
        .select_from(RandevuBildirimi)
        .where(
            RandevuBildirimi.uzman_id == me.id,
            RandevuBildirimi.okundu.is_(False),
        )
    )
    return {
        "okunmamis_sayisi": int(unread_count or 0),
        "kayitlar": [
            {
                "id": item.id,
                "randevu_id": item.randevu_id,
                "tur": item.tur,
                "mesaj": item.mesaj,
                "okundu": item.okundu,
                "olusturma": item.olusturma,
                "randevu_baslangic": baslangic,
                "randevu_durum": durum,
            }
            for item, baslangic, durum in rows
        ],
    }


@router.patch("/uzman/bildirimler/{bildirim_id}/okundu", status_code=204)
def uzman_bildirimi_okundu(bildirim_id: str, me: AktifUzman, db: Db):
    notification = db.scalar(
        select(RandevuBildirimi).where(
            RandevuBildirimi.id == bildirim_id,
            RandevuBildirimi.uzman_id == me.id,
        )
    )
    if not notification:
        raise HTTPException(404, "Bildirim bulunamadı.")
    if not notification.okundu:
        notification.okundu = True
        notification.okunma_zamani = int(time.time())
        db.commit()
