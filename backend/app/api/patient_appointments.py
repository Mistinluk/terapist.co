"""Çerez veya tek randevuya özel bağlantıyla üyesiz randevu yönetimi."""

import time
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.notifications import bildirim_ekle
from app.models import Randevu, Uzman
from app.randevu_takip import (
    CEREZ,
    baglanti_dogrula,
    baglanti_uret,
    danisan_kosulu,
    degistirilebilir_dogrula,
    sayimlar,
)
from app.randevu_takvim import kuyruga_ekle
from app.schemas import (
    DanisanRandevuCikti,
    OzelRandevuCikti,
    RandevuBaglantiCikti,
    RandevuBaglantiGirdi,
    RandevuOzeti,
    RandevuTarihGirdi,
)
from app.security import Db, denetle, hiz_siniri, istemci
from app.services import ISTANBUL, musait_saatler, profil_bul

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
    iptal_et(db, booking)


def uzmana_bildir(
    db: Session, booking: Randevu, baslik: str, mesaj: str
) -> None:
    """Danışanın yaptığı değişikliği uzman paneline iletir."""
    profile = db.get(Uzman, booking.uzman_id)
    bildirim_ekle(
        db,
        alici_kullanici_id=profile.kullanici_id,
        randevu_id=booking.id,
        tur="randevu_guncelleme",
        baslik=baslik,
        mesaj=mesaj,
        hedef_yol="/panel?sekme=randevular",
        now=int(time.time()),
    )


def iptal_et(db: Session, booking: Randevu) -> None:
    """Çerez ve özel bağlantı aynı iptal/Google/bildirim işlemini kullanır."""
    degistirilebilir_dogrula(booking)
    booking.durum = "iptal"
    kuyruga_ekle(db, booking)
    uzmana_bildir(
        db,
        booking,
        "Randevu iptal edildi",
        "Danışan randevusunu iptal etti.",
    )
    denetle(db, "randevu.danisan_iptal", kaynak_id=booking.id)
    db.commit()


@router.delete("/oturum", status_code=204)
def cikis(response: Response):
    """Paylaşılan cihazda erişimi kapatır; randevuları iptal etmez."""
    response.delete_cookie(CEREZ, path="/api")


@router.post(
    "/randevular/{randevu_id}/baglanti",
    response_model=RandevuBaglantiCikti,
)
def baglanti_yenile(randevu_id: str, request: Request, db: Db):
    """Rezervasyonu yapan tarayıcı link üretebilir; eski link iptal olur."""
    hiz_siniri.kontrol("takip-uret:" + istemci(request), 30, 3600)
    booking = db.scalar(
        select(Randevu)
        .where(Randevu.id == randevu_id, danisan_kosulu(request))
        .with_for_update()
    )
    if not booking:
        raise HTTPException(404, "Randevu bulunamadı.")
    result = baglanti_uret(booking)
    denetle(db, "randevu.baglanti_yenile", kaynak_id=booking.id)
    db.commit()
    return result


def ozel_bul(
    db: Session,
    randevu_id: str,
    body: RandevuBaglantiGirdi,
    request: Request,
    *,
    kilitle: bool = False,
) -> Randevu:
    """URL yerine POST gövdesindeki anahtar yalnız tek randevuyu açar."""
    hiz_siniri.kontrol("takip-oku:" + istemci(request), 120, 60)
    query = select(Randevu).where(Randevu.id == randevu_id)
    if kilitle:
        query = query.with_for_update().execution_options(
            populate_existing=True
        )
    return baglanti_dogrula(db.scalar(query), body.anahtar.get_secret_value())


def ozel_cikti(db: Session, booking: Randevu) -> OzelRandevuCikti:
    """Link sahibine iletişim bilgileri veya başka randevular verilmez."""
    profile = db.get(Uzman, booking.uzman_id)
    return OzelRandevuCikti(
        id=booking.id,
        uzman_id=booking.uzman_id,
        uzman_adi=profile.ad,
        durum=booking.durum,
        baslangic=datetime.fromtimestamp(booking.baslangic, UTC),
        bitis=datetime.fromtimestamp(
            booking.bitis or booking.baslangic + 3600, UTC
        ),
        takip_son_kullanim=datetime.fromtimestamp(
            booking.takip_son_kullanim, UTC
        ),
    )


@router.post(
    "/randevu/{randevu_id}/goruntule", response_model=OzelRandevuCikti
)
def ozel_goruntule(
    randevu_id: str, body: RandevuBaglantiGirdi, request: Request, db: Db
):
    """Salt okuma POST'u: anahtarı URL/Referer/erişim günlüğüne taşımaz."""
    return ozel_cikti(db, ozel_bul(db, randevu_id, body, request))


@router.post("/randevu/{randevu_id}/saatler")
def ozel_saatler(
    randevu_id: str, body: RandevuBaglantiGirdi, request: Request, db: Db
):
    booking = ozel_bul(db, randevu_id, body, request)
    degistirilebilir_dogrula(booking)
    profile = profil_bul(db, booking.uzman_id)
    duration = (booking.bitis or booking.baslangic + 3600) - booking.baslangic
    return {"saatler": musait_saatler(db, profile, sure_saniye=duration)}


@router.post("/randevu/{randevu_id}/iptal", status_code=204)
def ozel_iptal(
    randevu_id: str, body: RandevuBaglantiGirdi, request: Request, db: Db
):
    booking = ozel_bul(db, randevu_id, body, request, kilitle=True)
    iptal_et(db, booking)


@router.post("/randevu/{randevu_id}/tarih", response_model=OzelRandevuCikti)
def ozel_tarih(
    randevu_id: str, body: RandevuTarihGirdi, request: Request, db: Db
):
    """Aynı kaydı yeni saate taşır ve uzman onayını yeniden ister.

    Yeni rezervasyonla aynı sırada önce uzman, sonra randevu kilitlenir.
    Çakışmada eski zaman korunur. Sayımlar için oluşturma tarihi değişmez;
    yanıt süresi yeni talep zamanından hesaplanır. Google işi aynı commit'te
    güncellenir; mevcut etkinlik kimliği ve takip bağlantısı korunur.
    """
    booking = ozel_bul(db, randevu_id, body, request)
    hiz_siniri.kontrol("takip-tarih:" + booking.id, 20, 3600)
    profile = profil_bul(db, booking.uzman_id, kilitle=True)
    booking = ozel_bul(db, randevu_id, body, request, kilitle=True)
    degistirilebilir_dogrula(booking)
    duration = (booking.bitis or booking.baslangic + 3600) - booking.baslangic
    slot = body.baslangic.astimezone(ISTANBUL).isoformat()
    if slot not in musait_saatler(
        db, profile, takvim_tazeligi=60, sure_saniye=duration
    ):
        raise HTTPException(409, "Bu saat uygun değil. Başka bir saat seçin.")
    booking.baslangic = int(body.baslangic.timestamp())
    booking.bitis = booking.baslangic + duration
    booking.durum = "bekliyor"
    booking.son_talep_zamani = int(time.time())
    try:
        db.flush()
        kuyruga_ekle(db, booking)
        uzmana_bildir(
            db,
            booking,
            "Randevu tarihi değiştirildi",
            "Danışan yeni bir saat seçti. Randevu yeniden onayınızı bekliyor.",
        )
        denetle(db, "randevu.danisan_tarih", kaynak_id=booking.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu saat doldu. Başka bir saat seçin."
        ) from None
    return ozel_cikti(db, booking)
