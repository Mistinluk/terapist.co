"""Yönetim yetkisi danışan verilerini okuma yetkisi vermez."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import delete, func, select

from app.models import Denetim, Kullanici, Oturum, Randevu, Uzman
from app.schemas import OnayGirdi, ProfilCikti, ProfilGirdi
from app.security import Db, Yonetici, denetle

router = APIRouter(prefix="/yonetim", tags=["Yönetim"])


@router.get("/uzmanlar", response_model=list[ProfilCikti])
def uzmanlar(user: Yonetici, db: Db, sayfa: Annotated[int, Query(ge=1)] = 1):
    return list(
        db.scalars(
            select(Uzman)
            .where(Uzman.arsivli.is_(False))
            .order_by(Uzman.onayli, Uzman.ad)
            .offset((sayfa - 1) * 50)
            .limit(50)
        )
    )


@router.patch("/uzmanlar/{uzman_id}", status_code=204)
def onayla(uzman_id: str, body: OnayGirdi, user: Yonetici, db: Db):
    profile = db.get(Uzman, uzman_id)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")
    profile.onayli = body.onayli
    denetle(db, "uzman.onay_degistir", user.id, uzman_id)
    db.commit()


@router.put("/uzmanlar/{uzman_id}", response_model=ProfilCikti)
def duzenle(uzman_id: str, body: ProfilGirdi, user: Yonetici, db: Db):
    profile = db.get(Uzman, uzman_id, with_for_update=True)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")
    for key, value in body.model_dump(mode="json").items():
        setattr(profile, key, value)
    denetle(db, "uzman.duzenle", user.id, uzman_id)
    db.commit()
    return profile


@router.delete("/uzmanlar/{uzman_id}", status_code=204)
def arsivle(uzman_id: str, user: Yonetici, db: Db):
    profile = db.get(Uzman, uzman_id, with_for_update=True)
    if not profile:
        raise HTTPException(404, "Uzman bulunamadı.")
    active = db.scalar(
        select(func.count())
        .select_from(Randevu)
        .where(
            Randevu.uzman_id == uzman_id,
            Randevu.durum.in_(["bekliyor", "onaylandi"]),
        )
    )
    if active:
        raise HTTPException(
            409, "Önce uzmanın açık randevuları kapatılmalıdır."
        )
    profile.arsivli, profile.onayli = True, False
    db.get(Kullanici, profile.kullanici_id).aktif = False
    db.execute(
        delete(Oturum).where(Oturum.kullanici_id == profile.kullanici_id)
    )
    denetle(db, "uzman.arsivle", user.id, uzman_id)
    db.commit()


@router.get("/ozet")
def ozet(user: Yonetici, db: Db):
    return {
        "uzman": db.scalar(
            select(func.count())
            .select_from(Uzman)
            .where(Uzman.arsivli.is_(False))
        ),
        "bekleyen": db.scalar(
            select(func.count())
            .select_from(Uzman)
            .where(Uzman.onayli.is_(False), Uzman.arsivli.is_(False))
        ),
        "randevu": db.scalar(select(func.count()).select_from(Randevu)),
    }


@router.get("/denetim")
def denetim(user: Yonetici, db: Db, sayfa: Annotated[int, Query(ge=1)] = 1):
    rows = list(
        db.scalars(
            select(Denetim)
            .order_by(Denetim.zaman.desc())
            .offset((sayfa - 1) * 50)
            .limit(50)
        )
    )
    denetle(db, "denetim.listele", user.id)
    db.commit()
    return [
        {
            "id": r.id,
            "zaman": r.zaman,
            "islem": r.islem,
            "kullanici_id": r.kullanici_id,
            "kaynak_id": r.kaynak_id,
        }
        for r in rows
    ]
