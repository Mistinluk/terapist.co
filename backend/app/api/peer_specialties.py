"""Meslektaşların profil alanlarıyla kurduğu betimleyici ilişkiler."""

import time

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models import (
    MeslektasUzmanlikIliskisi,
    TerapistDogrulama,
    Uzman,
)
from app.schemas import MeslektasUzmanlikGirdi
from app.security import Db, DogrulanmisUzman, denetle, hiz_siniri, istemci
from app.services import profil_bul, uzmanlar_engelli

router = APIRouter(tags=["Meslektaş uzmanlık ilişkileri"])


def _hedef_dogrulanmis(db: Db, uzman_id: str) -> Uzman:
    target = profil_bul(db, uzman_id)
    verified = db.scalar(
        select(TerapistDogrulama.id).where(
            TerapistDogrulama.uzman_id == target.id,
            TerapistDogrulama.durum == "verified",
        )
    )
    if not verified:
        raise HTTPException(404, "Terapist profili bulunamadı.")
    return target


def _ozet(db: Db, target: Uzman) -> dict:
    published_fields = list(dict.fromkeys(target.uzmanliklar + target.ekoller))
    rows = db.execute(
        select(
            MeslektasUzmanlikIliskisi.uzmanlik,
            func.count(MeslektasUzmanlikIliskisi.id),
        )
        .join(
            Uzman,
            Uzman.id == MeslektasUzmanlikIliskisi.iliskilendiren_uzman_id,
        )
        .join(
            TerapistDogrulama,
            TerapistDogrulama.uzman_id == Uzman.id,
        )
        .where(
            MeslektasUzmanlikIliskisi.hedef_uzman_id == target.id,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
            MeslektasUzmanlikIliskisi.uzmanlik.in_(published_fields),
        )
        .group_by(MeslektasUzmanlikIliskisi.uzmanlik)
        .order_by(
            func.count(MeslektasUzmanlikIliskisi.id).desc(),
            MeslektasUzmanlikIliskisi.uzmanlik,
        )
    )
    alanlar = [
        {"uzmanlik": specialty, "meslektas_sayisi": count}
        for specialty, count in rows
    ]
    return {"toplam_alan": len(alanlar), "alanlar": alanlar}


@router.get("/uzmanlar/{uzman_id}/meslektas-uzmanliklari")
def public_meslektas_uzmanliklari(uzman_id: str, request: Request, db: Db):
    hiz_siniri.kontrol("peer-specialty-public:" + istemci(request), 120, 60)
    target = _hedef_dogrulanmis(db, uzman_id)
    if not target.uzmanlik_iliskilerini_goster:
        return {"toplam_alan": 0, "alanlar": []}
    return _ozet(db, target)


@router.post("/uzmanlar/{uzman_id}/meslektas-uzmanliklari")
def uzmanlik_iliskilendir(
    uzman_id: str,
    body: MeslektasUzmanlikGirdi,
    request: Request,
    me: DogrulanmisUzman,
    db: Db,
):
    hiz_siniri.kontrol("peer-specialty-create:" + me.id, 40, 24 * 60 * 60)
    hiz_siniri.kontrol(
        "peer-specialty-create-ip:" + istemci(request), 80, 60 * 60
    )
    target = _hedef_dogrulanmis(db, uzman_id)
    if target.id == me.id:
        raise HTTPException(403, "Kendi profilinizi ilişkilendiremezsiniz.")
    if uzmanlar_engelli(db, me.id, target.id):
        raise HTTPException(403, "Bu terapistle etkileşim kuramazsınız.")
    published_fields = set(target.uzmanliklar + target.ekoller)
    if body.uzmanlik not in published_fields:
        raise HTTPException(
            422,
            "Yalnız terapistin profilindeki çalışma alanı veya yaklaşım "
            "seçilebilir.",
        )
    existing = db.scalar(
        select(MeslektasUzmanlikIliskisi).where(
            MeslektasUzmanlikIliskisi.iliskilendiren_uzman_id == me.id,
            MeslektasUzmanlikIliskisi.hedef_uzman_id == target.id,
            MeslektasUzmanlikIliskisi.uzmanlik == body.uzmanlik,
        )
    )
    now = int(time.time())
    if existing:
        existing.profesyonel_baglam = body.profesyonel_baglam
        existing.guncelleme = now
        association = existing
    else:
        association = MeslektasUzmanlikIliskisi(
            iliskilendiren_uzman_id=me.id,
            hedef_uzman_id=target.id,
            uzmanlik=body.uzmanlik,
            profesyonel_baglam=body.profesyonel_baglam,
            olusturma=now,
            guncelleme=now,
        )
        db.add(association)
    denetle(db, "meslektas_uzmanlik.iliskilendir", me.kullanici_id, target.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu alan daha önce ilişkilendirildi."
        ) from None
    return {
        "uzmanlik": association.uzmanlik,
        "profesyonel_baglam": association.profesyonel_baglam,
        **_ozet(db, target),
    }
