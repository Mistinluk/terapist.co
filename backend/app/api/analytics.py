"""Site geneli trafik ölçümü, Google Analytics (GA4) ve panel raporları."""

import hmac
import json
import secrets
import time
from typing import Annotated, Literal
from urllib.parse import urlencode, urlsplit

from cryptography.fernet import InvalidToken
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.analytics_service import (
    istanbul_gunu,
    kaynak_siniflandir,
    konum_cozumle,
    sayfa_turu_belirle,
    uzman_trafik_raporu,
    yonetim_site_ici_rapor,
    ziyaretci_karma_olustur,
)
from app.config import get_settings
from app.google_analytics import (
    GA4_HATA_MESAJLARI,
    GA4Hatasi,
    ayar_getir_veya_olustur,
    etkin_mulk_kimligi,
    etkin_olcum_kimligi,
    ga4_raporu_getir,
    ga_istemcisi,
    hizmet_hesabi_dogrula,
)
from app.google_takvim import id_token_email, pkce_cifti
from app.models import AnalitikAyari, Kullanici, TrafikOlayi, Uzman
from app.schemas import AnalitikAyarGuncelleGirdi, TrafikOlcumGirdi
from app.security import (
    AktifUzman,
    Db,
    Yonetici,
    coz,
    denetle,
    fernet,
    hiz_siniri,
    istemci,
    sifrele,
)

router = APIRouter(tags=["Site Ölçümü ve Analitik"])

GA_DURUM_CEREZI = "ga_baglanti"
GA_CEREZ_YOLU = "/api/google-analitik/geri-donus"
GA_CEREZ_SURESI = 600


def _ga_panel_adresi(sonuc: str) -> str:
    query = urlencode({"sekme": "trafik", "ga": sonuc})
    return f"{get_settings().uygulama_adresi.rstrip('/')}/yonetim?{query}"


def _ga_yonlendir(sonuc: str) -> RedirectResponse:
    response = RedirectResponse(_ga_panel_adresi(sonuc), status_code=303)
    response.delete_cookie(GA_DURUM_CEREZI, path=GA_CEREZ_YOLU)
    return response


def _ga_durum_cerezi(request: Request) -> dict | None:
    raw = request.cookies.get(GA_DURUM_CEREZI, "")
    if not raw:
        return None
    try:
        value = json.loads(fernet.decrypt(raw.encode(), ttl=GA_CEREZ_SURESI))
    except (InvalidToken, ValueError):
        return None
    if (
        not isinstance(value, dict)
        or not {
            "kullanici_id",
            "nonce",
            "verifier",
        }
        <= value.keys()
    ):
        return None
    return value


def _kendi_alanlari() -> set[str]:
    host = urlsplit(get_settings().uygulama_adresi).hostname or ""
    hosts = {"localhost", "127.0.0.1", "terapist.co"}
    if host:
        hosts.add(host.lower())
    return hosts


def _uzman_cozumle(
    db: Db, uzman_id: str | None, kullanici_adi: str | None
) -> Uzman | None:
    if uzman_id:
        u = db.get(Uzman, uzman_id)
        if u and not u.arsivli:
            return u
    if kullanici_adi:
        u = db.scalar(
            select(Uzman).where(
                Uzman.kullanici_adi == kullanici_adi.strip().lower(),
                Uzman.arsivli.is_(False),
            )
        )
        if u:
            return u
    return None


@router.get("/analitik/yapilandirma")
def analitik_yapilandirma(db: Db):
    """İstemciye genel GA4 ölçüm kimliğini döndürür; gizli veri içermez."""
    ayar = db.get(AnalitikAyari, "varsayilan")
    olcum_etkin = True if ayar is None else bool(ayar.olcum_etkin)
    ga_id = etkin_olcum_kimligi(ayar) if olcum_etkin else None
    return {
        "olcum_etkin": olcum_etkin,
        "ga_olcum_kimligi": ga_id,
    }


@router.post("/analitik/olcum", status_code=204)
def analitik_olcum(body: TrafikOlcumGirdi, request: Request, db: Db):
    """IP saklamadan mahremiyet güvenli trafik ve kaynak olayı kaydeder."""
    hiz_siniri.kontrol("analitik:" + istemci(request), 120, 60)

    clean_path = body.sayfa_yolu.split("?")[0].strip() or "/"
    # Panel ve yönetim çalışma alanı gezintileri genel site trafiğine karışmaz.
    if clean_path.startswith(("/panel", "/yonetim")):
        return Response(status_code=204)

    ayar = db.get(AnalitikAyari, "varsayilan")
    if ayar is not None and not ayar.olcum_etkin:
        return Response(status_code=204)

    uzman = _uzman_cozumle(db, body.uzman_id, body.uzman_kullanici_adi)
    now = int(time.time())
    gun = istanbul_gunu(now)
    kat, etiket, alan = kaynak_siniflandir(
        referans_url=body.referans_url,
        utm_kaynak=body.utm_kaynak,
        kendi_alanlari=_kendi_alanlari(),
    )
    sehir, ulke = konum_cozumle(
        request,
        saat_dilimi=body.saat_dilimi,
        uzman_sehir=uzman.sehir if uzman else None,
    )
    event = TrafikOlayi(
        zaman=now,
        tarih_gun=gun,
        ziyaretci_karma=ziyaretci_karma_olustur(gun, body.ziyaret_anahtari),
        olay_turu=body.olay_turu,
        sayfa_yolu=clean_path[:200],
        sayfa_turu=sayfa_turu_belirle(clean_path, uzman.id if uzman else None),
        uzman_id=uzman.id if uzman else None,
        kaynak_kategorisi=kat,
        kaynak_etiketi=etiket,
        kaynak_alani=alan,
        utm_kaynak=body.utm_kaynak.strip().lower()[:60],
        sehir=sehir,
        ulke=ulke,
        cihaz=body.cihaz,
        hedef_kaynak_id=(
            body.hedef_kaynak_id[:36] if body.hedef_kaynak_id else None
        ),
    )
    db.add(event)
    db.commit()
    return Response(status_code=204)


def _ga4_durumu_ozet(ayar) -> dict:
    settings = get_settings()
    err_code = ayar.son_ga4_hata or ""
    return {
        "olcum_kimligi": etkin_olcum_kimligi(ayar),
        "mulk_kimligi": etkin_mulk_kimligi(ayar),
        "olcum_etkin": bool(ayar.olcum_etkin),
        "baglanti_durumu": ayar.google_baglanti_durumu,
        "hesap_etiketi": ayar.google_hesap_etiketi,
        "son_senkron": ayar.son_ga4_senkron,
        "hata": GA4_HATA_MESAJLARI.get(err_code) if err_code else None,
        "oauth_etkin": settings.google_takvim_etkin,
        "geri_donus_adresi": settings.google_analitik_geri_donus_adresi,
    }


@router.get("/yonetim/trafik-analitigi")
def yonetim_trafik_analitigi(
    user: Yonetici,
    db: Db,
    gun: Annotated[int, Query()] = 30,
    kaynak: Annotated[Literal["karma", "ga4", "site_ici"], Query()] = "karma",
    yenile: bool = False,
):
    if gun not in {7, 30, 90}:
        raise HTTPException(422, "Zaman aralığı 7, 30 veya 90 gün olmalıdır.")
    ayar = ayar_getir_veya_olustur(db)
    site_ici = yonetim_site_ici_rapor(db, gun)
    ga4_raporu = (
        ga4_raporu_getir(db, ayar, gun, yenile=yenile)
        if kaynak != "site_ici"
        else None
    )

    if kaynak == "ga4" and ga4_raporu:
        aktif_mod = "ga4"
        goruntulenen = {
            **ga4_raporu,
            "donusum_hunisi": site_ici["donusum_hunisi"],
        }
    elif kaynak == "karma" and ga4_raporu:
        aktif_mod = "ga4"
        goruntulenen = {
            **ga4_raporu,
            "donusum_hunisi": site_ici["donusum_hunisi"],
        }
    else:
        aktif_mod = "site_ici"
        goruntulenen = site_ici

    denetle(db, "analitik.trafik_oku", user.id)
    db.commit()
    return {
        "gun": gun,
        "istenen_kaynak": kaynak,
        "aktif_kaynak": aktif_mod,
        "ga4_durumu": _ga4_durumu_ozet(ayar),
        "ga4_veri_hazir": ga4_raporu is not None,
        **goruntulenen,
    }


@router.patch("/yonetim/analitik-ayarlar")
def yonetim_analitik_ayar_guncelle(
    body: AnalitikAyarGuncelleGirdi, user: Yonetici, db: Db
):
    ayar = ayar_getir_veya_olustur(db)
    now = int(time.time())
    if body.ga_olcum_kimligi is not None:
        ayar.ga_olcum_kimligi = body.ga_olcum_kimligi or None
    if body.ga4_mulk_kimligi is not None:
        if body.ga4_mulk_kimligi != (ayar.ga4_mulk_kimligi or ""):
            ayar.ga4_onbellek = None
        ayar.ga4_mulk_kimligi = body.ga4_mulk_kimligi or None
    if body.olcum_etkin is not None:
        ayar.olcum_etkin = body.olcum_etkin
    if body.hizmet_hesabi_json is not None:
        cleaned = body.hizmet_hesabi_json.strip()
        if cleaned:
            try:
                sa_info = hizmet_hesabi_dogrula(cleaned)
            except GA4Hatasi as exc:
                raise HTTPException(422, GA4_HATA_MESAJLARI[exc.kod]) from None
            ayar.google_kimlik_sifreli = sifrele(sa_info)
            ayar.google_baglanti_durumu = "hizmet_hesabi"
            ayar.google_hesap_etiketi = sa_info["client_email"]
            ayar.son_ga4_hata = None
            ayar.ga4_onbellek = None
    ayar.guncelleme = now
    denetle(db, "analitik.ayar_guncelle", user.id, ayar.id)
    db.commit()
    return _ga4_durumu_ozet(ayar)


@router.post("/yonetim/analitik/google/baglanti")
def yonetim_ga_baglanti_baslat(response: Response, user: Yonetici):
    settings = get_settings()
    if not settings.google_takvim_etkin:
        raise HTTPException(
            503,
            "Google OAuth istemci kimliği yapılandırılmamış. Hizmet hesabı "
            "JSON ile bağlanabilirsiniz.",
        )
    hiz_siniri.kontrol("ga-oauth:" + user.id, 10, 900)
    verifier, challenge = pkce_cifti()
    nonce = secrets.token_urlsafe(32)
    response.set_cookie(
        GA_DURUM_CEREZI,
        fernet.encrypt(
            json.dumps(
                {
                    "kullanici_id": user.id,
                    "nonce": nonce,
                    "verifier": verifier,
                }
            ).encode()
        ).decode(),
        httponly=True,
        secure=settings.ortam == "uretim",
        samesite="lax",
        max_age=GA_CEREZ_SURESI,
        path=GA_CEREZ_YOLU,
    )
    return {"yonlendirme_url": ga_istemcisi.yetki_adresi(nonce, challenge)}


@router.get("/google-analitik/geri-donus", include_in_schema=False)
def google_analitik_geri_donus(
    request: Request,
    db: Db,
    state: Annotated[str, Query(max_length=200)] = "",
    code: Annotated[str, Query(max_length=2000)] = "",
    error: Annotated[str, Query(max_length=200)] = "",
):
    pending = _ga_durum_cerezi(request)
    if (
        not pending
        or not state
        or not hmac.compare_digest(state, pending["nonce"])
    ):
        return _ga_yonlendir("gecersiz")
    if error or not code:
        return _ga_yonlendir("iptal")
    user = db.get(Kullanici, pending["kullanici_id"])
    if not user or not user.aktif or user.rol != "yonetici":
        return _ga_yonlendir("gecersiz")
    try:
        tokens = ga_istemcisi.kod_degistir(code, pending["verifier"])
        refresh_token = tokens.get("refresh_token")
        access_token = tokens.get("access_token")
        if not refresh_token or not access_token:
            raise GA4Hatasi("gecersiz_yanit")
        email = id_token_email(str(tokens.get("id_token", "")))
    except GA4Hatasi:
        return _ga_yonlendir("hata")

    now = int(time.time())
    ayar = ayar_getir_veya_olustur(db)
    ayar.google_kimlik_sifreli = sifrele(
        {
            "tip": "oauth",
            "refresh_token": refresh_token,
            "access_token": access_token,
            "expires_at": now + int(tokens.get("expires_in", 3600)),
        }
    )
    ayar.google_baglanti_durumu = "oauth_bagli"
    ayar.google_hesap_etiketi = email or "Google Analytics Hesabı"
    ayar.son_ga4_hata = None
    ayar.ga4_onbellek = None
    ayar.guncelleme = now
    denetle(db, "analitik.google_bagla", user.id, ayar.id)
    db.commit()
    return _ga_yonlendir("bagli")


@router.delete("/yonetim/analitik/google/baglanti", status_code=204)
def yonetim_ga_baglanti_kes(user: Yonetici, db: Db):
    ayar = ayar_getir_veya_olustur(db)
    if ayar.google_kimlik_sifreli:
        try:
            creds = coz(ayar.google_kimlik_sifreli)
            if creds.get("refresh_token"):
                ga_istemcisi.baglanti_iptal(creds["refresh_token"])
        except ValueError:
            pass
    ayar.google_kimlik_sifreli = None
    ayar.google_baglanti_durumu = "bagli_degil"
    ayar.google_hesap_etiketi = None
    ayar.son_ga4_hata = None
    ayar.ga4_onbellek = None
    ayar.guncelleme = int(time.time())
    denetle(db, "analitik.google_kes", user.id, ayar.id)
    db.commit()


@router.get("/uzman/trafik-analitigi")
def uzman_trafik_analitigi(
    me: AktifUzman,
    db: Db,
    gun: Annotated[int, Query()] = 30,
):
    """Yalnızca oturumdaki uzmanın profiline ait sadeleştirilmiş metrikler."""
    if gun not in {7, 30, 90}:
        raise HTTPException(422, "Zaman aralığı 7, 30 veya 90 gün olmalıdır.")
    return uzman_trafik_raporu(db, me, gun)
