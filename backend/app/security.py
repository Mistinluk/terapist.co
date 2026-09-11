"""Oturum, CSRF, alan şifreleme ve dağıtık hız sınırı."""

import hashlib
import hmac
import json
import secrets
import threading
import time
from collections import defaultdict, deque
from typing import Annotated

from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, Request
from pwdlib import PasswordHash
from redis import Redis, RedisError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Denetim, Kullanici, Oturum, Uzman

settings = get_settings()
parolalar = PasswordHash.recommended()
sahte_ozet = parolalar.hash(secrets.token_urlsafe(32))
fernet = Fernet(settings.sifreleme_anahtari.get_secret_value().encode())
Db = Annotated[Session, Depends(get_db)]
COOKIE = "terapist_oturum"


def ozet(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def csrf_uret(token: str) -> str:
    return hmac.new(
        settings.hiz_siniri_anahtari.get_secret_value().encode(),
        ("csrf:" + token).encode(),
        hashlib.sha256,
    ).hexdigest()


def sifrele(value: dict) -> str:
    return fernet.encrypt(json.dumps(value).encode()).decode()


def coz(value: str) -> dict:
    return json.loads(fernet.decrypt(value.encode()))


def denetle(db, islem, kullanici_id=None, kaynak_id=None):
    db.add(
        Denetim(
            zaman=int(time.time()),
            islem=islem,
            kullanici_id=kullanici_id,
            kaynak_id=kaynak_id,
        )
    )


class HizSiniri:
    def __init__(self):
        self.redis = (
            Redis.from_url(settings.redis_url, socket_timeout=2)
            if settings.redis_url
            else None
        )
        self.kayitlar = defaultdict(deque)
        self.kilit = threading.Lock()

    def kontrol(self, anahtar: str, limit: int, sure: int = 900):
        """Ham kimlikler kaydedilmez; hata durumunda erişim kapanır."""
        digest = hmac.new(
            settings.hiz_siniri_anahtari.get_secret_value().encode(),
            anahtar.encode(),
            hashlib.sha256,
        ).hexdigest()
        now = time.time()
        if self.redis:
            try:
                count = self.redis.eval(
                    "local n=redis.call('INCR',KEYS[1]); "
                    "if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; "
                    "return n",
                    1,
                    "hiz:" + digest,
                    sure,
                )
            except RedisError:
                raise HTTPException(
                    503, "Lütfen daha sonra tekrar deneyin."
                ) from None
        else:
            with self.kilit:
                for key in list(self.kayitlar):
                    if not self.kayitlar[key] or (
                        self.kayitlar[key][-1] < now - 3600
                    ):
                        del self.kayitlar[key]
                queue = self.kayitlar[digest]
                while queue and queue[0] < now - sure:
                    queue.popleft()
                queue.append(now)
                count = len(queue)
        if count > limit:
            raise HTTPException(
                429,
                "Çok fazla deneme. Lütfen daha sonra tekrar deneyin.",
                headers={"Retry-After": str(sure)},
            )


hiz_siniri = HizSiniri()


def istemci(request: Request) -> str:
    return request.client.host if request.client else "bilinmiyor"


def oturum_bul(request: Request, db: Db) -> Kullanici:
    token = request.cookies.get(COOKIE, "")
    session = db.get(Oturum, ozet(token)) if token else None
    now = int(time.time())
    if not session or (
        now - session.son_erisim >= settings.oturum_bos_suresi
        or now - session.olusturma >= settings.oturum_azami_suresi
    ):
        raise HTTPException(401, "Oturumunuz sona erdi. Yeniden giriş yapın.")
    user = db.get(Kullanici, session.kullanici_id)
    if not user or not user.aktif:
        raise HTTPException(401, "Oturumunuz geçerli değil.")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        csrf = request.headers.get("X-CSRF-Token", "")
        if not hmac.compare_digest(ozet(csrf), session.csrf_ozeti):
            raise HTTPException(403, "İstek doğrulanamadı. Sayfayı yenileyin.")
    session.son_erisim = now
    request.state.oturum = session
    return user


AktifKullanici = Annotated[Kullanici, Depends(oturum_bul)]


def uzman_bul(user: AktifKullanici, db: Db) -> Uzman:
    from sqlalchemy import select

    profile = db.scalar(select(Uzman).where(Uzman.kullanici_id == user.id))
    if user.rol != "uzman" or not profile or profile.arsivli:
        raise HTTPException(403, "Bu işlem için uzman hesabı gereklidir.")
    return profile


AktifUzman = Annotated[Uzman, Depends(uzman_bul)]


def yonetici_bul(user: AktifKullanici) -> Kullanici:
    if user.rol != "yonetici":
        raise HTTPException(403, "Bu işlem için yetkiniz bulunmuyor.")
    return user


Yonetici = Annotated[Kullanici, Depends(yonetici_bul)]
