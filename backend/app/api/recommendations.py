"""Uzmanın çalışmadığı alanlar için doğrulanmış meslektaş önerileri."""

import time
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import aliased

from app.eslestirme import listede_var, turkce_ad_sirasi
from app.models import Tavsiye, TerapistDogrulama, Uzman
from app.schemas import TavsiyeOlusturGirdi
from app.security import Db, DogrulanmisUzman, denetle, hiz_siniri, istemci
from app.services import engelli_uzman_idleri, profil_bul, uzmanlar_engelli

router = APIRouter(tags=["Terapist önerileri"])


def _uzman_ciktisi(profile: Uzman) -> dict:
    return {"id": profile.id, "ad": profile.ad}


def _dogrulanmis_aday_sorgusu(me: Uzman):
    return (
        select(Uzman)
        .join(
            TerapistDogrulama,
            TerapistDogrulama.uzman_id == Uzman.id,
        )
        .where(
            Uzman.id != me.id,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )


def _uzmanlik_dogrula(me: Uzman, uzmanlik: str) -> None:
    if uzmanlik in me.uzmanliklar:
        raise HTTPException(
            422, "Kendi çalıştığınız bir alan için yönlendirme ekleyemezsiniz."
        )


@router.get("/uzmanlar/{uzman_id}/tavsiyeler")
def public_tavsiyeler(uzman_id: str, request: Request, db: Db):
    hiz_siniri.kontrol("tavsiye-public:" + istemci(request), 120, 60)
    owner = profil_bul(db, uzman_id)
    if not owner.tavsiyeleri_goster:
        return {"toplam": 0, "gruplar": []}
    target = aliased(Uzman)
    rows = db.execute(
        select(Tavsiye, target)
        .join(target, target.id == Tavsiye.alan_id)
        .join(
            TerapistDogrulama,
            TerapistDogrulama.uzman_id == target.id,
        )
        .where(
            Tavsiye.veren_id == owner.id,
            target.onayli.is_(True),
            target.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
        .order_by(Tavsiye.uzmanlik, target.ad, target.id)
        .limit(100)
    ).all()
    groups: dict[str, list[dict]] = defaultdict(list)
    for recommendation, profile in rows:
        groups[recommendation.uzmanlik].append(_uzman_ciktisi(profile))
    return {
        "toplam": len(rows),
        "gruplar": [
            {"uzmanlik": specialty, "terapistler": therapists}
            for specialty, therapists in groups.items()
        ],
    }


@router.get("/uzmanlar/{uzman_id}/alinan-tavsiyeler")
def public_alinan_tavsiyeler(uzman_id: str, request: Request, db: Db):
    """Bu terapisti kendi profili üzerinden öneren doğrulanmış meslektaşlar."""
    hiz_siniri.kontrol("tavsiye-alinan:" + istemci(request), 120, 60)
    owner = profil_bul(db, uzman_id)
    if not owner.tavsiyeleri_goster:
        return {"toplam": 0, "oneriler": []}
    blocked = engelli_uzman_idleri(db, owner.id)
    referrer = aliased(Uzman)
    rows = db.execute(
        select(Tavsiye, referrer)
        .join(referrer, referrer.id == Tavsiye.veren_id)
        .join(
            TerapistDogrulama,
            TerapistDogrulama.uzman_id == referrer.id,
        )
        .where(
            Tavsiye.alan_id == owner.id,
            referrer.onayli.is_(True),
            referrer.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
        .order_by(Tavsiye.olusturma.desc(), referrer.ad)
        .limit(50)
    ).all()
    items = [
        {
            "id": source.id,
            "ad": source.ad,
            "unvan": source.unvan,
            "kullanici_adi": source.kullanici_adi,
            "profil_fotografi_url": source.profil_fotografi_url,
            "sehir": source.sehir,
            "uzmanlik": recommendation.uzmanlik,
        }
        for recommendation, source in rows
        if source.id not in blocked
    ]
    return {"toplam": len(items), "oneriler": items}


@router.get("/uzman/tavsiye-uzmanliklari")
def tavsiye_uzmanliklari(me: DogrulanmisUzman, db: Db):
    blocked = engelli_uzman_idleri(db, me.id)
    profiles = [
        profile
        for profile in db.scalars(_dogrulanmis_aday_sorgusu(me)).all()
        if profile.id not in blocked
    ]
    specialties = {
        specialty
        for profile in profiles
        for specialty in profile.uzmanliklar
        if specialty not in me.uzmanliklar
    }
    return {"uzmanliklar": sorted(specialties)}


@router.get("/uzman/tavsiye-adaylari")
def tavsiye_adaylari(
    me: DogrulanmisUzman,
    db: Db,
    uzmanlik: Annotated[str, Query(min_length=1, max_length=100)],
):
    _uzmanlik_dogrula(me, uzmanlik)
    blocked = engelli_uzman_idleri(db, me.id)
    profiles = [
        profile
        for profile in db.scalars(
            _dogrulanmis_aday_sorgusu(me)
            .where(listede_var(db, Uzman.uzmanliklar, uzmanlik))
            .order_by(turkce_ad_sirasi(), Uzman.id)
            .limit(100)
        )
        if profile.id not in blocked
    ]
    return {"terapistler": [_uzman_ciktisi(profile) for profile in profiles]}


@router.get("/uzman/tavsiyeler")
def kendi_tavsiyeleri(me: DogrulanmisUzman, db: Db):
    target = aliased(Uzman)
    verification = aliased(TerapistDogrulama)
    rows = db.execute(
        select(Tavsiye, target, verification.durum)
        .join(target, target.id == Tavsiye.alan_id)
        .outerjoin(verification, verification.uzman_id == target.id)
        .where(Tavsiye.veren_id == me.id)
        .order_by(Tavsiye.uzmanlik, target.ad, target.id)
        .limit(100)
    ).all()
    return {
        "tavsiyeler": [
            {
                "uzmanlik": recommendation.uzmanlik,
                "terapist": _uzman_ciktisi(profile),
                "olusturma": recommendation.olusturma,
                "aktif": (
                    profile.onayli
                    and not profile.arsivli
                    and verification_status == "verified"
                ),
            }
            for recommendation, profile, verification_status in rows
        ]
    }


@router.post("/uzman/tavsiyeler", status_code=201)
def tavsiye_olustur(
    body: TavsiyeOlusturGirdi,
    request: Request,
    me: DogrulanmisUzman,
    db: Db,
):
    hiz_siniri.kontrol("tavsiye-ekle:" + me.id, 20, 24 * 60 * 60)
    hiz_siniri.kontrol("tavsiye-ekle-ip:" + istemci(request), 50, 60 * 60)
    _uzmanlik_dogrula(me, body.uzmanlik)
    if (
        db.scalar(
            select(func.count())
            .select_from(Tavsiye)
            .where(Tavsiye.veren_id == me.id)
        )
        >= 50
    ):
        raise HTTPException(
            409, "En fazla 50 meslektaş önerisi ekleyebilirsiniz."
        )
    target = profil_bul(db, body.uzman_id)
    if target.id == me.id:
        raise HTTPException(403, "Kendinizi öneremezsiniz.")
    if uzmanlar_engelli(db, me.id, target.id):
        raise HTTPException(403, "Bu terapistle etkileşim kuramazsınız.")
    verified = db.scalar(
        select(TerapistDogrulama.id).where(
            TerapistDogrulama.uzman_id == target.id,
            TerapistDogrulama.durum == "verified",
        )
    )
    if not verified:
        raise HTTPException(
            422, "Yalnız doğrulanmış terapistler önerilebilir."
        )
    if body.uzmanlik not in target.uzmanliklar:
        raise HTTPException(422, "Seçilen terapist bu alanda çalışmıyor.")
    if db.get(Tavsiye, (me.id, target.id)):
        raise HTTPException(409, "Bu terapisti daha önce önerdiniz.")
    recommendation = Tavsiye(
        veren_id=me.id,
        alan_id=target.id,
        uzmanlik=body.uzmanlik,
        olusturma=int(time.time()),
    )
    db.add(recommendation)
    denetle(db, "tavsiye.olustur", me.kullanici_id, target.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Bu terapisti daha önce önerdiniz.") from None
    return {
        "uzmanlik": recommendation.uzmanlik,
        "terapist": _uzman_ciktisi(target),
        "olusturma": recommendation.olusturma,
        "aktif": True,
    }


@router.delete("/uzman/tavsiyeler/{uzman_id}", status_code=204)
def tavsiye_sil(
    uzman_id: str,
    request: Request,
    me: DogrulanmisUzman,
    db: Db,
):
    hiz_siniri.kontrol("tavsiye-sil:" + me.id, 60, 60 * 60)
    recommendation = db.get(Tavsiye, (me.id, uzman_id))
    if not recommendation:
        raise HTTPException(404, "Meslektaş önerisi bulunamadı.")
    db.delete(recommendation)
    denetle(db, "tavsiye.sil", me.kullanici_id, uzman_id)
    db.commit()
    return Response(status_code=204)
