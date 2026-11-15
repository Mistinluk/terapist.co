"""Kamuya açık dizin ve uzmanın kendi profilini düzenlemesi."""

from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.eslestirme import (
    listede_var,
    meslektas_alan_sinyalleri,
    turkce_ad_sirasi,
)
from app.media import eski_fotografi_sil
from app.models import TerapistDogrulama, Uzman
from app.schemas import ProfilCikti, ProfilGirdi
from app.security import AktifUzman, Db, denetle
from app.services import musait_saatler, profil_bul

router = APIRouter(tags=["Uzmanlar"])


def public_profile(profile: Uzman) -> ProfilCikti:
    result = ProfilCikti.model_validate(profile)
    if not profile.kurucu_durumunu_goster:
        result = result.model_copy(update={"kurucu_no": None})
    return result


@router.get("/uzmanlar")
def uzmanlar(
    db: Db,
    arama: Annotated[str, Query(max_length=150)] = "",
    sehir: Annotated[str, Query(max_length=80)] = "",
    ekol: Annotated[str, Query(max_length=100)] = "",
    kitle: Annotated[str, Query(max_length=100)] = "",
    format: Annotated[str, Query(max_length=100)] = "",
    dil: Annotated[str, Query(max_length=100)] = "",
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
        (Uzman.diller, dil),
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
        "sonuclar": [public_profile(p) for p in profiles],
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
    for field in ["ekoller", "kitle", "diller", "uzmanliklar"]:
        result[field] = sorted(
            {item for p in profiles for item in getattr(p, field)}
        )
    signals = meslektas_alan_sinyalleri(db, profiles)
    result["meslektas_alanlari"] = sorted(
        {
            signal["uzmanlik"]
            for profile_signals in signals.values()
            for signal in profile_signals
        }
    )
    return result


@router.get("/uzmanlar/{uzman_id}", response_model=ProfilCikti)
def profil(uzman_id: str, db: Db):
    return public_profile(profil_bul(db, uzman_id))


@router.get("/uzmanlar/kullanici-adi/{username}", response_model=ProfilCikti)
def kullanici_adiyla_profil(username: str, db: Db):
    profile = db.scalar(
        select(Uzman)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            Uzman.kullanici_adi == username,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )
    if not profile:
        raise HTTPException(404, "Uzman bulunamadı.")
    return public_profile(profile)


@router.get("/uzmanlar/{uzman_id}/saatler")
def saatler(uzman_id: str, db: Db):
    result = musait_saatler(db, profil_bul(db, uzman_id))
    # Google Takvim eşitlemesi yapıldıysa son aralıklar saklanır.
    db.commit()
    return {"saatler": result}


@router.get("/uzman/profil", response_model=ProfilCikti)
def kendi_profili(me: AktifUzman):
    return me


@router.put("/uzman/profil", response_model=ProfilCikti)
def profil_guncelle(body: ProfilGirdi, me: AktifUzman, db: Db):
    # Randevu ekleme ve takvim değişikliği aynı uzman satırını kilitler.
    db.refresh(me, with_for_update=True)
    if any(
        [
            me.ad != body.ad,
            me.unvan != body.unvan,
            me.egitim != body.egitim,
            me.egitim_universite != body.egitim_universite,
            me.egitim_program != body.egitim_program,
            me.egitim_derece != body.egitim_derece,
        ]
    ):
        me.onayli = False
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == me.id
            )
        )
        if verification:
            verification.durum = "pending"
            verification.incelenme = None
            verification.inceleyen_kullanici_id = None
    old_photo = me.profil_fotografi_url
    for key, value in body.model_dump(mode="json").items():
        setattr(me, key, value)
    denetle(db, "profil.guncelle", me.kullanici_id, me.id)
    db.commit()
    if old_photo and old_photo != me.profil_fotografi_url:
        eski_fotografi_sil(old_photo)
    return me
