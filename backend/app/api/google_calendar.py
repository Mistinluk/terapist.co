"""Uzman panelinden Google Takvim bağlama, ayarlama ve kaldırma uçları.

Akış: panel POST /uzman/google-takvim/baglanti ile Google yetki adresini
alır; sunucu PKCE doğrulayıcısını ve tek kullanımlık durum değerini şifreli,
10 dakikalık, yalnız geri dönüş yoluna gönderilen bir çerezde saklar.
Google kullanıcıyı GET /google-takvim/geri-donus adresine döndürür. Oturum
çerezi SameSite=Strict olduğundan geri dönüşte kimlik bu şifreli çerezden
okunur; state parametresi çerezdeki değerle eşleşmezse işlem reddedilir.
"""

import hmac
import json
import secrets
import time
from typing import Annotated
from urllib.parse import urlencode

from cryptography.fernet import InvalidToken
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, func, select

from app.config import get_settings
from app.google_takvim import (
    HATA_MESAJLARI,
    KAPSAM_YAZMA,
    WEBHOOK_ESITLEME_ARALIGI,
    GoogleHatasi,
    aktif_kanallar,
    baglanti_bul,
    esitle,
    google_istemcisi,
    hesap,
    id_token_email,
    kapsamlar_tamam,
    pkce_cifti,
    webhook_kanallarini_kapat,
    webhook_kanallarini_yenile,
)
from app.models import (
    GoogleTakvimBaglantisi,
    GoogleTakvimKanali,
    Kullanici,
    Randevu,
    RandevuTakvimIsi,
    Uzman,
)
from app.randevu_takvim import kuyruga_ekle
from app.schemas import GoogleTakvimAyarGirdi, GoogleTakvimDurumu
from app.security import (
    AktifUzman,
    Db,
    coz,
    denetle,
    fernet,
    hiz_siniri,
    istemci,
    ozet,
    sifrele,
)

router = APIRouter(tags=["Google Takvim"])
DURUM_CEREZI = "terapist_google_takvim"
CEREZ_YOLU = "/api/google-takvim"
CEREZ_SURESI = 600


def durum(db, me: Uzman) -> GoogleTakvimDurumu:
    settings = get_settings()
    baglanti = baglanti_bul(db, me.id)
    if not baglanti:
        return GoogleTakvimDurumu(
            yapilandirildi=settings.google_takvim_etkin, bagli=False
        )
    account = hesap(baglanti)
    now = int(time.time())
    upcoming = [
        period for period in baglanti.dolu_araliklar or [] if period[1] > now
    ]
    channels = aktif_kanallar(db, baglanti.id, now)
    last_notification = max(
        (c.son_bildirim for c in channels if c.son_bildirim is not None),
        default=None,
    )
    return GoogleTakvimDurumu(
        yapilandirildi=settings.google_takvim_etkin,
        bagli=True,
        email=account.get("email") or None,
        durum=baglanti.durum,
        son_senkron=baglanti.son_senkron,
        hata=HATA_MESAJLARI.get(baglanti.son_hata or ""),
        takvimler=account.get("takvimler", []),
        musaitlik_takvimi=account.get("musaitlik_takvimi"),
        dolu_takvimleri=account.get("dolu_takvimleri", []),
        dolu_aralik_sayisi=len(upcoming),
        musait_aralik_sayisi=(
            None
            if baglanti.musait_araliklar is None
            else len([p for p in baglanti.musait_araliklar if p[1] > now])
        ),
        webhook_etkin=bool(channels),
        webhook_kanal_sayisi=len(channels),
        webhook_son_bildirim=last_notification,
        randevu_yazma_izni=account.get("randevu_yazma_izni", False),
        bekleyen_aktarim=db.scalar(
            select(func.count())
            .select_from(RandevuTakvimIsi)
            .where(
                RandevuTakvimIsi.baglanti_id == baglanti.id,
                RandevuTakvimIsi.durum != "esitlendi",
            )
        )
        or 0,
        hatali_aktarim=db.scalar(
            select(func.count())
            .select_from(RandevuTakvimIsi)
            .where(
                RandevuTakvimIsi.baglanti_id == baglanti.id,
                RandevuTakvimIsi.durum == "hata",
            )
        )
        or 0,
    )


def yapilandirma_gerekli() -> None:
    if not get_settings().google_takvim_etkin:
        raise HTTPException(
            503, "Google Takvim bağlantısı bu ortamda henüz etkin değil."
        )


@router.get("/uzman/google-takvim", response_model=GoogleTakvimDurumu)
def baglanti_durumu(me: AktifUzman, db: Db):
    return durum(db, me)


@router.post("/uzman/google-takvim/baglanti")
def baglanti_baslat(request: Request, response: Response, me: AktifUzman):
    """Google yetki adresini döndürür; tarayıcı bu adrese yönlenir."""
    yapilandirma_gerekli()
    hiz_siniri.kontrol("google-takvim:" + me.id, 10, 900)
    verifier, challenge = pkce_cifti()
    nonce = secrets.token_urlsafe(32)
    response.set_cookie(
        DURUM_CEREZI,
        fernet.encrypt(
            json.dumps(
                {
                    "uzman_id": me.id,
                    "kullanici_id": me.kullanici_id,
                    "nonce": nonce,
                    "verifier": verifier,
                }
            ).encode()
        ).decode(),
        httponly=True,
        secure=get_settings().guvenli_yayin,
        # Google'dan dönen üst düzey GET gezintisinde gönderilmesi için Lax.
        samesite="lax",
        max_age=CEREZ_SURESI,
        path=CEREZ_YOLU,
    )
    return {"yonlendirme_url": google_istemcisi.yetki_adresi(nonce, challenge)}


def panel_adresi(sonuc: str) -> str:
    query = urlencode({"sekme": "profil", "takvim": sonuc})
    return f"{get_settings().uygulama_adresi.rstrip('/')}/panel?{query}"


def yonlendir(sonuc: str) -> RedirectResponse:
    response = RedirectResponse(panel_adresi(sonuc), status_code=303)
    response.delete_cookie(DURUM_CEREZI, path=CEREZ_YOLU)
    return response


def durum_cerezi(request: Request) -> dict | None:
    raw = request.cookies.get(DURUM_CEREZI, "")
    if not raw:
        return None
    try:
        value = json.loads(fernet.decrypt(raw.encode(), ttl=CEREZ_SURESI))
    except (InvalidToken, ValueError):
        return None
    required = {"uzman_id", "kullanici_id", "nonce", "verifier"}
    if not isinstance(value, dict) or not required <= value.keys():
        return None
    return value


@router.get("/google-takvim/geri-donus", include_in_schema=False)
def geri_donus(
    request: Request,
    db: Db,
    state: Annotated[str, Query(max_length=200)] = "",
    code: Annotated[str, Query(max_length=2000)] = "",
    error: Annotated[str, Query(max_length=200)] = "",
):
    pending = durum_cerezi(request)
    if (
        not pending
        or not state
        or not hmac.compare_digest(state, pending["nonce"])
    ):
        return yonlendir("gecersiz")
    if error or not code:
        return yonlendir("iptal")
    if not get_settings().google_takvim_etkin:
        return yonlendir("hata")
    me = db.scalar(
        select(Uzman).where(
            Uzman.id == pending["uzman_id"],
            Uzman.kullanici_id == pending["kullanici_id"],
            Uzman.arsivli.is_(False),
        )
    )
    user = db.get(Kullanici, pending["kullanici_id"])
    if not me or not user or not user.aktif or user.rol != "uzman":
        return yonlendir("gecersiz")
    try:
        tokens = google_istemcisi.kod_degistir(code, pending["verifier"])
        refresh_token = tokens.get("refresh_token")
        access_token = tokens.get("access_token")
        if not refresh_token or not access_token:
            raise GoogleHatasi("gecersiz_yanit")
        if not kapsamlar_tamam(str(tokens.get("scope", ""))):
            google_istemcisi.iptal_et(refresh_token)
            return yonlendir("izin")
        email = id_token_email(str(tokens.get("id_token", "")))
        calendars = google_istemcisi.takvimler(access_token)
    except GoogleHatasi:
        return yonlendir("hata")
    now = int(time.time())
    known = {c["id"] for c in calendars}
    primary = next((c["id"] for c in calendars if c["birincil"]), None)
    baglanti = baglanti_bul(db, me.id)
    previous = hesap(baglanti) if baglanti else {}
    same_account = previous.get("email") == email
    account = {
        "email": email,
        "randevu_yazma_izni": KAPSAM_YAZMA
        in str(tokens.get("scope", "")).split(),
        "takvimler": calendars,
        "dolu_takvimleri": (
            [c for c in previous.get("dolu_takvimleri", []) if c in known]
            if same_account
            else ([primary] if primary else [])
        ),
        "musaitlik_takvimi": (
            previous.get("musaitlik_takvimi")
            if same_account and previous.get("musaitlik_takvimi") in known
            else None
        ),
    }
    token_data = {
        "refresh_token": refresh_token,
        "access_token": access_token,
        "bitis": now + int(tokens.get("expires_in", 3600)),
    }
    if not baglanti:
        baglanti = GoogleTakvimBaglantisi(
            uzman_id=me.id, olusturma=now, guncelleme=now
        )
        db.add(baglanti)
    elif not same_account:
        # Önceki hesaba ait işleri yeni Google hesabına taşıma.
        db.execute(
            delete(RandevuTakvimIsi).where(
                RandevuTakvimIsi.baglanti_id == baglanti.id
            )
        )
    baglanti.token_sifreli = sifrele(token_data)
    baglanti.hesap_sifreli = sifrele(account)
    baglanti.durum = "aktif"
    baglanti.dolu_araliklar = []
    baglanti.musait_araliklar = None
    baglanti.son_senkron = None
    baglanti.son_hata = None
    esitle(baglanti, now)
    db.flush()
    for booking in db.scalars(
        select(Randevu).where(
            Randevu.uzman_id == me.id,
            Randevu.baslangic > now,
            Randevu.durum.in_(["bekliyor", "onaylandi"]),
        )
    ):
        kuyruga_ekle(db, booking)
    webhook_kanallarini_yenile(db, baglanti, now)
    denetle(db, "google_takvim.bagla", me.kullanici_id, me.id)
    db.commit()
    return yonlendir("baglandi" if baglanti.son_hata is None else "eksik")


def aktif_baglanti(db, me: Uzman) -> GoogleTakvimBaglantisi:
    baglanti = baglanti_bul(db, me.id)
    if not baglanti:
        raise HTTPException(404, "Google Takvim bağlı değil.")
    if baglanti.durum != "aktif":
        raise HTTPException(
            409, "Google Takvim izni kaldırılmış. Bağlantıyı yeniden kurun."
        )
    return baglanti


@router.put("/uzman/google-takvim/ayarlar", response_model=GoogleTakvimDurumu)
def ayarlar(body: GoogleTakvimAyarGirdi, me: AktifUzman, db: Db):
    """Seçimi doğrular, hemen eşitler; Google hatasında seçimi saklamaz."""
    yapilandirma_gerekli()
    hiz_siniri.kontrol("google-takvim:" + me.id, 30, 900)
    baglanti = aktif_baglanti(db, me)
    account = hesap(baglanti)
    known = {c["id"] for c in account.get("takvimler", [])}
    selected = set(body.dolu_takvimleri) | (
        {body.musaitlik_takvimi} if body.musaitlik_takvimi else set()
    )
    if not selected <= known:
        raise HTTPException(
            422, "Seçilen takvim bulunamadı. Takvim listesini yenileyin."
        )
    old_account = baglanti.hesap_sifreli
    account["dolu_takvimleri"] = body.dolu_takvimleri
    account["musaitlik_takvimi"] = body.musaitlik_takvimi
    baglanti.hesap_sifreli = sifrele(account)
    esitle(baglanti)
    if baglanti.son_hata:
        message = HATA_MESAJLARI[baglanti.son_hata]
        if baglanti.durum == "aktif":
            # Seçim kaydedilmez; son başarılı veriler kullanılmaya devam eder.
            baglanti.hesap_sifreli = old_account
        db.commit()
        raise HTTPException(502, message)
    webhook_kanallarini_yenile(db, baglanti)
    denetle(db, "google_takvim.ayarla", me.kullanici_id, me.id)
    db.commit()
    return durum(db, me)


@router.post("/uzman/google-takvim/esitle", response_model=GoogleTakvimDurumu)
def simdi_esitle(me: AktifUzman, db: Db):
    """Takvim listesini ve dolu zamanları hemen yeniler."""
    yapilandirma_gerekli()
    hiz_siniri.kontrol("google-takvim:" + me.id, 30, 900)
    baglanti = aktif_baglanti(db, me)
    esitle(baglanti, takvim_listesi=True)
    if baglanti.son_hata is None:
        webhook_kanallarini_yenile(db, baglanti)
    for booking in db.scalars(
        select(Randevu)
        .join(RandevuTakvimIsi)
        .where(
            Randevu.uzman_id == me.id,
            RandevuTakvimIsi.durum != "esitlendi",
        )
    ):
        kuyruga_ekle(db, booking)
    db.commit()
    return durum(db, me)


@router.delete("/uzman/google-takvim", status_code=204)
def baglantiyi_kaldir(me: AktifUzman, db: Db):
    """Google yetkisini iptal eder ve yerel anahtar/aralıkları siler."""
    baglanti = baglanti_bul(db, me.id)
    if not baglanti:
        return
    token = coz(baglanti.token_sifreli).get("refresh_token")
    webhook_kanallarini_kapat(db, baglanti)
    db.execute(
        delete(RandevuTakvimIsi).where(
            RandevuTakvimIsi.baglanti_id == baglanti.id
        )
    )
    db.flush()
    db.delete(baglanti)
    denetle(db, "google_takvim.kaldir", me.kullanici_id, me.id)
    db.commit()
    if token and get_settings().google_takvim_etkin:
        google_istemcisi.iptal_et(token)


@router.post(
    "/google-takvim/webhook", status_code=204, include_in_schema=False
)
def google_webhook(request: Request, db: Db):
    """Google Calendar push bildirimini doğrular ve değişiklikte eşitler.

    İlk `sync` bildiriminde Google API'ye geri istek yapılmaz. `exists`
    bildirimlerinde ardışık istekleri sınırlamak için en az
    WEBHOOK_ESITLEME_ARALIGI saniye beklenir.
    """
    hiz_siniri.kontrol("google-webhook:" + istemci(request), 120, 60)
    channel_id = request.headers.get("X-Goog-Channel-ID", "")
    resource_id = request.headers.get("X-Goog-Resource-ID", "")
    resource_state = request.headers.get("X-Goog-Resource-State", "")
    channel_token = request.headers.get("X-Goog-Channel-Token", "")
    if not channel_id or not channel_token:
        raise HTTPException(403, "Kanal doğrulanamadı.")
    channel = db.get(GoogleTakvimKanali, channel_id)
    now = int(time.time())
    if not channel or channel.bitis < now:
        return
    if not hmac.compare_digest(ozet(channel_token), channel.dogrulama_ozeti):
        raise HTTPException(403, "Kanal doğrulanamadı.")
    if channel.kaynak_id and resource_id != channel.kaynak_id:
        raise HTTPException(403, "Kanal kaynağı eşleşmiyor.")
    channel.son_bildirim = now
    if resource_state == "sync":
        db.commit()
        return
    if resource_state in {"exists", "not_exists"}:
        baglanti = db.get(GoogleTakvimBaglantisi, channel.baglanti_id)
        if (
            baglanti
            and baglanti.durum == "aktif"
            and get_settings().google_takvim_etkin
            and (
                baglanti.son_deneme is None
                or now - baglanti.son_deneme >= WEBHOOK_ESITLEME_ARALIGI
            )
        ):
            esitle(baglanti, now)
    db.commit()
