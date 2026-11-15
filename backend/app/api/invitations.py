"""Doğrulanmış terapist davetleri ve davet üzerinden hesap oluşturma."""

import secrets
import time
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Request
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.accounts import mfa_yaniti, uzman_hesabi_hazirla
from app.config import get_settings
from app.models import (
    Davet,
    Kullanici,
    KurucuUye,
    ProfesyonelBaglanti,
    Tavsiye,
    TerapistDogrulama,
    Uzman,
    baglanti_cifti,
)
from app.schemas import DavetGirdi, DavetKabulGirdi
from app.security import (
    AktifUzman,
    Db,
    DogrulanmisUzman,
    denetle,
    hiz_siniri,
    istemci,
    ozet,
)

router = APIRouter(tags=["Davetler"])
settings = get_settings()
DAVET_SURESI = 14 * 24 * 60 * 60
DavetTokeni = Annotated[str, Path(min_length=40, max_length=100)]


def _suresi_dolanlari_isaretle(db: Db, now: int) -> None:
    db.execute(
        update(Davet)
        .where(Davet.durum == "pending", Davet.sure_bitimi <= now)
        .values(durum="expired")
    )


def _davet_bul(db: Db, token: str) -> Davet:
    invitation = db.scalar(
        select(Davet).where(Davet.token_ozeti == ozet(token))
    )
    if not invitation:
        raise HTTPException(404, "Davet bulunamadı.")
    if invitation.durum == "pending" and invitation.sure_bitimi <= int(
        time.time()
    ):
        invitation.durum = "expired"
        db.commit()
    if invitation.durum == "expired":
        raise HTTPException(410, "Bu davetin süresi dolmuş.")
    if invitation.durum != "pending":
        raise HTTPException(409, "Bu davet artık kullanılamıyor.")
    return invitation


def _davet_ciktisi(invitation: Davet) -> dict:
    return {
        "id": invitation.id,
        "email": invitation.email,
        "ad": invitation.ad,
        "durum": invitation.durum,
        "olusturma": invitation.olusturma,
        "sure_bitimi": invitation.sure_bitimi,
        "kabul": invitation.kabul,
        "iliski_turu": invitation.iliski_turu,
        "onerilen_uzmanlik": invitation.onerilen_uzmanlik,
    }


@router.get("/davetlerim")
def davet_ozeti(me: AktifUzman, db: Db):
    now = int(time.time())
    _suresi_dolanlari_isaretle(db, now)
    verification = db.scalar(
        select(TerapistDogrulama).where(TerapistDogrulama.uzman_id == me.id)
    )
    used = db.scalar(
        select(func.count())
        .select_from(Davet)
        .where(
            Davet.davet_eden_uzman_id == me.id,
            Davet.durum.in_(["pending", "accepted"]),
        )
    )
    founding = db.scalar(select(KurucuUye).where(KurucuUye.uzman_id == me.id))
    invitations = list(
        db.scalars(
            select(Davet)
            .where(Davet.davet_eden_uzman_id == me.id)
            .order_by(Davet.olusturma.desc())
            .limit(50)
        )
    )
    db.commit()
    return {
        "dogrulama_durumu": verification.durum if verification else "pending",
        "davet_limiti": me.davet_limiti,
        "kullanilan": used,
        "kalan": max(me.davet_limiti - used, 0),
        "kurucu_no": founding.kurucu_no if founding else None,
        "davetler": [_davet_ciktisi(item) for item in invitations],
    }


@router.post("/davetler", status_code=201)
def davet_olustur(body: DavetGirdi, me: DogrulanmisUzman, db: Db):
    hiz_siniri.kontrol("davet:" + me.kullanici_id, 10, 24 * 60 * 60)
    now = int(time.time())
    email = str(body.email).lower()
    db.refresh(me, with_for_update=True)
    _suresi_dolanlari_isaretle(db, now)
    owner = db.get(Kullanici, me.kullanici_id)
    if body.uzmanlik and body.uzmanlik in me.uzmanliklar:
        raise HTTPException(
            422,
            "Kendi çalıştığınız bir alan için öneri daveti oluşturamazsınız.",
        )
    if email == owner.email or db.scalar(
        select(Kullanici.id).where(Kullanici.email == email)
    ):
        raise HTTPException(409, "Bu e-posta adresi davet edilemiyor.")
    duplicate = db.scalar(
        select(Davet.id).where(
            Davet.email == email,
            Davet.durum.in_(["pending", "accepted"]),
        )
    )
    if duplicate:
        raise HTTPException(409, "Bu e-posta adresi zaten davet edilmiş.")
    used = db.scalar(
        select(func.count())
        .select_from(Davet)
        .where(
            Davet.davet_eden_uzman_id == me.id,
            Davet.durum.in_(["pending", "accepted"]),
        )
    )
    if used >= me.davet_limiti:
        raise HTTPException(409, "Davet hakkınız kalmadı.")
    token = secrets.token_urlsafe(32)
    invitation = Davet(
        davet_eden_uzman_id=me.id,
        email=email,
        ad=body.ad,
        token_ozeti=ozet(token),
        olusturma=now,
        sure_bitimi=now + DAVET_SURESI,
        kabul=None,
        durum="pending",
        kabul_eden_uzman_id=None,
        onerilen_uzmanlik=body.uzmanlik,
    )
    db.add(invitation)
    denetle(db, "davet.olustur", me.kullanici_id, invitation.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu e-posta adresi zaten davet edilmiş."
        ) from None
    result = _davet_ciktisi(invitation)
    result["kabul_url"] = (
        f"{settings.uygulama_adresi.rstrip('/')}/davet/{token}"
    )
    return result


@router.get("/davetler/{token}")
def daveti_gor(token: DavetTokeni, request: Request, db: Db):
    hiz_siniri.kontrol("davet-gor:" + istemci(request), 60, 60 * 60)
    invitation = _davet_bul(db, token)
    inviter = db.get(Uzman, invitation.davet_eden_uzman_id)
    return {
        "email": invitation.email,
        "ad": invitation.ad,
        "davet_eden": inviter.ad,
        "sure_bitimi": invitation.sure_bitimi,
    }


@router.post("/davetler/{token}/kabul", status_code=201)
def daveti_kabul_et(
    token: DavetTokeni, body: DavetKabulGirdi, request: Request, db: Db
):
    hiz_siniri.kontrol("davet-kabul:" + istemci(request), 10, 60 * 60)
    invitation = _davet_bul(db, token)
    db.refresh(invitation, with_for_update=True)
    try:
        user, expert, secret = uzman_hesabi_hazirla(
            db,
            invitation.email,
            body.parola.get_secret_value(),
            body.profil,
        )
        now = int(time.time())
        invitation.durum = "accepted"
        invitation.kabul = now
        invitation.kabul_eden_uzman_id = expert.id
        db.add(
            ProfesyonelBaglanti(
                isteyen_uzman_id=invitation.davet_eden_uzman_id,
                alici_uzman_id=expert.id,
                cift_anahtari=baglanti_cifti(
                    invitation.davet_eden_uzman_id, expert.id
                ),
                iliski_turu="invited_to_platform",
                durum="accepted",
                istek_zamani=invitation.olusturma,
                yanit_zamani=now,
            )
        )
        if (
            invitation.onerilen_uzmanlik
            and invitation.onerilen_uzmanlik in expert.uzmanliklar
            and not db.get(
                Tavsiye,
                (invitation.davet_eden_uzman_id, expert.id),
            )
        ):
            db.add(
                Tavsiye(
                    veren_id=invitation.davet_eden_uzman_id,
                    alan_id=expert.id,
                    uzmanlik=invitation.onerilen_uzmanlik,
                    olusturma=now,
                )
            )
            denetle(
                db,
                "tavsiye.davet_kabul",
                user.id,
                expert.id,
            )
        denetle(db, "davet.kabul", user.id, invitation.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Bu davetle hesap oluşturulamıyor.") from None
    return mfa_yaniti(
        user,
        secret,
        (
            "Davet kabul edildi. Profiliniz doğrulama incelemesinden sonra "
            "yayınlanır."
        ),
    )
