"""Kamuya açık dizin ve uzmanın kendi profilini düzenlemesi."""

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.eslestirme import listede_var, turkce_ad_sirasi
from app.models import Tavsiye, Uzman
from app.schemas import ProfilCikti, ProfilGirdi, TavsiyeGirdi
from app.security import AktifUzman, Db, denetle
from app.services import musait_saatler, profil_bul

router = APIRouter(tags=["Uzmanlar"])


@router.get("/uzmanlar")
def uzmanlar(
    db: Db,
    arama: Annotated[str, Query(max_length=150)] = "",
    sehir: Annotated[str, Query(max_length=80)] = "",
    ekol: Annotated[str, Query(max_length=100)] = "",
    kitle: Annotated[str, Query(max_length=100)] = "",
    format: Annotated[str, Query(max_length=100)] = "",
    uzmanlik: Annotated[str, Query(max_length=100)] = "",
    deneyim: Annotated[int, Query(ge=0, le=70)] = 0,
    sayfa: Annotated[int, Query(ge=1)] = 1,
    sirala: Literal["ad", "ucret_artan", "ucret_azalan"] = "ad",
):
    """Eski GET sözleşmesi: tüm tercihler kesin filtre olarak korunur.

    Yeni dizin POST /eslestirme kullanır. Eski istemcilerde bu uç noktanın
    sonuç kümesini veya varsayılan alfabetik sıralamasını değiştirmiyoruz.
    """
    query = select(Uzman).where(
        Uzman.onayli.is_(True), Uzman.arsivli.is_(False)
    )
    if sehir:
        query = query.where(Uzman.sehir == sehir)
    query = query.where(Uzman.deneyim_yili >= deneyim)
    normalized = turkce_ad_sirasi()
    if arama:
        term = arama.translate(str.maketrans("Iİ", "ıi")).lower()
        query = query.where(normalized.contains(term, autoescape=True))
    for field, value in [
        (Uzman.ekoller, ekol),
        (Uzman.kitle, kitle),
        (Uzman.formatlar, format),
        (Uzman.uzmanliklar, uzmanlik),
    ]:
        if not value:
            continue
        query = query.where(listede_var(db, field, value))
    count = db.scalar(select(func.count()).select_from(query.subquery()))
    order = {
        "ad": normalized,
        "ucret_artan": Uzman.ucret.asc(),
        "ucret_azalan": Uzman.ucret.desc(),
    }[sirala]
    profiles = list(
        db.scalars(
            query.order_by(order, Uzman.id).offset((sayfa - 1) * 12).limit(12)
        )
    )
    return {
        "toplam": count,
        "sayfa": sayfa,
        "sonuclar": [ProfilCikti.model_validate(p) for p in profiles],
    }


@router.get("/secenekler")
def secenekler(db: Db):
    profiles = list(
        db.scalars(
            select(Uzman).where(
                Uzman.onayli.is_(True), Uzman.arsivli.is_(False)
            )
        )
    )
    result = {"sehirler": sorted({p.sehir for p in profiles})}
    for field in ["ekoller", "kitle", "uzmanliklar"]:
        result[field] = sorted(
            {item for p in profiles for item in getattr(p, field)}
        )
    return result


@router.get("/uzmanlar/{uzman_id}", response_model=ProfilCikti)
def profil(uzman_id: str, db: Db):
    return profil_bul(db, uzman_id)


@router.get("/uzmanlar/{uzman_id}/saatler")
def saatler(uzman_id: str, db: Db):
    return {"saatler": musait_saatler(db, profil_bul(db, uzman_id))}


@router.get("/uzmanlar/{uzman_id}/tavsiyeler")
def tavsiyeler(uzman_id: str, db: Db):
    profil_bul(db, uzman_id)
    return {
        "toplam": db.scalar(
            select(func.count())
            .select_from(Tavsiye)
            .join(Uzman, Uzman.id == Tavsiye.veren_id)
            .where(
                Tavsiye.alan_id == uzman_id,
                Uzman.onayli.is_(True),
                Uzman.arsivli.is_(False),
            )
        )
    }


@router.put("/uzmanlar/{uzman_id}/tavsiye", status_code=204)
def tavsiye(uzman_id: str, body: TavsiyeGirdi, me: AktifUzman, db: Db):
    profil_bul(db, uzman_id)
    if not me.onayli or me.id == uzman_id:
        raise HTTPException(403, "Bu profili tavsiye edemezsiniz.")
    current = db.get(Tavsiye, (me.id, uzman_id))
    if body.tavsiye and not current:
        db.add(Tavsiye(veren_id=me.id, alan_id=uzman_id))
    elif not body.tavsiye and current:
        db.delete(current)
    denetle(db, "profil.tavsiye", me.kullanici_id, uzman_id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Tavsiye değişti. Sayfayı yenileyin."
        ) from None


@router.get("/uzman/profil", response_model=ProfilCikti)
def kendi_profili(me: AktifUzman):
    return me


@router.put("/uzman/profil", response_model=ProfilCikti)
def profil_guncelle(body: ProfilGirdi, me: AktifUzman, db: Db):
    # Randevu ekleme ve takvim değişikliği aynı uzman satırını kilitler.
    db.refresh(me, with_for_update=True)
    if me.ad != body.ad or me.egitim != body.egitim:
        me.onayli = False
    for key, value in body.model_dump(mode="json").items():
        setattr(me, key, value)
    denetle(db, "profil.guncelle", me.kullanici_id, me.id)
    db.commit()
    return me
