"""Danışan verisi taşımayan, anonim açılabilen terapist yönlendirmeleri."""

import secrets
import time
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select, update

from app.config import get_settings
from app.eslestirme import turkce_ad_sirasi
from app.models import (
    DanisanYonlendirme,
    TerapistDogrulama,
    Uzman,
    YonlendirmeHedefi,
    YonlendirmeOlayi,
)
from app.schemas import DanisanYonlendirmeGirdi
from app.security import (
    Db,
    DogrulanmisUzman,
    denetle,
    hiz_siniri,
    istemci,
    ozet,
)
from app.services import engelli_uzman_idleri, uzmanlar_engelli

router = APIRouter(tags=["Danışan yönlendirmeleri"])
settings = get_settings()
YONLENDIRME_SURESI = 90 * 24 * 60 * 60
YonlendirmeTokeni = Annotated[str, Path(min_length=40, max_length=100)]


def _profil_ciktisi(profile: Uzman) -> dict:
    return {
        "id": profile.id,
        "ad": profile.ad,
        "sehir": profile.sehir,
        "ilce": profile.ilce,
        "uzmanliklar": profile.uzmanliklar,
        "formatlar": profile.formatlar,
    }


def _dogrulanmis_profiller():
    return (
        select(Uzman)
        .join(
            TerapistDogrulama,
            TerapistDogrulama.uzman_id == Uzman.id,
        )
        .where(
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )


def _yonlendirme_bul(db: Db, token: str) -> DanisanYonlendirme:
    referral = db.scalar(
        select(DanisanYonlendirme).where(
            DanisanYonlendirme.token_ozeti == ozet(token)
        )
    )
    if not referral:
        raise HTTPException(404, "Yönlendirme bağlantısı bulunamadı.")
    if referral.durum == "active" and referral.sure_bitimi <= int(time.time()):
        referral.durum = "expired"
        db.commit()
    if referral.durum == "expired":
        raise HTTPException(410, "Bu yönlendirme bağlantısının süresi dolmuş.")
    if referral.durum != "active":
        raise HTTPException(410, "Bu yönlendirme bağlantısı kullanılamıyor.")
    return referral


def _hedef_profilleri(db: Db, referral_id: str) -> list[Uzman]:
    return list(
        db.scalars(
            _dogrulanmis_profiller()
            .join(YonlendirmeHedefi, YonlendirmeHedefi.uzman_id == Uzman.id)
            .where(YonlendirmeHedefi.yonlendirme_id == referral_id)
            .order_by(YonlendirmeHedefi.sira)
        )
    )


def _olay_ekle(
    db: Db,
    referral_id: str,
    event: str,
    target_id: str | None = None,
) -> None:
    db.add(
        YonlendirmeOlayi(
            yonlendirme_id=referral_id,
            olay=event,
            hedef_uzman_id=target_id,
            zaman=int(time.time()),
        )
    )


@router.get("/uzman/yonlendirme-adaylari")
def yonlendirme_adaylari(
    me: DogrulanmisUzman,
    db: Db,
    arama: Annotated[str, Query(max_length=150)] = "",
):
    query = _dogrulanmis_profiller().where(Uzman.id != me.id)
    if arama:
        term = arama.translate(str.maketrans("Iİ", "ıi")).lower()
        query = query.where(turkce_ad_sirasi().contains(term, autoescape=True))
    blocked = engelli_uzman_idleri(db, me.id)
    profiles = [
        profile
        for profile in db.scalars(
            query.order_by(turkce_ad_sirasi(), Uzman.id).limit(100)
        )
        if profile.id not in blocked
    ]
    return {"terapistler": [_profil_ciktisi(profile) for profile in profiles]}


@router.post("/uzman/yonlendirmeler", status_code=201)
def yonlendirme_olustur(
    body: DanisanYonlendirmeGirdi,
    request: Request,
    me: DogrulanmisUzman,
    db: Db,
):
    hiz_siniri.kontrol("yonlendirme-ekle:" + me.id, 20, 24 * 60 * 60)
    hiz_siniri.kontrol("yonlendirme-ekle-ip:" + istemci(request), 50, 60 * 60)
    profiles = list(
        db.scalars(
            _dogrulanmis_profiller().where(Uzman.id.in_(body.uzman_ids))
        )
    )
    by_id = {profile.id: profile for profile in profiles}
    if me.id in body.uzman_ids:
        raise HTTPException(403, "Kendinizi yönlendirme hedefi seçemezsiniz.")
    if any(
        uzmanlar_engelli(db, me.id, target_id) for target_id in body.uzman_ids
    ):
        raise HTTPException(
            403, "Engellenen terapist yönlendirmeye eklenemez."
        )
    if len(by_id) != len(body.uzman_ids):
        raise HTTPException(422, "Yalnız doğrulanmış terapistler seçilebilir.")
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    referral = DanisanYonlendirme(
        yonlendiren_uzman_id=me.id,
        token_ozeti=ozet(token),
        neden=body.neden,
        durum="active",
        olusturma=now,
        sure_bitimi=now + YONLENDIRME_SURESI,
    )
    db.add(referral)
    db.flush()
    for order, target_id in enumerate(body.uzman_ids):
        db.add(
            YonlendirmeHedefi(
                yonlendirme_id=referral.id,
                uzman_id=target_id,
                sira=order,
            )
        )
    _olay_ekle(db, referral.id, "referral_created")
    denetle(db, "referral_created", me.kullanici_id, referral.id)
    db.commit()
    return {
        "id": referral.id,
        "neden": referral.neden,
        "olusturma": referral.olusturma,
        "sure_bitimi": referral.sure_bitimi,
        "view_count": referral.goruntulenme_sayisi,
        "terapistler": [
            _profil_ciktisi(by_id[item]) for item in body.uzman_ids
        ],
        "url": f"{settings.uygulama_adresi.rstrip('/')}/r/{token}",
    }


@router.get("/uzman/yonlendirmeler")
def kendi_yonlendirmeleri(me: DogrulanmisUzman, db: Db):
    now = int(time.time())
    rows = list(
        db.scalars(
            select(DanisanYonlendirme)
            .where(DanisanYonlendirme.yonlendiren_uzman_id == me.id)
            .order_by(DanisanYonlendirme.olusturma.desc())
            .limit(50)
        )
    )
    result = []
    for referral in rows:
        if referral.durum == "active" and referral.sure_bitimi <= now:
            referral.durum = "expired"
        result.append(
            {
                "id": referral.id,
                "neden": referral.neden,
                "durum": referral.durum,
                "olusturma": referral.olusturma,
                "sure_bitimi": referral.sure_bitimi,
                "view_count": referral.goruntulenme_sayisi,
                "terapistler": [
                    _profil_ciktisi(profile)
                    for profile in _hedef_profilleri(db, referral.id)
                ],
            }
        )
    db.commit()
    return {"yonlendirmeler": result}


@router.get("/yonlendirmeler/{token}")
def yonlendirmeyi_gor(token: YonlendirmeTokeni, request: Request, db: Db):
    hiz_siniri.kontrol("yonlendirme-gor:" + istemci(request), 120, 60 * 60)
    referral = _yonlendirme_bul(db, token)
    owner = db.scalar(
        _dogrulanmis_profiller().where(
            Uzman.id == referral.yonlendiren_uzman_id
        )
    )
    targets = _hedef_profilleri(db, referral.id)
    if not owner or not targets:
        raise HTTPException(410, "Bu yönlendirme bağlantısı kullanılamıyor.")
    db.execute(
        update(DanisanYonlendirme)
        .where(DanisanYonlendirme.id == referral.id)
        .values(
            goruntulenme_sayisi=(DanisanYonlendirme.goruntulenme_sayisi + 1)
        )
    )
    _olay_ekle(db, referral.id, "referral_opened")
    db.commit()
    return {
        "yonlendiren": {"id": owner.id, "ad": owner.ad},
        "terapistler": [_profil_ciktisi(profile) for profile in targets],
        "sure_bitimi": referral.sure_bitimi,
    }


@router.get("/yonlendirmeler/{token}/tikla/{uzman_id}")
def yonlendirmeden_profile_git(
    token: YonlendirmeTokeni,
    uzman_id: str,
    request: Request,
    db: Db,
):
    hiz_siniri.kontrol("yonlendirme-tikla:" + istemci(request), 120, 60 * 60)
    referral = _yonlendirme_bul(db, token)
    allowed = db.scalar(
        select(YonlendirmeHedefi).where(
            YonlendirmeHedefi.yonlendirme_id == referral.id,
            YonlendirmeHedefi.uzman_id == uzman_id,
        )
    )
    profile = db.scalar(_dogrulanmis_profiller().where(Uzman.id == uzman_id))
    if not allowed or not profile:
        raise HTTPException(404, "Terapist bu yönlendirmede bulunamadı.")
    _olay_ekle(
        db,
        referral.id,
        "profile_clicked_from_referral",
        profile.id,
    )
    db.commit()
    return RedirectResponse(
        f"{settings.uygulama_adresi.rstrip('/')}/uzman/{profile.id}",
        status_code=303,
    )
