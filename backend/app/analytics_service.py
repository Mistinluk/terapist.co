"""Site içi mahremiyet odaklı ölçüm ve kaynak ayrıştırma yardımcıları."""

import hashlib
import hmac
import posixpath
import time
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from urllib.parse import unquote, urlsplit
from zoneinfo import ZoneInfo

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    BeklemeListesiKaydi,
    ProfilKaynagi,
    Randevu,
    TrafikOlayi,
    Uzman,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
)

ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")


def olcum_yolu(adres: str) -> str | None:
    """Özel yolları dışlar; kodlama ve nokta parçalarıyla filtre aşılamaz.

    İstemci filtresine güvenilmez. Sorgu ve fragment hiçbir zaman ölçüme
    yazılmaz; mutlak adresler ve belirsiz çoklu kodlamalar reddedilir.
    """
    try:
        parsed = urlsplit(adres.strip())
        decoded = unquote(parsed.path, errors="strict")
        if (
            not decoded.startswith("/")
            or decoded.startswith("//")
            or "%" in decoded
            or "\\" in decoded
            or any(ord(char) < 32 for char in decoded)
            or parsed.netloc
            or parsed.scheme
        ):
            return None
        path = posixpath.normpath(urlsplit(decoded).path)
    except (ValueError, UnicodeError):
        return None
    private_paths = ("/panel", "/yonetim", "/davet", "/r")
    lower_path = path.lower()
    if any(
        lower_path == item or lower_path.startswith(f"{item}/")
        for item in private_paths
    ):
        return None
    return path


SAYFA_TURU_ETIKETLERI = {
    "ana_sayfa": "Ana sayfa",
    "dizin": "Terapist rehberi",
    "terapist_profili": "Terapist profili",
    "yonlendirme": "Danışan yönlendirme",
    "basvuru": "Uzman başvurusu",
    "diger": "Diğer sayfalar",
}


def istanbul_gunu(ts: int | None = None) -> str:
    dt = datetime.fromtimestamp(ts or int(time.time()), UTC).astimezone(
        ISTANBUL_TZ
    )
    return dt.strftime("%Y-%m-%d")


def ziyaretci_karma_olustur(tarih_gun: str, ziyaret_anahtari: str) -> str:
    """IP saklamadan günlük tekilleştirilmiş ziyaretçi karması üretir."""
    key = get_settings().hiz_siniri_anahtari.get_secret_value().encode()
    payload = f"{tarih_gun}:{ziyaret_anahtari}".encode()
    return hmac.new(key, payload, hashlib.sha256).hexdigest()[:24]


def sayfa_turu_belirle(yol: str, uzman_id: str | None) -> str:
    clean = (yol or "/").split("?")[0].rstrip("/") or "/"
    if uzman_id or clean.startswith("/uzman/"):
        return "terapist_profili"
    if clean == "/":
        return "ana_sayfa"
    if clean == "/kesfet":
        return "dizin"
    if clean.startswith("/r/"):
        return "yonlendirme"
    if clean == "/basvuru":
        return "basvuru"
    return "diger"


def kaynak_siniflandir(
    referans_url: str = "",
    utm_kaynak: str = "",
    kendi_alanlari: set[str] | None = None,
) -> tuple[str, str, str]:
    """Gelen trafik kaynağını kategori, etiket ve alan adına ayırır."""
    utm = (utm_kaynak or "").strip().lower()
    raw_ref = (referans_url or "").strip()
    domain = ""
    if raw_ref:
        if raw_ref.startswith("android-app://"):
            domain = raw_ref.replace("android-app://", "", 1).split("/")[0]
        else:
            parsed = urlsplit(
                raw_ref if "://" in raw_ref else f"https://{raw_ref}"
            )
            domain = (parsed.hostname or "").lower()
    if domain.startswith("www."):
        domain = domain[4:]

    probe = utm or domain
    if not probe:
        return ("dogrudan", "Doğrudan / Bağlantı", "")

    own = kendi_alanlari or {"localhost", "127.0.0.1", "terapist.co"}
    if domain and (domain in own or domain.endswith(".terapist.co")):
        if not utm:
            return ("platform_ici", "Platform İçi (Rehber)", domain)
        probe = utm

    if "instagram" in probe:
        return ("instagram", "Instagram", domain or "instagram.com")
    if "youtube" in probe or domain == "youtu.be":
        return ("youtube", "YouTube", domain or "youtube.com")
    if "google" in probe:
        return ("google", "Google", domain or "google.com")
    if "linkedin" in probe or domain == "lnkd.in":
        return ("linkedin", "LinkedIn", domain or "linkedin.com")
    if "facebook" in probe or domain in {"fb.com", "fb.me"}:
        return ("facebook", "Facebook", domain or "facebook.com")
    if domain in {"x.com", "twitter.com", "t.co"} or utm in {"x", "twitter"}:
        return ("x", "X (Twitter)", domain or "x.com")

    label = domain or utm
    return ("diger_site", label[:80], domain[:120])


def konum_cozumle(
    request: Request,
    saat_dilimi: str = "",
    uzman_sehir: str | None = None,
) -> tuple[str, str]:
    """Yalnızca güvenilir CDN/vekil konum başlıklarından şehir/ülke okur."""
    city = (
        request.headers.get("cf-ipcity")
        or request.headers.get("x-vercel-ip-city")
        or request.headers.get("x-geo-city")
        or ""
    )
    country = (
        request.headers.get("cf-ipcountry")
        or request.headers.get("x-vercel-ip-country")
        or request.headers.get("x-geo-country")
        or ""
    )
    city = unquote(city).strip()[:80]
    country = country.strip().upper()[:60]
    if not country:
        country = "TR" if "istanbul" in saat_dilimi.lower() else "TR"
    if not city:
        if uzman_sehir:
            city = f"{uzman_sehir} (Profil bölgesi)"
        elif "istanbul" in saat_dilimi.lower():
            city = "Türkiye (Saat dilimi)"
        else:
            city = "Bilinmiyor"
    return (city[:80], country[:60])


def _gun_serisi(gun: int) -> list[str]:
    bugun = datetime.now(UTC).astimezone(ISTANBUL_TZ).date()
    return [
        (bugun - timedelta(days=offset)).strftime("%Y-%m-%d")
        for offset in range(gun - 1, -1, -1)
    ]


def yonetim_site_ici_rapor(db: Session, gun: int) -> dict:
    """Yönetici için site içi ölçüm raporunu hazırlar."""
    baslangic = int(time.time()) - gun * 86400
    events = list(
        db.scalars(select(TrafikOlayi).where(TrafikOlayi.zaman >= baslangic))
    )
    view_events = [
        e for e in events if e.olay_turu in {"page_view", "profile_view"}
    ]
    unique_visitors = len({e.ziyaretci_karma for e in view_events})
    total_views = len(view_events)
    profile_views = [
        e for e in view_events if e.sayfa_turu == "terapist_profili"
    ]

    daily_visitors: dict[str, set[str]] = defaultdict(set)
    daily_views: dict[str, int] = defaultdict(int)
    daily_profiles: dict[str, int] = defaultdict(int)
    for event in view_events:
        daily_visitors[event.tarih_gun].add(event.ziyaretci_karma)
        daily_views[event.tarih_gun] += 1
        if event.sayfa_turu == "terapist_profili":
            daily_profiles[event.tarih_gun] += 1

    gunluk_egilim = [
        {
            "tarih": day,
            "ziyaretci": len(daily_visitors[day]),
            "sayfa_goruntuleme": daily_views[day],
            "profil_goruntuleme": daily_profiles[day],
        }
        for day in _gun_serisi(gun)
    ]

    # En fazla siteye yönlendirme yapan adres / kaynaklar
    src_visitors: dict[tuple[str, str], set[str]] = defaultdict(set)
    src_views: dict[tuple[str, str], int] = defaultdict(int)
    for event in view_events:
        key = (event.kaynak_kategorisi, event.kaynak_etiketi)
        src_visitors[key].add(event.ziyaretci_karma)
        src_views[key] += 1

    src_total = max(1, sum(len(v) for v in src_visitors.values()))
    yonlendiren_kaynaklar = [
        {
            "anahtar": kat,
            "etiket": etiket,
            "kategori": kat,
            "ziyaretci": len(visitors),
            "sayfa_goruntuleme": src_views[(kat, etiket)],
            "pay_yuzde": round((len(visitors) / src_total) * 100, 1),
        }
        for (kat, etiket), visitors in sorted(
            src_visitors.items(),
            key=lambda item: (len(item[1]), src_views[item[0]]),
            reverse=True,
        )[:10]
    ]

    # En fazla ziyaretçi gelen şehir / konumlar
    loc_visitors: dict[tuple[str, str], set[str]] = defaultdict(set)
    loc_views: dict[tuple[str, str], int] = defaultdict(int)
    for event in view_events:
        key = (event.sehir, event.ulke)
        loc_visitors[key].add(event.ziyaretci_karma)
        loc_views[key] += 1

    loc_total = max(1, sum(len(v) for v in loc_visitors.values()))
    ziyaretci_konumlari = [
        {
            "sehir": sehir,
            "ulke": ulke,
            "ziyaretci": len(visitors),
            "sayfa_goruntuleme": loc_views[(sehir, ulke)],
            "pay_yuzde": round((len(visitors) / loc_total) * 100, 1),
        }
        for (sehir, ulke), visitors in sorted(
            loc_visitors.items(),
            key=lambda item: (len(item[1]), loc_views[item[0]]),
            reverse=True,
        )[:10]
    ]

    # En fazla ziyaret edilen terapist profilleri
    prof_views: dict[str, int] = defaultdict(int)
    prof_visitors: dict[str, set[str]] = defaultdict(set)
    prof_bookings: dict[str, int] = defaultdict(int)
    for event in view_events:
        if event.uzman_id:
            prof_views[event.uzman_id] += 1
            prof_visitors[event.uzman_id].add(event.ziyaretci_karma)

    if prof_views:
        booking_counts = db.execute(
            select(Randevu.uzman_id, func.count())
            .where(
                Randevu.olusturma >= baslangic,
                Randevu.uzman_id.in_(list(prof_views.keys())),
            )
            .group_by(Randevu.uzman_id)
        ).all()
        for uid, cnt in booking_counts:
            prof_bookings[uid] = int(cnt)

    therapists = (
        {
            u.id: u
            for u in db.scalars(
                select(Uzman).where(Uzman.id.in_(list(prof_views.keys())))
            )
        }
        if prof_views
        else {}
    )

    en_cok_ziyaret_edilen_uzmanlar = []
    for uid, views in sorted(
        prof_views.items(), key=lambda x: x[1], reverse=True
    )[:10]:
        u = therapists.get(uid)
        if not u:
            continue
        en_cok_ziyaret_edilen_uzmanlar.append(
            {
                "uzman_id": u.id,
                "ad": u.ad,
                "kullanici_adi": u.kullanici_adi,
                "sehir": u.sehir,
                "profil_goruntuleme": views,
                "tekil_ziyaretci": len(prof_visitors[uid]),
                "randevu_talebi": prof_bookings[uid],
            }
        )

    page_type_counts: dict[str, int] = defaultdict(int)
    for event in view_events:
        page_type_counts[event.sayfa_turu] += 1

    sayfa_turleri = [
        {
            "tur": tur,
            "etiket": SAYFA_TURU_ETIKETLERI.get(tur, tur),
            "goruntuleme": count,
        }
        for tur, count in sorted(
            page_type_counts.items(), key=lambda item: item[1], reverse=True
        )
    ]

    total_period_bookings = (
        db.scalar(
            select(func.count())
            .select_from(Randevu)
            .where(Randevu.olusturma >= baslangic)
        )
        or 0
    )

    donusum_hunisi = {
        "dizin_aramasi": sum(
            1 for e in events if e.olay_turu == "directory_search"
        ),
        "profil_goruntuleme": len(profile_views),
        "randevu_cekmecesi": sum(
            1 for e in events if e.olay_turu == "booking_drawer_open"
        ),
        "randevu_talebi": max(
            sum(1 for e in events if e.olay_turu == "booking_submitted"),
            int(total_period_bookings),
        ),
    }

    return {
        "ozet": {
            "ziyaretci": unique_visitors,
            "sayfa_goruntuleme": total_views,
            "profil_goruntuleme": len(profile_views),
            "randevu_basvurusu": donusum_hunisi["randevu_talebi"],
            "en_yuksek_kaynak": (
                yonlendiren_kaynaklar[0]["etiket"]
                if yonlendiren_kaynaklar
                else None
            ),
        },
        "gunluk_egilim": gunluk_egilim,
        "en_cok_ziyaret_edilen_uzmanlar": en_cok_ziyaret_edilen_uzmanlar,
        "yonlendiren_kaynaklar": yonlendiren_kaynaklar,
        "ziyaretci_konumlari": ziyaretci_konumlari,
        "sayfa_turleri": sayfa_turleri,
        "donusum_hunisi": donusum_hunisi,
    }


def uzman_trafik_raporu(db: Session, uzman: Uzman, gun: int) -> dict:
    """Terapist için sadeleştirilmiş profil ve ziyaretçi istatistikleri."""
    baslangic = int(time.time()) - gun * 86400
    events = list(
        db.scalars(
            select(TrafikOlayi).where(
                TrafikOlayi.uzman_id == uzman.id,
                TrafikOlayi.zaman >= baslangic,
            )
        )
    )
    views = [e for e in events if e.olay_turu in {"page_view", "profile_view"}]
    unique_visitors = len({e.ziyaretci_karma for e in views})
    drawer_opens = sum(
        1 for e in events if e.olay_turu == "booking_drawer_open"
    )
    tracked_bookings = sum(
        1 for e in events if e.olay_turu == "booking_submitted"
    )
    db_bookings = int(
        db.scalar(
            select(func.count())
            .select_from(Randevu)
            .where(
                Randevu.uzman_id == uzman.id,
                Randevu.olusturma >= baslangic,
            )
        )
        or 0
    )
    booking_count = max(tracked_bookings, db_bookings)

    badge_clicks = int(
        db.scalar(
            select(func.count())
            .select_from(WebsiteRozetiOlayi)
            .join(
                WebsiteRozeti,
                WebsiteRozeti.id == WebsiteRozetiOlayi.rozet_id,
            )
            .where(
                WebsiteRozeti.uzman_id == uzman.id,
                WebsiteRozetiOlayi.olay == "badge_clicked",
                WebsiteRozetiOlayi.zaman >= baslangic,
            )
        )
        or 0
    )
    resource_clicks = int(
        db.scalar(
            select(
                func.coalesce(func.sum(ProfilKaynagi.tiklama_sayisi), 0)
            ).where(ProfilKaynagi.uzman_id == uzman.id)
        )
        or 0
    )
    now_ts = int(time.time())
    resources = list(
        db.scalars(
            select(ProfilKaynagi)
            .where(ProfilKaynagi.uzman_id == uzman.id)
            .order_by(
                ProfilKaynagi.tiklama_sayisi.desc(), ProfilKaynagi.sira.asc()
            )
        )
    )
    period_waitlist = int(
        db.scalar(
            select(func.count())
            .select_from(BeklemeListesiKaydi)
            .where(
                BeklemeListesiKaydi.uzman_id == uzman.id,
                BeklemeListesiKaydi.olusturma >= baslangic,
            )
        )
        or 0
    )
    pending_waitlist = int(
        db.scalar(
            select(func.count())
            .select_from(BeklemeListesiKaydi)
            .where(
                BeklemeListesiKaydi.uzman_id == uzman.id,
                BeklemeListesiKaydi.durum == "bekliyor",
            )
        )
        or 0
    )
    waitlist_events = sum(
        1 for e in events if e.olay_turu == "waitlist_submitted"
    )
    embed_plays = sum(1 for e in events if e.olay_turu == "embed_play")
    qr_scans = sum(1 for e in events if e.olay_turu == "qr_scan")
    link_unlocks = sum(1 for e in events if e.olay_turu == "link_unlock")
    waitlist_count = max(period_waitlist, waitlist_events)

    total_clicks_denom = max(1, resource_clicks)
    baglanti_performansi = []
    for item in resources:
        if (
            item.baslangic_zamani is not None
            and now_ts < item.baslangic_zamani
        ):
            schedule_state = "planli"
        elif item.bitis_zamani is not None and now_ts >= item.bitis_zamani:
            schedule_state = "suresi_doldu"
        else:
            schedule_state = "aktif"
        clicks = int(item.tiklama_sayisi or 0)
        baglanti_performansi.append(
            {
                "id": item.id,
                "baslik": item.baslik,
                "kategori": item.kategori,
                "tiklama_sayisi": clicks,
                "vurgulu": bool(item.vurgulu),
                "kilitli": bool(item.sifre_ozeti),
                "medya_turu": item.medya_turu,
                "zaman_durumu": schedule_state,
                "tiklama_payi_yuzde": (
                    round((clicks / total_clicks_denom) * 100, 1)
                    if resource_clicks > 0
                    else 0.0
                ),
                "to_orani_yuzde": (
                    round((clicks / len(views)) * 100, 1) if views else 0.0
                ),
            }
        )

    daily_views: dict[str, int] = defaultdict(int)
    for event in views:
        daily_views[event.tarih_gun] += 1

    # Randevuların günlük dağılımı (pazar gününden geriye doğru aynı seri)
    booking_times = list(
        db.scalars(
            select(Randevu.olusturma).where(
                Randevu.uzman_id == uzman.id,
                Randevu.olusturma >= baslangic,
            )
        )
    )
    daily_bookings: dict[str, int] = defaultdict(int)
    for ts in booking_times:
        daily_bookings[istanbul_gunu(ts)] += 1

    gunluk_egilim = [
        {
            "tarih": day,
            "goruntuleme": daily_views[day],
            "randevu_talebi": daily_bookings[day],
        }
        for day in _gun_serisi(gun)
    ]

    src_visitors: dict[tuple[str, str], set[str]] = defaultdict(set)
    for event in views:
        src_visitors[(event.kaynak_kategorisi, event.kaynak_etiketi)].add(
            event.ziyaretci_karma
        )
    src_total = max(1, sum(len(v) for v in src_visitors.values()))
    gelis_kaynaklari = [
        {
            "anahtar": kat,
            "etiket": etiket,
            "ziyaretci": len(vis),
            "pay_yuzde": round((len(vis) / src_total) * 100, 1),
        }
        for (kat, etiket), vis in sorted(
            src_visitors.items(),
            key=lambda item: len(item[1]),
            reverse=True,
        )[:6]
    ]

    loc_visitors: dict[str, set[str]] = defaultdict(set)
    for event in views:
        loc_visitors[event.sehir].add(event.ziyaretci_karma)
    loc_total = max(1, sum(len(v) for v in loc_visitors.values()))
    ziyaretci_konumlari = [
        {
            "konum": konum,
            "ziyaretci": len(vis),
            "pay_yuzde": round((len(vis) / loc_total) * 100, 1),
        }
        for konum, vis in sorted(
            loc_visitors.items(),
            key=lambda item: len(item[1]),
            reverse=True,
        )[:5]
    ]

    conversion_pct = (
        round((booking_count / len(views)) * 100, 1) if views else 0.0
    )
    top_source = gelis_kaynaklari[0]["etiket"] if gelis_kaynaklari else None

    if len(views) == 0:
        oneri = {
            "baslik": "Profil bağlantınızı paylaşmaya başlayın",
            "aciklama": (
                f"terapist.co/{uzman.kullanici_adi} adresinizi Instagram, "
                "YouTube veya kişisel web sitenize eklediğinizde profilinize "
                "kimlerin nereden geldiğini burada net şekilde görebilirsiniz."
            ),
        }
    elif booking_count == 0 and drawer_opens > 0:
        oneri = {
            "baslik": "Takvim saatlerinizi kontrol edin",
            "aciklama": (
                f"Son {gun} günde {drawer_opens} kişi randevu saatlerinize "
                "baktı ancak talep oluşturmadı. Çalışma saatlerinizi "
                "güncelleyerek daha fazla müsaitlik sunabilirsiniz."
            ),
        }
    elif top_source:
        oneri = {
            "baslik": f"En güçlü kaynağınız: {top_source}",
            "aciklama": (
                f"Profilinize gelen ziyaretçilerin önemli bir bölümü "
                f"{top_source} üzerinden ulaştı. Bu kanaldaki görünürlüğünüzü "
                "korumanız yeni danışan ilgisini canlı tutar."
            ),
        }
    else:
        oneri = {
            "baslik": "Profil performansınız izleniyor",
            "aciklama": (
                "Profil ziyaretleriniz, randevu dönüşümleriniz ve yönlendirme "
                "kaynaklarınız sade özet olarak düzenli güncellenir."
            ),
        }

    return {
        "gun": gun,
        "profil_adresi": f"/{uzman.kullanici_adi}",
        "ozet": {
            "profil_goruntuleme": len(views),
            "tekil_ziyaretci": unique_visitors,
            "randevu_cekmece_acilisi": drawer_opens,
            "randevu_talebi": booking_count,
            "donusum_orani_yuzde": conversion_pct,
            "kaynak_ve_rozet_tiklamasi": resource_clicks + badge_clicks,
            "en_yuksek_kaynak": top_source,
        },
        "gelis_kaynaklari": gelis_kaynaklari,
        "ziyaretci_konumlari": ziyaretci_konumlari,
        "gunluk_egilim": gunluk_egilim,
        "profil_etkilesimleri": {
            "bilgi_kaynagi_tiklama": resource_clicks,
            "website_rozet_tiklama": badge_clicks,
            "randevu_form_acilisi": drawer_opens,
            "bekleme_listesi_basvurusu": waitlist_count,
            "medya_oynatma": embed_plays,
            "qr_ziyaret": qr_scans,
            "kilitli_link_acilisi": link_unlocks,
        },
        "baglanti_performansi": baglanti_performansi,
        "bekleme_ozeti": {
            "bekleyen": pending_waitlist,
            "toplam_donem": waitlist_count,
        },
        "oneri": oneri,
    }
