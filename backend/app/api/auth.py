"""Uzman başvurusu ve iptal edilebilir çerez oturumları."""

import re
import secrets
import time

import pyotp
from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.accounts import mfa_yaniti, uzman_hesabi_hazirla
from app.config import get_settings
from app.models import Kullanici, Oturum, Uzman
from app.schemas import RESERVED_USERNAMES, GirisGirdi, KayitGirdi
from app.security import (
    COOKIE,
    AktifKullanici,
    Db,
    coz,
    csrf_uret,
    denetle,
    hiz_siniri,
    istemci,
    ozet,
    parolalar,
    sahte_ozet,
)

router = APIRouter(prefix="/oturum", tags=["Oturum"])
settings = get_settings()


@router.get("/kullanici-adi/{username}")
def kullanici_adi_durumu(username: str, request: Request, db: Db):
    """Anlık müsaitliği bildirir; benzersizliği kayıt işlemi belirler."""
    hiz_siniri.kontrol("kullanici-adi:" + istemci(request), 60, 60)
    if not re.fullmatch(r"[a-z][a-z0-9]{1,38}[a-z0-9]", username):
        raise HTTPException(
            422,
            "Kullanıcı adı 3–40 küçük harf veya rakam olmalıdır (tire yok).",
        )
    if username in RESERVED_USERNAMES:
        raise HTTPException(422, "Bu profil adresi kullanılamaz.")
    used = db.scalar(select(Uzman.id).where(Uzman.kullanici_adi == username))
    if not used:
        return {"musait": True, "oneriler": []}
    base = username[:37]
    suggestions = []
    for suffix in range(2, 12):
        candidate = f"{base}{suffix}"
        if not db.scalar(
            select(Uzman.id).where(Uzman.kullanici_adi == candidate)
        ):
            suggestions.append(candidate)
        if len(suggestions) == 3:
            break
    return {"musait": False, "oneriler": suggestions}


@router.post("/basvuru", status_code=201)
def basvur(body: KayitGirdi, request: Request, db: Db):
    hiz_siniri.kontrol("basvuru:" + istemci(request), 5, 3600)
    try:
        user, _, secret = uzman_hesabi_hazirla(
            db,
            str(body.email),
            body.parola.get_secret_value(),
            body.profil,
            body.kullanici_adi,
        )
        denetle(db, "uzman.basvuru", user.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu bilgilerle başvuru oluşturulamıyor."
        ) from None
    return mfa_yaniti(
        user,
        secret,
        ("Başvurunuz alındı. Profiliniz yönetici onayından sonra yayınlanır."),
    )


@router.post("/giris")
def giris(body: GirisGirdi, request: Request, response: Response, db: Db):
    email = str(body.email).lower()
    hiz_siniri.kontrol("giris-ip:" + istemci(request), 20)
    hiz_siniri.kontrol("giris-hesap:" + email, 10)
    user = db.scalar(select(Kullanici).where(Kullanici.email == email))
    valid = parolalar.verify(
        body.parola.get_secret_value(),
        user.parola_ozeti if user else sahte_ozet,
    )
    if not user or not user.aktif or not valid:
        denetle(db, "oturum.basarisiz")
        db.commit()
        raise HTTPException(401, "Giriş bilgileri veya doğrulama kodu hatalı.")
    if user.mfa_sirri:
        totp = pyotp.TOTP(coz(user.mfa_sirri)["anahtar"])
        step = int(time.time()) // 30
        accepted = next(
            (
                n
                for n in (step, step - 1, step + 1)
                if secrets.compare_digest(totp.at(n * 30), body.dogrulama_kodu)
            ),
            None,
        )
        if accepted is None:
            denetle(db, "oturum.mfa_basarisiz", user.id)
            db.commit()
            raise HTTPException(
                401, "Giriş bilgileri veya doğrulama kodu hatalı."
            )
        changed = db.execute(
            update(Kullanici)
            .where(
                Kullanici.id == user.id,
                Kullanici.son_mfa_adimi < accepted,
            )
            .values(son_mfa_adimi=accepted)
        ).rowcount
        if not changed:
            denetle(db, "oturum.mfa_tekrar", user.id)
            db.commit()
            raise HTTPException(401, "Yeni doğrulama kodunu bekleyin.")
    elif settings.ortam == "uretim":
        raise HTTPException(403, "İki adımlı doğrulama kurulmalıdır.")
    old = request.cookies.get(COOKIE)
    if old:
        previous = db.get(Oturum, ozet(old))
        if previous:
            db.delete(previous)
    token = secrets.token_urlsafe(48)
    csrf = csrf_uret(token)
    now = int(time.time())
    db.add(
        Oturum(
            ozet=ozet(token),
            csrf_ozeti=ozet(csrf),
            kullanici_id=user.id,
            olusturma=now,
            son_erisim=now,
        )
    )
    denetle(db, "oturum.giris", user.id)
    db.commit()
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        secure=settings.ortam == "uretim",
        samesite="strict",
        max_age=settings.oturum_azami_suresi,
        path="/api",
    )
    return {"id": user.id, "rol": user.rol, "csrf": csrf}


@router.get("/ben")
def ben(request: Request, user: AktifKullanici, db: Db):
    csrf = csrf_uret(request.cookies[COOKIE])
    db.commit()
    return {"id": user.id, "rol": user.rol, "csrf": csrf}


@router.post("/cikis", status_code=204)
def cikis(request: Request, response: Response, user: AktifKullanici, db: Db):
    db.delete(request.state.oturum)
    denetle(db, "oturum.cikis", user.id)
    db.commit()
    response.delete_cookie(COOKIE, path="/api")
