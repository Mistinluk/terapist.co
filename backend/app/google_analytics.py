"""Google Analytics (GA4) Data API v1beta istemcisi ve önbellekli raporlama.

Yönetici iki yöntemden biriyle Google Analytics hesabını bağlayabilir:
1. Google OAuth (`analytics.readonly` kapsamı) ile tek tıkla yetkilendirme
2. Hizmet Hesabı (Service Account) JSON anahtarı ile sunucudan otomatik çekim

Tüm gizli anahtar ve belirteçler `sifrele`/`coz` ile Fernet şifreli saklanır;
ham JSON ya da yenileme belirteçleri hiçbir uçta dışarı döndürülmez.
"""

import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics_service import (
    SAYFA_TURU_ETIKETLERI,
    _gun_serisi,
    kaynak_siniflandir,
    sayfa_turu_belirle,
)
from app.config import get_settings
from app.google_takvim import (
    IPTAL_ADRESI,
    TOKEN_ADRESI,
    YETKI_ADRESI,
    _ssl_baglami,
)
from app.models import AnalitikAyari, Randevu, Uzman
from app.security import coz, sifrele

GA4_KAPSAM = "https://www.googleapis.com/auth/analytics.readonly"
GA4_KAPSAMLARI = ("openid", "email", GA4_KAPSAM)
GA4_API_KOK = "https://analyticsdata.googleapis.com/v1beta"
GA4_ONBELLEK_SURESI = 900
ZAMAN_ASIMI = 10

GA4_HATA_MESAJLARI = {
    "yetki_kaldirildi": (
        "Google Analytics izni kaldırılmış. Hesabı yeniden bağlayın."
    ),
    "izin_eksik": (
        "Seçili Google hesabının bu GA4 mülkünü görüntüleme yetkisi yok."
    ),
    "mulk_bulunamadi": (
        "GA4 Mülk Kimliği (Property ID) bulunamadı. Rakamsal mülk kimliğini "
        "kontrol edin."
    ),
    "baglanti": (
        "Google Analytics sunucularına şu anda ulaşılamıyor. Kısa süre "
        "sonra tekrar deneyin."
    ),
    "gecersiz_yanit": "Google Analytics yanıtı okunamadı.",
    "gecersiz_json": "Geçerli bir Google Hizmet Hesabı JSON dosyası girin.",
}


class GA4Hatasi(Exception):
    """Yönetici arayüzüne güvenli Türkçe kod taşıyan GA4 istemci hatası."""

    def __init__(self, kod: str):
        super().__init__(kod)
        self.kod = kod


def ayar_getir_veya_olustur(db: Session) -> AnalitikAyari:
    settings = get_settings()
    row = db.get(AnalitikAyari, "varsayilan")
    if row:
        return row
    row = AnalitikAyari(
        id="varsayilan",
        ga_olcum_kimligi=settings.ga_olcum_kimligi.strip() or None,
        ga4_mulk_kimligi=settings.ga4_mulk_kimligi.strip() or None,
        olcum_etkin=True,
        google_baglanti_durumu="bagli_degil",
        guncelleme=int(time.time()),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def etkin_olcum_kimligi(ayar: AnalitikAyari | None) -> str | None:
    env_id = get_settings().ga_olcum_kimligi.strip() or None
    if ayar and ayar.ga_olcum_kimligi is not None:
        return ayar.ga_olcum_kimligi.strip() or None
    return env_id


def etkin_mulk_kimligi(ayar: AnalitikAyari | None) -> str | None:
    env_prop = get_settings().ga4_mulk_kimligi.strip() or None
    if ayar and ayar.ga4_mulk_kimligi is not None:
        return ayar.ga4_mulk_kimligi.strip() or None
    return env_prop


def hizmet_hesabi_dogrula(raw_json: str) -> dict:
    try:
        data = json.loads(raw_json)
    except ValueError:
        raise GA4Hatasi("gecersiz_json") from None
    if not isinstance(data, dict):
        raise GA4Hatasi("gecersiz_json")
    email = str(data.get("client_email") or "").strip()
    key = str(data.get("private_key") or "").strip()
    token_uri = str(
        data.get("token_uri") or "https://oauth2.googleapis.com/token"
    ).strip()
    if not email or "@" not in email or "BEGIN" not in key:
        raise GA4Hatasi("gecersiz_json")
    return {
        "tip": "hizmet_hesabi",
        "client_email": email,
        "private_key": key,
        "token_uri": token_uri,
    }


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _hizmet_jwt_olustur(
    email: str, private_key_pem: str, audience: str
) -> str:
    now = int(time.time())
    header = _b64url(
        json.dumps(
            {"alg": "RS256", "typ": "JWT"}, separators=(",", ":")
        ).encode()
    )
    claim = _b64url(
        json.dumps(
            {
                "iss": email,
                "scope": GA4_KAPSAM,
                "aud": audience,
                "exp": now + 3600,
                "iat": now,
            },
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{claim}".encode()
    try:
        key = serialization.load_pem_private_key(
            private_key_pem.encode(), password=None
        )
    except (ValueError, TypeError):
        raise GA4Hatasi("gecersiz_json") from None
    if not isinstance(key, rsa.RSAPrivateKey):
        raise GA4Hatasi("gecersiz_json")
    signature = key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    return f"{header}.{claim}.{_b64url(signature)}"


class GA4Istemcisi:
    """Google Analytics Data API v1beta ve OAuth belirteç istemcisi."""

    def _istek(
        self,
        url: str,
        *,
        form: dict | None = None,
        govde: dict | None = None,
        erisim: str | None = None,
    ) -> dict:
        headers = {"Accept": "application/json"}
        data = None
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        elif govde is not None:
            data = json.dumps(govde).encode()
            headers["Content-Type"] = "application/json"
        if erisim:
            headers["Authorization"] = f"Bearer {erisim}"
        request = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(
                request, timeout=ZAMAN_ASIMI, context=_ssl_baglami()
            ) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as exc:
            try:
                body = json.loads(exc.read() or b"{}")
            except ValueError:
                body = {}
            err = body.get("error")
            reason = (
                str(err.get("status", ""))
                if isinstance(err, dict)
                else str(err or "")
            )
            if reason in {"invalid_grant", "unauthorized_client"}:
                raise GA4Hatasi("yetki_kaldirildi") from None
            if exc.code == 403 or reason == "PERMISSION_DENIED":
                raise GA4Hatasi("izin_eksik") from None
            if exc.code == 404 or reason == "NOT_FOUND":
                raise GA4Hatasi("mulk_bulunamadi") from None
            raise GA4Hatasi("baglanti") from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise GA4Hatasi("baglanti") from None
        try:
            return json.loads(raw or b"{}")
        except ValueError:
            raise GA4Hatasi("gecersiz_yanit") from None

    def yetki_adresi(self, state: str, challenge: str) -> str:
        settings = get_settings()
        query = urllib.parse.urlencode(
            {
                "client_id": settings.google_istemci_kimligi,
                "redirect_uri": settings.google_analitik_geri_donus_adresi,
                "response_type": "code",
                "scope": " ".join(GA4_KAPSAMLARI),
                "access_type": "offline",
                "include_granted_scopes": "true",
                "prompt": "consent select_account",
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{YETKI_ADRESI}?{query}"

    def kod_degistir(self, code: str, verifier: str) -> dict:
        settings = get_settings()
        return self._istek(
            TOKEN_ADRESI,
            form={
                "code": code,
                "client_id": settings.google_istemci_kimligi,
                "client_secret": (
                    settings.google_istemci_sirri.get_secret_value()
                ),
                "redirect_uri": settings.google_analitik_geri_donus_adresi,
                "grant_type": "authorization_code",
                "code_verifier": verifier,
            },
        )

    def belirtec_yenile(self, refresh_token: str) -> dict:
        settings = get_settings()
        return self._istek(
            TOKEN_ADRESI,
            form={
                "refresh_token": refresh_token,
                "client_id": settings.google_istemci_kimligi,
                "client_secret": (
                    settings.google_istemci_sirri.get_secret_value()
                ),
                "grant_type": "refresh_token",
            },
        )

    def hizmet_erisim_belirteci(self, kimlik: dict) -> dict:
        assertion = _hizmet_jwt_olustur(
            kimlik["client_email"],
            kimlik["private_key"],
            kimlik["token_uri"],
        )
        return self._istek(
            kimlik["token_uri"],
            form={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )

    def baglanti_iptal(self, token: str) -> None:
        try:
            self._istek(IPTAL_ADRESI, form={"token": token})
        except GA4Hatasi:
            pass

    def rapor_calistir(
        self, erisim: str, mulk_kimligi: str, govde: dict
    ) -> dict:
        url = f"{GA4_API_KOK}/properties/{mulk_kimligi}:runReport"
        return self._istek(url, govde=govde, erisim=erisim)


ga_istemcisi = GA4Istemcisi()


def _erisim_belirteci(ayar: AnalitikAyari) -> str:
    if not ayar.google_kimlik_sifreli:
        raise GA4Hatasi("yetki_kaldirildi")
    try:
        creds = coz(ayar.google_kimlik_sifreli)
    except ValueError:
        raise GA4Hatasi("yetki_kaldirildi") from None

    now = int(time.time())
    if creds.get("expires_at", 0) > now + 60 and creds.get("access_token"):
        return creds["access_token"]

    if creds.get("tip") == "hizmet_hesabi":
        token_resp = ga_istemcisi.hizmet_erisim_belirteci(creds)
    else:
        refresh = creds.get("refresh_token")
        if not refresh:
            raise GA4Hatasi("yetki_kaldirildi")
        token_resp = ga_istemcisi.belirtec_yenile(refresh)

    access_token = str(token_resp.get("access_token") or "")
    if not access_token:
        raise GA4Hatasi("gecersiz_yanit")
    creds["access_token"] = access_token
    creds["expires_at"] = now + int(token_resp.get("expires_in", 3600))
    ayar.google_kimlik_sifreli = sifrele(creds)
    return access_token


def _metrik_int(row: dict, index: int) -> int:
    try:
        return int(float(row["metricValues"][index]["value"]))
    except (KeyError, IndexError, ValueError, TypeError):
        return 0


def _boyut_str(row: dict, index: int) -> str:
    try:
        return str(row["dimensionValues"][index]["value"])
    except (KeyError, IndexError, TypeError):
        return ""


def _tr_tarih_bicimle(ga_date: str) -> str:
    if len(ga_date) == 8 and ga_date.isdigit():
        return f"{ga_date[:4]}-{ga_date[4:6]}-{ga_date[6:8]}"
    return ga_date


def _tr_konum_etiketi(city: str, country: str) -> tuple[str, str]:
    clean_city = "Bilinmiyor" if city in {"", "(not set)"} else city
    clean_country = (
        "TR"
        if country in {"Turkey", "Türkiye", "TR"}
        else ("Diğer" if country in {"", "(not set)"} else country)
    )
    return clean_city, clean_country


def _ga4_raporu_cek(
    db: Session, ayar: AnalitikAyari, mulk_kimligi: str, gun: int
) -> dict:
    erisim = _erisim_belirteci(ayar)
    date_range = [{"startDate": f"{gun}daysAgo", "endDate": "today"}]

    daily_raw = ga_istemcisi.rapor_calistir(
        erisim,
        mulk_kimligi,
        {
            "dateRanges": date_range,
            "dimensions": [{"name": "date"}],
            "metrics": [
                {"name": "activeUsers"},
                {"name": "screenPageViews"},
            ],
            "orderBys": [{"dimension": {"dimensionName": "date"}}],
        },
    )
    loc_raw = ga_istemcisi.rapor_calistir(
        erisim,
        mulk_kimligi,
        {
            "dateRanges": date_range,
            "dimensions": [{"name": "city"}, {"name": "country"}],
            "metrics": [
                {"name": "activeUsers"},
                {"name": "screenPageViews"},
            ],
            "orderBys": [
                {"metric": {"metricName": "activeUsers"}, "desc": True}
            ],
            "limit": 10,
        },
    )
    pages_raw = ga_istemcisi.rapor_calistir(
        erisim,
        mulk_kimligi,
        {
            "dateRanges": date_range,
            "dimensions": [{"name": "pagePath"}],
            "metrics": [
                {"name": "screenPageViews"},
                {"name": "activeUsers"},
            ],
            "orderBys": [
                {"metric": {"metricName": "screenPageViews"}, "desc": True}
            ],
            "limit": 100,
        },
    )
    sources_raw = ga_istemcisi.rapor_calistir(
        erisim,
        mulk_kimligi,
        {
            "dateRanges": date_range,
            "dimensions": [
                {"name": "sessionSource"},
                {"name": "sessionDefaultChannelGroup"},
            ],
            "metrics": [
                {"name": "activeUsers"},
                {"name": "screenPageViews"},
            ],
            "orderBys": [
                {"metric": {"metricName": "activeUsers"}, "desc": True}
            ],
            "limit": 25,
        },
    )

    daily_map: dict[str, tuple[int, int]] = {}
    total_visitors = 0
    total_views = 0
    for row in daily_raw.get("rows", []):
        day = _tr_tarih_bicimle(_boyut_str(row, 0))
        vis = _metrik_int(row, 0)
        views = _metrik_int(row, 1)
        daily_map[day] = (vis, views)
        total_visitors += vis
        total_views += views

    # Totals satırı varsa günlük benzersiz sayım şişmesini önlemek için
    # toplam tekil ziyaretçiyi doğrudan buradan al.
    totals = daily_raw.get("totals") or []
    if totals:
        total_visitors = _metrik_int(totals[0], 0) or total_visitors
        total_views = _metrik_int(totals[0], 1) or total_views

    loc_rows = []
    loc_sum = max(1, sum(_metrik_int(r, 0) for r in loc_raw.get("rows", [])))
    for row in loc_raw.get("rows", []):
        sehir, ulke = _tr_konum_etiketi(_boyut_str(row, 0), _boyut_str(row, 1))
        vis = _metrik_int(row, 0)
        loc_rows.append(
            {
                "sehir": sehir,
                "ulke": ulke,
                "ziyaretci": vis,
                "sayfa_goruntuleme": _metrik_int(row, 1),
                "pay_yuzde": round((vis / loc_sum) * 100, 1),
            }
        )

    # Sayfa yollarını gerçek terapist profilleri + sayfa türleri ile eşleştir.
    therapists = list(
        db.scalars(select(Uzman).where(Uzman.arsivli.is_(False)))
    )
    by_slug = {u.kullanici_adi.lower(): u for u in therapists}
    by_id = {u.id: u for u in therapists}

    profile_agg: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    page_type_agg: dict[str, int] = defaultdict(int)
    profile_daily_total = 0

    for row in pages_raw.get("rows", []):
        raw_path = _boyut_str(row, 0).split("?")[0]
        clean = raw_path.rstrip("/") or "/"
        views = _metrik_int(row, 0)
        vis = _metrik_int(row, 1)
        matched: Uzman | None = None
        if clean.startswith("/uzman/"):
            matched = by_id.get(clean.split("/uzman/", 1)[1])
        elif clean != "/" and "/" not in clean.lstrip("/"):
            matched = by_slug.get(clean.lstrip("/").lower())
        tur = sayfa_turu_belirle(clean, matched.id if matched else None)
        page_type_agg[tur] += views
        if matched:
            profile_agg[matched.id][0] += views
            profile_agg[matched.id][1] += vis
            profile_daily_total += views

    prof_ids = list(profile_agg.keys())
    booking_counts: dict[str, int] = defaultdict(int)
    if prof_ids:
        since = int(time.time()) - gun * 86400
        for uid, _ in db.execute(
            select(Randevu.uzman_id, Randevu.id).where(
                Randevu.uzman_id.in_(prof_ids), Randevu.olusturma >= since
            )
        ).all():
            booking_counts[uid] += 1

    top_therapists = []
    for uid, (views, vis) in sorted(
        profile_agg.items(), key=lambda x: x[1][0], reverse=True
    )[:10]:
        u = by_id[uid]
        top_therapists.append(
            {
                "uzman_id": u.id,
                "ad": u.ad,
                "kullanici_adi": u.kullanici_adi,
                "sehir": u.sehir,
                "profil_goruntuleme": views,
                "tekil_ziyaretci": vis,
                "randevu_talebi": booking_counts[u.id],
            }
        )

    # Yönlendiren adres/kaynakları normalize et
    src_agg: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    for row in sources_raw.get("rows", []):
        src = _boyut_str(row, 0)
        channel = _boyut_str(row, 1)
        vis = _metrik_int(row, 0)
        views = _metrik_int(row, 1)
        if src in {"", "(direct)", "(not set)"}:
            kat, etiket = "dogrudan", "Doğrudan / Bağlantı"
        else:
            kat, etiket, _ = kaynak_siniflandir(
                referans_url=src, utm_kaynak=src
            )
            if kat == "diger_site" and channel == "Organic Search":
                kat, etiket = "google", f"{etiket} (Arama)"
        src_agg[(kat, etiket)][0] += vis
        src_agg[(kat, etiket)][1] += views

    src_total = max(1, sum(v[0] for v in src_agg.values()))
    sources_list = [
        {
            "anahtar": kat,
            "etiket": etiket,
            "kategori": kat,
            "ziyaretci": vis,
            "sayfa_goruntuleme": views,
            "pay_yuzde": round((vis / src_total) * 100, 1),
        }
        for (kat, etiket), (vis, views) in sorted(
            src_agg.items(), key=lambda item: item[1][0], reverse=True
        )[:10]
    ]

    gunluk_egilim = [
        {
            "tarih": day,
            "ziyaretci": daily_map.get(day, (0, 0))[0],
            "sayfa_goruntuleme": daily_map.get(day, (0, 0))[1],
            "profil_goruntuleme": 0,
        }
        for day in _gun_serisi(gun)
    ]

    return {
        "ozet": {
            "ziyaretci": total_visitors,
            "sayfa_goruntuleme": total_views,
            "profil_goruntuleme": profile_daily_total,
            "randevu_basvurusu": sum(booking_counts.values()),
            "en_yuksek_kaynak": (
                sources_list[0]["etiket"] if sources_list else None
            ),
        },
        "gunluk_egilim": gunluk_egilim,
        "en_cok_ziyaret_edilen_uzmanlar": top_therapists,
        "yonlendiren_kaynaklar": sources_list,
        "ziyaretci_konumlari": loc_rows,
        "sayfa_turleri": [
            {
                "tur": k,
                "etiket": SAYFA_TURU_ETIKETLERI.get(k, k),
                "goruntuleme": v,
            }
            for k, v in sorted(
                page_type_agg.items(), key=lambda x: x[1], reverse=True
            )
        ],
    }


def ga4_raporu_getir(
    db: Session, ayar: AnalitikAyari, gun: int, *, yenile: bool = False
) -> dict | None:
    mulk_kimligi = etkin_mulk_kimligi(ayar)
    if (
        ayar.google_baglanti_durumu not in {"oauth_bagli", "hizmet_hesabi"}
        or not mulk_kimligi
    ):
        return None

    now = int(time.time())
    cache = dict(ayar.ga4_onbellek or {})
    cached_entry = cache.get(str(gun))
    if (
        not yenile
        and isinstance(cached_entry, dict)
        and now - int(cached_entry.get("zaman", 0)) < GA4_ONBELLEK_SURESI
        and "veri" in cached_entry
    ):
        return cached_entry["veri"]

    try:
        veri = _ga4_raporu_cek(db, ayar, mulk_kimligi, gun)
    except GA4Hatasi as exc:
        ayar.son_ga4_hata = exc.kod
        if exc.kod == "yetki_kaldirildi":
            ayar.google_baglanti_durumu = "koptu"
        ayar.guncelleme = now
        db.commit()
        if isinstance(cached_entry, dict) and "veri" in cached_entry:
            return cached_entry["veri"]
        return None

    cache[str(gun)] = {"zaman": now, "veri": veri}
    ayar.ga4_onbellek = cache
    ayar.son_ga4_senkron = now
    ayar.son_ga4_hata = None
    ayar.guncelleme = now
    db.commit()
    return veri
