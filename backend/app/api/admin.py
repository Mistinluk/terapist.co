"""Yönetim yetkisi danışan verilerini okuma yetkisi vermez."""

import time
from collections import defaultdict
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import aliased

from app.api.notifications import bildirim_ekle
from app.api.resources import _zaman_durumu
from app.api.themes import tema_ozeti
from app.founding import kuruculari_tamamla, program_ayari, program_ozeti
from app.models import (
    BeklemeListesiKaydi,
    DanisanYonlendirme,
    Davet,
    Denetim,
    GoogleTakvimBaglantisi,
    GoogleTakvimKanali,
    Kullanici,
    KurucuUye,
    MeslektasUzmanlikIliskisi,
    ModerasyonRaporu,
    Oturum,
    ProfesyonelBaglanti,
    ProfilKaynagi,
    Randevu,
    RandevuBildirimi,
    Tavsiye,
    TerapistDogrulama,
    Uzman,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
    YonlendirmeHedefi,
    YonlendirmeOlayi,
)
from app.randevu_takip import tamamlanma_dogrula
from app.randevu_takvim import kuyruga_ekle
from app.schemas import (
    DavetLimitiGirdi,
    KurucuProgramiCikti,
    KurucuProgramiGirdi,
    KurucuUyeEkleGirdi,
    ModerasyonDurumuGirdi,
    OnayGirdi,
    ProfilCikti,
    ProfilGirdi,
    UzmanKaliciSilGirdi,
    UzmanSilmeOzeti,
    YonetimRandevuBildirimGirdi,
    YonetimRandevuDurumGirdi,
    YonetimTemaYetkisiGirdi,
)
from app.security import Db, Yonetici, coz, denetle
from app.uzman_silme import kalici_sil, silme_engelleri

router = APIRouter(prefix="/yonetim", tags=["Yönetim"])


@router.get("/uzmanlar", response_model=list[ProfilCikti])
def uzmanlar(
    user: Yonetici,
    db: Db,
    sayfa: Annotated[int, Query(ge=1)] = 1,
    onay: Literal["tumu", "bekleyen", "yayinda", "arsivli"] = "tumu",
    arama: Annotated[str, Query(max_length=120)] = "",
):
    query = select(Uzman).where(Uzman.arsivli.is_(onay == "arsivli"))
    if onay == "bekleyen":
        query = query.where(Uzman.onayli.is_(False))
    elif onay == "yayinda":
        query = query.where(Uzman.onayli.is_(True))
    term = arama.strip()
    if term:
        pattern = f"%{term}%"
        query = query.where(
            or_(
                Uzman.ad.ilike(pattern),
                Uzman.sehir.ilike(pattern),
                Uzman.ilce.ilike(pattern),
                Uzman.kullanici_adi.ilike(pattern),
            )
        )
    return list(
        db.scalars(
            query.order_by(Uzman.onayli, Uzman.ad)
            .offset((sayfa - 1) * 50)
            .limit(50)
        )
    )


@router.patch("/uzmanlar/{uzman_id}", status_code=204)
def onayla(uzman_id: str, body: OnayGirdi, user: Yonetici, db: Db):
    profile = db.get(Uzman, uzman_id)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")
    was_approved = bool(profile.onayli)
    profile.onayli = body.onayli
    verification = db.scalar(
        select(TerapistDogrulama).where(
            TerapistDogrulama.uzman_id == profile.id
        )
    )
    now = int(time.time())
    if not verification:
        verification = TerapistDogrulama(
            uzman_id=profile.id,
            gonderilme=now,
            incelenme=None,
            inceleyen_kullanici_id=None,
        )
        db.add(verification)
    verification.durum = "verified" if body.onayli else "pending"
    verification.incelenme = now if body.onayli else None
    verification.inceleyen_kullanici_id = user.id if body.onayli else None
    db.flush()
    assigned = kuruculari_tamamla(db, user.id) if body.onayli else []
    for founding in assigned:
        denetle(db, "uzman.kurucu_otomatik_ata", user.id, founding.uzman_id)
    if not was_approved and profile.onayli and profile.kullanici_id:
        bildirim_ekle(
            db,
            alici_kullanici_id=profile.kullanici_id,
            gonderen_kullanici_id=user.id,
            tur="sistem_hatirlatma",
            baslik="Profiliniz onaylandı ve yayına alındı",
            mesaj=(
                "Uzman profiliniz yönetim incelemesinden geçerek dizinde "
                "görünür duruma getirildi."
            ),
            hedef_yol=f"/{profile.kullanici_adi}",
            kaynak_anahtari=f"profil_onay:{profile.id}",
            now=now,
        )
    denetle(db, "uzman.onay_degistir", user.id, uzman_id)
    db.commit()


@router.patch("/uzmanlar/{uzman_id}/davet-limiti", status_code=204)
def davet_limiti(
    uzman_id: str, body: DavetLimitiGirdi, user: Yonetici, db: Db
):
    profile = db.get(Uzman, uzman_id, with_for_update=True)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")
    profile.davet_limiti = body.davet_limiti
    denetle(db, "uzman.davet_limiti", user.id, uzman_id)
    db.commit()


@router.patch("/uzmanlar/{uzman_id}/tema-yetkisi")
def tema_yetkisi_guncelle(
    uzman_id: str, body: YonetimTemaYetkisiGirdi, user: Yonetici, db: Db
):
    """Özel marka rengi ve beyaz etiket yetkisini yönetici kontrolüyle açar."""
    profile = db.get(Uzman, uzman_id, with_for_update=True)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")
    profile.ozel_tema_yetkisi = body.ozel_tema_yetkisi
    denetle(db, "uzman.tema_yetkisi", user.id, uzman_id)
    db.commit()
    return tema_ozeti(profile).model_dump()


@router.get("/kurucu-programi", response_model=KurucuProgramiCikti)
def kurucu_programi(user: Yonetici, db: Db):
    return program_ozeti(db)


@router.patch("/kurucu-programi", response_model=KurucuProgramiCikti)
def kurucu_programini_guncelle(
    body: KurucuProgramiGirdi, user: Yonetici, db: Db
):
    setting = program_ayari(db, kilitle=True)
    current_number = db.scalar(select(func.max(KurucuUye.kurucu_no))) or 0
    if body.azami_uye < current_number:
        raise HTTPException(
            409,
            "Azami sayı atanmış son kurucu numarasından küçük olamaz.",
        )
    setting.azami_uye = body.azami_uye
    setting.guncelleme = int(time.time())
    setting.guncelleyen_kullanici_id = user.id
    assigned = kuruculari_tamamla(db, user.id)
    denetle(db, "kurucu_programi.azami_uye", user.id, str(body.azami_uye))
    for founding in assigned:
        denetle(db, "uzman.kurucu_otomatik_ata", user.id, founding.uzman_id)
    db.commit()
    return program_ozeti(db)


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
    verification = db.scalar(
        select(TerapistDogrulama).where(
            TerapistDogrulama.uzman_id == profile.id
        )
    )
    if verification:
        verification.durum = "rejected"
        verification.incelenme = int(time.time())
        verification.inceleyen_kullanici_id = user.id
    db.get(Kullanici, profile.kullanici_id).aktif = False
    db.execute(
        delete(Oturum).where(Oturum.kullanici_id == profile.kullanici_id)
    )
    denetle(db, "uzman.arsivle", user.id, uzman_id)
    db.commit()


@router.get("/uzmanlar/{uzman_id}/kalici-sil", response_model=UzmanSilmeOzeti)
def silme_ozeti(uzman_id: str, user: Yonetici, db: Db):
    """Arşivli profiller dahil silme engellerini değiştirmeden gösterir."""
    profile = db.get(Uzman, uzman_id)
    if not profile:
        raise HTTPException(404, "Uzman bulunamadı.")
    account = db.get(Kullanici, profile.kullanici_id)
    reasons = silme_engelleri(db, profile, account)
    return UzmanSilmeOzeti(
        uzman_id=profile.id,
        kullanici_adi=profile.kullanici_adi,
        silinebilir=not reasons,
        engeller=reasons,
    )


@router.delete("/uzmanlar/{uzman_id}/kalici-sil", status_code=204)
def uzmani_kalici_sil(
    uzman_id: str, body: UzmanKaliciSilGirdi, user: Yonetici, db: Db
):
    """Mevcut DELETE/arşiv sözleşmesini değiştirmeyen ayrı silme işlemi."""
    profile = db.get(Uzman, uzman_id, with_for_update=True)
    if not profile:
        raise HTTPException(404, "Uzman bulunamadı.")
    if body.kullanici_adi != profile.kullanici_adi:
        raise HTTPException(409, "Onay için kullanıcı adı eşleşmelidir.")
    account = db.get(Kullanici, profile.kullanici_id, with_for_update=True)
    kalici_sil(db, profile, account, user.id)


def _sayim(db: Db, stmt) -> int:
    return int(db.scalar(stmt) or 0)


def _uzman_ozeti(profile: Uzman | None, fallback_id: str) -> dict:
    if not profile:
        return {
            "id": fallback_id,
            "ad": "Arşivli profil",
            "kullanici_adi": "",
            "sehir": "",
        }
    return {
        "id": profile.id,
        "ad": profile.ad,
        "kullanici_adi": profile.kullanici_adi,
        "sehir": profile.sehir,
    }


def _ad_maskele(value: str) -> str:
    parts = [p.strip() for p in value.split() if p.strip()]
    if not parts:
        return "—"
    return " ".join(f"{p[0]}{'*' * min(3, max(1, len(p) - 1))}" for p in parts)


def _telefon_maskele(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) < 2:
        return "—"
    return f"*** *** ** {digits[-2:]}"


def _bekleme_saati(appointment: Randevu, now: int) -> int:
    if appointment.durum != "bekliyor":
        return 0
    requested_at = appointment.son_talep_zamani or appointment.olusturma
    return max(0, (now - requested_at) // 3600)


def _randevu_durum_sayimlari(
    db: Db,
    now: int,
    uzman_id: str | None = None,
    yanit_suresi_saat: int = 24,
) -> dict:
    base = select(Randevu.durum, func.count()).group_by(Randevu.durum)
    window_30 = (
        select(func.count())
        .select_from(Randevu)
        .where(Randevu.olusturma >= now - 30 * 86400)
    )
    window_7 = (
        select(func.count())
        .select_from(Randevu)
        .where(Randevu.olusturma >= now - 7 * 86400)
    )
    future_active = (
        select(func.count())
        .select_from(Randevu)
        .where(
            Randevu.baslangic >= now,
            Randevu.durum.in_(["bekliyor", "onaylandi"]),
        )
    )
    overdue_waiting = (
        select(func.count())
        .select_from(Randevu)
        .where(
            Randevu.durum == "bekliyor",
            func.coalesce(Randevu.son_talep_zamani, Randevu.olusturma)
            <= now - yanit_suresi_saat * 3600,
        )
    )
    if uzman_id:
        base = base.where(Randevu.uzman_id == uzman_id)
        window_30 = window_30.where(Randevu.uzman_id == uzman_id)
        window_7 = window_7.where(Randevu.uzman_id == uzman_id)
        future_active = future_active.where(Randevu.uzman_id == uzman_id)
        overdue_waiting = overdue_waiting.where(Randevu.uzman_id == uzman_id)
    counts = {
        "bekliyor": 0,
        "onaylandi": 0,
        "tamamlandi": 0,
        "reddedildi": 0,
        "iptal": 0,
    }
    for status, total in db.execute(base).all():
        if status in counts:
            counts[status] = int(total)
    total_all = sum(counts.values())
    approved = counts["onaylandi"] + counts["tamamlandi"]
    decided = approved + counts["reddedildi"] + counts["iptal"]
    approval_rate = round((approved / decided) * 100) if decided else 0
    return {
        "toplam": total_all,
        **counts,
        "son_7_gun": _sayim(db, window_7),
        "son_30_gun": _sayim(db, window_30),
        "gelecek_aktif": _sayim(db, future_active),
        "gecikmis_bekleyen": _sayim(db, overdue_waiting),
        "onay_orani_yuzde": approval_rate,
    }


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


@router.get("/analitik")
def analitik(user: Yonetici, db: Db):
    """KVKK gereği danışan verisi açmadan platform genel analitiğini döner."""

    now = int(time.time())
    uzman_toplam = _sayim(
        db,
        select(func.count())
        .select_from(Uzman)
        .where(Uzman.arsivli.is_(False)),
    )
    yayinda = _sayim(
        db,
        select(func.count())
        .select_from(Uzman)
        .where(Uzman.arsivli.is_(False), Uzman.onayli.is_(True)),
    )
    bekleyen = _sayim(
        db,
        select(func.count())
        .select_from(Uzman)
        .where(Uzman.arsivli.is_(False), Uzman.onayli.is_(False)),
    )
    arsivli = _sayim(
        db,
        select(func.count()).select_from(Uzman).where(Uzman.arsivli.is_(True)),
    )
    randevu_ozet = _randevu_durum_sayimlari(db, now)

    takvim_aktif = _sayim(
        db,
        select(func.count())
        .select_from(GoogleTakvimBaglantisi)
        .join(Uzman, Uzman.id == GoogleTakvimBaglantisi.uzman_id)
        .where(
            Uzman.arsivli.is_(False),
            GoogleTakvimBaglantisi.durum == "aktif",
        ),
    )
    takvim_koptu = _sayim(
        db,
        select(func.count())
        .select_from(GoogleTakvimBaglantisi)
        .join(Uzman, Uzman.id == GoogleTakvimBaglantisi.uzman_id)
        .where(
            Uzman.arsivli.is_(False),
            GoogleTakvimBaglantisi.durum == "koptu",
        ),
    )
    webhook_kanal = _sayim(
        db,
        select(func.count())
        .select_from(GoogleTakvimKanali)
        .where(GoogleTakvimKanali.bitis > now),
    )

    rozet_sayisi = _sayim(
        db,
        select(func.count())
        .select_from(WebsiteRozeti)
        .join(Uzman, Uzman.id == WebsiteRozeti.uzman_id)
        .where(Uzman.arsivli.is_(False)),
    )
    rozet_tiklama = _sayim(
        db,
        select(func.count())
        .select_from(WebsiteRozetiOlayi)
        .where(WebsiteRozetiOlayi.olay == "badge_clicked"),
    )
    kaynak_sayisi = _sayim(db, select(func.count()).select_from(ProfilKaynagi))
    kaynak_tiklama = _sayim(
        db,
        select(func.coalesce(func.sum(ProfilKaynagi.tiklama_sayisi), 0)),
    )
    baglanti_aktif = _sayim(
        db,
        select(func.count())
        .select_from(ProfesyonelBaglanti)
        .where(ProfesyonelBaglanti.durum == "accepted"),
    )
    baglanti_bekleyen = _sayim(
        db,
        select(func.count())
        .select_from(ProfesyonelBaglanti)
        .where(ProfesyonelBaglanti.durum == "pending"),
    )
    uzmanlik_iliskisi = _sayim(
        db, select(func.count()).select_from(MeslektasUzmanlikIliskisi)
    )
    tavsiye_sayisi = _sayim(db, select(func.count()).select_from(Tavsiye))
    acik_moderasyon = _sayim(
        db,
        select(func.count())
        .select_from(ModerasyonRaporu)
        .where(ModerasyonRaporu.durum == "open"),
    )

    toplam_davet = _sayim(db, select(func.count()).select_from(Davet))
    bekleyen_davet = _sayim(
        db,
        select(func.count())
        .select_from(Davet)
        .where(Davet.durum == "pending", Davet.sure_bitimi > now),
    )
    kabul_davet = _sayim(
        db,
        select(func.count())
        .select_from(Davet)
        .where(Davet.durum == "accepted"),
    )
    toplam_link = _sayim(
        db, select(func.count()).select_from(DanisanYonlendirme)
    )
    aktif_link = _sayim(
        db,
        select(func.count())
        .select_from(DanisanYonlendirme)
        .where(
            DanisanYonlendirme.durum == "active",
            DanisanYonlendirme.sure_bitimi > now,
        ),
    )
    yonlendirme_goruntulenme = _sayim(
        db,
        select(
            func.coalesce(func.sum(DanisanYonlendirme.goruntulenme_sayisi), 0)
        ),
    )
    yonlendirme_hedef = _sayim(
        db, select(func.count()).select_from(YonlendirmeHedefi)
    )
    yonlendirme_tiklama = _sayim(
        db,
        select(func.count())
        .select_from(YonlendirmeOlayi)
        .where(YonlendirmeOlayi.olay == "profile_clicked_from_referral"),
    )

    sehir_sayaclari: dict[str, dict[str, int]] = defaultdict(
        lambda: {"toplam": 0, "yayinda": 0}
    )
    format_sayaclari = {"cevrim_ici": 0, "yuz_yuze": 0}
    format_map = {
        "Çevrim içi": "cevrim_ici",
        "online": "cevrim_ici",
        "Yüz yüze": "yuz_yuze",
        "yuz_yuze": "yuz_yuze",
    }
    for sehir, onayli, formatlar in db.execute(
        select(Uzman.sehir, Uzman.onayli, Uzman.formatlar).where(
            Uzman.arsivli.is_(False)
        )
    ).all():
        city_key = (sehir or "Belirtilmemiş").strip() or "Belirtilmemiş"
        sehir_sayaclari[city_key]["toplam"] += 1
        if onayli:
            sehir_sayaclari[city_key]["yayinda"] += 1
        for fmt in formatlar or []:
            mapped = format_map.get(fmt)
            if mapped:
                format_sayaclari[mapped] += 1

    sehir_dagilimi = [
        {"sehir": city, **counts}
        for city, counts in sorted(
            sehir_sayaclari.items(),
            key=lambda item: (-item[1]["toplam"], item[0]),
        )[:8]
    ]

    if bekleyen > 0:
        siradaki = {
            "anahtar": "pending_therapists",
            "baslik": f"{bekleyen} terapist doğrulama bekliyor",
            "aciklama": (
                "Uzmanlar ve Profiller sekmesinden bekleyen başvuruları "
                "inceleyip yayına alabilirsiniz."
            ),
            "sekme": "uzmanlar",
        }
    elif acik_moderasyon > 0:
        siradaki = {
            "anahtar": "open_moderation",
            "baslik": f"{acik_moderasyon} açık moderasyon raporu var",
            "aciklama": (
                "Mesleki ağ bütünlüğünü korumak için Moderasyon sekmesinden "
                "açık kayıtları sonuçlandırın."
            ),
            "sekme": "moderasyon",
        }
    elif takvim_koptu > 0:
        siradaki = {
            "anahtar": "calendar_disconnected",
            "baslik": f"{takvim_koptu} terapistin takvim bağlantısı kopmuş",
            "aciklama": (
                "Uygun randevu saatlerinin güncel kalması için uzmanların "
                "profil özetini kontrol edebilirsiniz."
            ),
            "sekme": "uzmanlar",
        }
    else:
        siradaki = {
            "anahtar": "platform_healthy",
            "baslik": "Doğrulama ve moderasyon kuyruğu temiz",
            "aciklama": (
                "Danışan yönlendirmeleri ve davet dönüşümleri üzerinden ağ "
                "büyümesini takip edebilirsiniz."
            ),
            "sekme": "yonlendirmeler",
        }

    denetle(db, "analitik.goruntule", user.id)
    db.commit()
    return {
        "ozet": {
            "toplam_uzman": uzman_toplam,
            "yayindaki_uzman": yayinda,
            "bekleyen_uzman": bekleyen,
            "arsivli_uzman": arsivli,
            "kurucu_programi": program_ozeti(db),
            "randevular": randevu_ozet,
        },
        "ag_ve_profil": {
            "takvim_bagli_uzman": takvim_aktif,
            "takvim_koptu_uzman": takvim_koptu,
            "takvim_webhook_aktif_kanal": webhook_kanal,
            "rozet_olusturan_uzman": rozet_sayisi,
            "rozet_toplam_tiklama": rozet_tiklama,
            "profil_kaynagi_sayisi": kaynak_sayisi,
            "profil_kaynagi_tiklama": kaynak_tiklama,
            "aktif_profesyonel_baglanti": baglanti_aktif,
            "bekleyen_baglanti_istegi": baglanti_bekleyen,
            "uzmanlik_iliskisi_sayisi": uzmanlik_iliskisi,
            "tavsiye_sayisi": tavsiye_sayisi,
            "acik_moderasyon_raporu": acik_moderasyon,
        },
        "buyume_ve_yonlendirme": {
            "toplam_davet": toplam_davet,
            "bekleyen_davet": bekleyen_davet,
            "kabul_edilen_davet": kabul_davet,
            "toplam_yonlendirme_linki": toplam_link,
            "aktif_yonlendirme_linki": aktif_link,
            "yonlendirme_goruntulenme": yonlendirme_goruntulenme,
            "yonlendirme_hedef_atamasi": yonlendirme_hedef,
            "yonlendirme_profil_tiklamasi": yonlendirme_tiklama,
        },
        "sehir_dagilimi": sehir_dagilimi,
        "format_dagilimi": format_sayaclari,
        "siradaki_adim": siradaki,
    }


@router.get("/randevular")
def genel_randevular(
    user: Yonetici,
    db: Db,
    sayfa: Annotated[int, Query(ge=1)] = 1,
    durum: Literal[
        "tumu", "bekliyor", "onaylandi", "reddedildi", "iptal", "tamamlandi"
    ] = "tumu",
    uzman_id: str | None = None,
    yanit_suresi_saat: Annotated[int, Query(ge=1, le=720)] = 24,
    gecikmis: bool = False,
):
    """Danışan adı ve telefonu çözümlenmeden genel randevu dökümü döner."""

    now = int(time.time())
    cutoff = now - yanit_suresi_saat * 3600
    query = select(Randevu, Uzman).outerjoin(
        Uzman, Uzman.id == Randevu.uzman_id
    )
    count_query = select(func.count()).select_from(Randevu)
    if durum != "tumu":
        query = query.where(Randevu.durum == durum)
        count_query = count_query.where(Randevu.durum == durum)
    if gecikmis:
        query = query.where(
            Randevu.durum == "bekliyor",
            func.coalesce(Randevu.son_talep_zamani, Randevu.olusturma)
            <= cutoff,
        )
        count_query = count_query.where(
            Randevu.durum == "bekliyor",
            func.coalesce(Randevu.son_talep_zamani, Randevu.olusturma)
            <= cutoff,
        )
    if uzman_id:
        query = query.where(Randevu.uzman_id == uzman_id)
        count_query = count_query.where(Randevu.uzman_id == uzman_id)

    rows = db.execute(
        query.order_by(Randevu.baslangic.desc())
        .offset((sayfa - 1) * 50)
        .limit(50)
    ).all()
    booking_ids = [appointment.id for appointment, _ in rows]
    notif_stats: dict[str, tuple[int, int | None]] = {}
    if booking_ids:
        for bid, total, latest in db.execute(
            select(
                RandevuBildirimi.randevu_id,
                func.count(),
                func.max(RandevuBildirimi.olusturma),
            )
            .where(RandevuBildirimi.randevu_id.in_(booking_ids))
            .group_by(RandevuBildirimi.randevu_id)
        ).all():
            notif_stats[bid] = (int(total), latest)

    therapist_options = [
        {"id": tid, "ad": tad, "sehir": tsehir}
        for tid, tad, tsehir in db.execute(
            select(Uzman.id, Uzman.ad, Uzman.sehir)
            .where(Uzman.id.in_(select(Randevu.uzman_id)))
            .order_by(Uzman.ad)
        ).all()
    ]
    denetle(db, "randevular.listele", user.id)
    db.commit()
    return {
        "ozet": _randevu_durum_sayimlari(
            db, now, yanit_suresi_saat=yanit_suresi_saat
        ),
        "yanit_suresi_saat": yanit_suresi_saat,
        "uzmanlar_filtre": therapist_options,
        "sayfa": sayfa,
        "toplam_kayit": _sayim(db, count_query),
        "kayitlar": [
            {
                "id": appointment.id,
                "baslangic": appointment.baslangic,
                "olusturma": appointment.olusturma,
                "durum": appointment.durum,
                "aydinlatma_surumu": appointment.aydinlatma_surumu,
                "bekleme_suresi_saat": _bekleme_saati(appointment, now),
                "yanit_gecikti": (
                    appointment.durum == "bekliyor"
                    and (appointment.son_talep_zamani or appointment.olusturma)
                    <= cutoff
                ),
                "bildirim_sayisi": notif_stats.get(appointment.id, (0, None))[
                    0
                ],
                "son_bildirim_zamani": notif_stats.get(
                    appointment.id, (0, None)
                )[1],
                "uzman": _uzman_ozeti(therapist, appointment.uzman_id),
            }
            for appointment, therapist in rows
        ],
    }


@router.get("/randevular/{randevu_id}")
def randevu_detayi(
    randevu_id: str,
    user: Yonetici,
    db: Db,
    yanit_suresi_saat: Annotated[int, Query(ge=1, le=720)] = 24,
):
    """Yönetici için randevu detaylarını, bildirimleri ve geçmişi döner."""

    row = db.execute(
        select(Randevu, Uzman, Kullanici.email)
        .outerjoin(Uzman, Uzman.id == Randevu.uzman_id)
        .outerjoin(Kullanici, Kullanici.id == Uzman.kullanici_id)
        .where(Randevu.id == randevu_id)
    ).first()
    if not row:
        raise HTTPException(404, "Randevu bulunamadı.")

    appointment, therapist, therapist_email = row
    now = int(time.time())
    cutoff = now - yanit_suresi_saat * 3600
    try:
        client_payload = coz(appointment.danisan_sifreli)
    except Exception:
        client_payload = {}

    notifications = db.scalars(
        select(RandevuBildirimi)
        .where(RandevuBildirimi.randevu_id == appointment.id)
        .order_by(RandevuBildirimi.olusturma.desc())
    ).all()
    audits = db.scalars(
        select(Denetim)
        .where(Denetim.kaynak_id == appointment.id)
        .order_by(Denetim.zaman.desc())
        .limit(20)
    ).all()
    denetle(db, "randevular.detay", user.id, appointment.id)
    db.commit()

    therapist_summary = _uzman_ozeti(therapist, appointment.uzman_id)
    therapist_summary["eposta"] = therapist_email or ""
    return {
        "id": appointment.id,
        "baslangic": appointment.baslangic,
        "bitis": appointment.bitis or appointment.baslangic + 3600,
        "olusturma": appointment.olusturma,
        "durum": appointment.durum,
        "aydinlatma_surumu": appointment.aydinlatma_surumu,
        "bekleme_suresi_saat": _bekleme_saati(appointment, now),
        "yanit_gecikti": (
            appointment.durum == "bekliyor"
            and (appointment.son_talep_zamani or appointment.olusturma)
            <= cutoff
        ),
        "yanit_suresi_saat": yanit_suresi_saat,
        "uzman": therapist_summary,
        "danisan_maskeli": {
            "ad": _ad_maskele(str(client_payload.get("ad", ""))),
            "telefon": _telefon_maskele(
                str(client_payload.get("telefon", ""))
            ),
        },
        "bildirimler": [
            {
                "id": item.id,
                "tur": item.tur,
                "mesaj": item.mesaj,
                "okundu": item.okundu,
                "olusturma": item.olusturma,
                "okunma_zamani": item.okunma_zamani,
            }
            for item in notifications
        ],
        "islem_gecmisi": [
            {
                "id": log.id,
                "islem": log.islem,
                "zaman": log.zaman,
            }
            for log in audits
        ],
    }


@router.post("/randevular/{randevu_id}/bildirim", status_code=201)
def randevu_bildirimi_gonder(
    randevu_id: str,
    body: YonetimRandevuBildirimGirdi,
    user: Yonetici,
    db: Db,
):
    """İlgili terapiste randevu hakkında yönetici bildirimi gönderir."""

    appointment = db.get(Randevu, randevu_id)
    if not appointment:
        raise HTTPException(404, "Randevu bulunamadı.")

    now = int(time.time())
    notification = RandevuBildirimi(
        randevu_id=appointment.id,
        uzman_id=appointment.uzman_id,
        gonderen_kullanici_id=user.id,
        tur=body.tur,
        mesaj=body.mesaj,
        okundu=False,
        olusturma=now,
    )
    db.add(notification)
    db.flush()
    therapist = db.get(Uzman, appointment.uzman_id)
    if therapist and therapist.kullanici_id:
        bildirim_ekle(
            db,
            alici_kullanici_id=therapist.kullanici_id,
            gonderen_kullanici_id=user.id,
            randevu_id=appointment.id,
            tur="randevu_hatirlatma",
            baslik=(
                "Acil randevu hatırlatması"
                if body.tur == "eskalasyon"
                else "Yönetici randevu hatırlatması"
            ),
            mesaj=body.mesaj,
            hedef_yol="/panel?sekme=randevular",
            now=now,
        )
    denetle(db, "randevu.bildirim_gonder", user.id, appointment.id)
    db.commit()
    return {
        "id": notification.id,
        "tur": notification.tur,
        "mesaj": notification.mesaj,
        "okundu": notification.okundu,
        "olusturma": notification.olusturma,
        "okunma_zamani": notification.okunma_zamani,
    }


@router.patch("/randevular/{randevu_id}/durum")
def randevu_durumu_yonetim(
    randevu_id: str,
    body: YonetimRandevuDurumGirdi,
    user: Yonetici,
    db: Db,
):
    """Yönetici randevu durumunu değiştirir veya geciken işlemi tamamlar."""

    appointment = db.scalar(
        select(Randevu).where(Randevu.id == randevu_id).with_for_update()
    )
    if not appointment:
        raise HTTPException(404, "Randevu bulunamadı.")

    if body.eskalasyon_tamamla and appointment.durum != "bekliyor":
        raise HTTPException(
            409,
            "Yalnızca yanıt bekleyen randevular eskalasyonla tamamlanabilir.",
        )

    if appointment.durum == body.durum:
        raise HTTPException(409, "Randevu zaten seçili durumda.")

    tamamlanma_dogrula(appointment, body.durum)
    previous_status = appointment.durum
    appointment.durum = body.durum
    try:
        # Çakışmayı takvim sorgularının otomatik yazmasından önce yakala.
        db.flush()
        kuyruga_ekle(db, appointment)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            409,
            "Bu saat diliminde zaten aktif bir randevu bulunuyor.",
        ) from exc

    now = int(time.time())
    action_name = (
        "randevu.yonetim_tamamla"
        if body.eskalasyon_tamamla
        else f"randevu.yonetim_{body.durum}"
    )
    denetle(db, action_name, user.id, appointment.id)

    status_tr = {
        "bekliyor": "Yanıt bekliyor",
        "onaylandi": "Onaylandı",
        "tamamlandi": "Tamamlandı",
        "reddedildi": "Reddedildi",
        "iptal": "İptal edildi",
    }
    if body.terapiste_bildir:
        prefix = (
            "Yanıt süresi dolduğu için yönetici randevu işlemini "
            if body.eskalasyon_tamamla
            else "Yönetici randevu durumunu "
        )
        summary = (
            f"{prefix}'{status_tr[body.durum]}' olarak güncelledi "
            f"(önceki: {status_tr.get(previous_status, previous_status)})."
        )
        note_part = f" Not: {body.not_metni}" if body.not_metni else ""
        db.add(
            RandevuBildirimi(
                randevu_id=appointment.id,
                uzman_id=appointment.uzman_id,
                gonderen_kullanici_id=user.id,
                tur="eskalasyon"
                if body.eskalasyon_tamamla
                else "durum_degisikligi",
                mesaj=f"{summary}{note_part}"[:500],
                okundu=False,
                olusturma=now,
            )
        )
        therapist = db.get(Uzman, appointment.uzman_id)
        if therapist and therapist.kullanici_id:
            bildirim_ekle(
                db,
                alici_kullanici_id=therapist.kullanici_id,
                gonderen_kullanici_id=user.id,
                randevu_id=appointment.id,
                tur="randevu_guncelleme",
                baslik=(
                    "Yanıtsız randevu yönetici tarafından tamamlandı"
                    if body.eskalasyon_tamamla
                    else "Randevu durumu güncellendi"
                ),
                mesaj=f"{summary}{note_part}"[:600],
                hedef_yol="/panel?sekme=randevular",
                now=now,
            )

    db.commit()
    total_notifications = _sayim(
        db,
        select(func.count())
        .select_from(RandevuBildirimi)
        .where(RandevuBildirimi.randevu_id == appointment.id),
    )
    return {
        "id": appointment.id,
        "durum": appointment.durum,
        "bildirim_sayisi": total_notifications,
    }


@router.get("/uzmanlar/{uzman_id}/ozet")
def uzman_detay_ozeti(uzman_id: str, user: Yonetici, db: Db):
    """Uzman profili ve panelindeki yönetilebilir özet verileri döner."""

    profile = db.get(Uzman, uzman_id)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")

    now = int(time.time())
    verification = db.scalar(
        select(TerapistDogrulama).where(
            TerapistDogrulama.uzman_id == profile.id
        )
    )
    calendar = db.scalar(
        select(GoogleTakvimBaglantisi).where(
            GoogleTakvimBaglantisi.uzman_id == profile.id
        )
    )
    webhook_kanallar = _sayim(
        db,
        select(func.count())
        .select_from(GoogleTakvimKanali)
        .where(
            GoogleTakvimKanali.uzman_id == profile.id,
            GoogleTakvimKanali.bitis > now,
        ),
    )
    badge = db.scalar(
        select(WebsiteRozeti).where(WebsiteRozeti.uzman_id == profile.id)
    )
    badge_clicks = (
        _sayim(
            db,
            select(func.count())
            .select_from(WebsiteRozetiOlayi)
            .where(
                WebsiteRozetiOlayi.rozet_id == badge.id,
                WebsiteRozetiOlayi.olay == "badge_clicked",
            ),
        )
        if badge
        else 0
    )
    resources = list(
        db.scalars(
            select(ProfilKaynagi)
            .where(ProfilKaynagi.uzman_id == profile.id)
            .order_by(ProfilKaynagi.sira.asc(), ProfilKaynagi.olusturma.asc())
        )
    )
    accepted_connections = _sayim(
        db,
        select(func.count())
        .select_from(ProfesyonelBaglanti)
        .where(
            or_(
                ProfesyonelBaglanti.isteyen_uzman_id == profile.id,
                ProfesyonelBaglanti.alici_uzman_id == profile.id,
            ),
            ProfesyonelBaglanti.durum == "accepted",
        ),
    )
    pending_connections = _sayim(
        db,
        select(func.count())
        .select_from(ProfesyonelBaglanti)
        .where(
            or_(
                ProfesyonelBaglanti.isteyen_uzman_id == profile.id,
                ProfesyonelBaglanti.alici_uzman_id == profile.id,
            ),
            ProfesyonelBaglanti.durum == "pending",
        ),
    )
    specialty_signals = _sayim(
        db,
        select(func.count())
        .select_from(MeslektasUzmanlikIliskisi)
        .where(MeslektasUzmanlikIliskisi.hedef_uzman_id == profile.id),
    )
    recommendations_given = _sayim(
        db,
        select(func.count())
        .select_from(Tavsiye)
        .where(Tavsiye.veren_id == profile.id),
    )
    recommendations_received = _sayim(
        db,
        select(func.count())
        .select_from(Tavsiye)
        .where(Tavsiye.alan_id == profile.id),
    )
    referral_links_created = _sayim(
        db,
        select(func.count())
        .select_from(DanisanYonlendirme)
        .where(DanisanYonlendirme.yonlendiren_uzman_id == profile.id),
    )
    referral_links_active = _sayim(
        db,
        select(func.count())
        .select_from(DanisanYonlendirme)
        .where(
            DanisanYonlendirme.yonlendiren_uzman_id == profile.id,
            DanisanYonlendirme.durum == "active",
            DanisanYonlendirme.sure_bitimi > now,
        ),
    )
    referral_views = _sayim(
        db,
        select(
            func.coalesce(func.sum(DanisanYonlendirme.goruntulenme_sayisi), 0)
        ).where(DanisanYonlendirme.yonlendiren_uzman_id == profile.id),
    )
    referrals_received = _sayim(
        db,
        select(func.count())
        .select_from(YonlendirmeHedefi)
        .where(YonlendirmeHedefi.uzman_id == profile.id),
    )
    referral_clicks_received = _sayim(
        db,
        select(func.count())
        .select_from(YonlendirmeOlayi)
        .where(
            YonlendirmeOlayi.hedef_uzman_id == profile.id,
            YonlendirmeOlayi.olay == "profile_clicked_from_referral",
        ),
    )
    invites_sent = _sayim(
        db,
        select(func.count())
        .select_from(Davet)
        .where(Davet.davet_eden_uzman_id == profile.id),
    )
    invites_accepted = _sayim(
        db,
        select(func.count())
        .select_from(Davet)
        .where(
            Davet.davet_eden_uzman_id == profile.id,
            Davet.durum == "accepted",
        ),
    )
    invites_pending = _sayim(
        db,
        select(func.count())
        .select_from(Davet)
        .where(
            Davet.davet_eden_uzman_id == profile.id,
            Davet.durum == "pending",
            Davet.sure_bitimi > now,
        ),
    )
    waitlist_total = _sayim(
        db,
        select(func.count())
        .select_from(BeklemeListesiKaydi)
        .where(BeklemeListesiKaydi.uzman_id == profile.id),
    )
    waitlist_pending = _sayim(
        db,
        select(func.count())
        .select_from(BeklemeListesiKaydi)
        .where(
            BeklemeListesiKaydi.uzman_id == profile.id,
            BeklemeListesiKaydi.durum == "bekliyor",
        ),
    )
    waitlist_contacted = _sayim(
        db,
        select(func.count())
        .select_from(BeklemeListesiKaydi)
        .where(
            BeklemeListesiKaydi.uzman_id == profile.id,
            BeklemeListesiKaydi.durum == "iletisime_gecildi",
        ),
    )
    return {
        "uzman_id": profile.id,
        "ad": profile.ad,
        "kullanici_adi": profile.kullanici_adi,
        "onayli": profile.onayli,
        "davet_limiti": profile.davet_limiti,
        "kurucu_no": profile.kurucu_no,
        "dogrulama_durumu": (
            verification.durum if verification else "pending"
        ),
        "dogrulama_gonderilme": (
            verification.gonderilme if verification else None
        ),
        "dogrulama_incelenme": (
            verification.incelenme if verification else None
        ),
        "gizlilik": {
            "davet_edeni_goster": profile.davet_edeni_goster,
            "mesleki_agi_goster": profile.mesleki_agi_goster,
            "uzmanlik_iliskilerini_goster": (
                profile.uzmanlik_iliskilerini_goster
            ),
            "tavsiyeleri_goster": profile.tavsiyeleri_goster,
            "yonlendirme_agini_goster": profile.yonlendirme_agini_goster,
            "kurucu_durumunu_goster": profile.kurucu_durumunu_goster,
        },
        "tema": tema_ozeti(profile).model_dump(),
        "bekleme_ozeti": {
            "toplam": waitlist_total,
            "bekliyor": waitlist_pending,
            "iletisime_gecildi": waitlist_contacted,
        },
        "randevu_ozeti": _randevu_durum_sayimlari(
            db, now, uzman_id=profile.id
        ),
        "takvim": {
            "bagli": calendar is not None,
            "durum": calendar.durum if calendar else None,
            "son_senkron": calendar.son_senkron if calendar else None,
            "webhook_etkin": webhook_kanallar > 0,
            "webhook_kanal_sayisi": webhook_kanallar,
        },
        "rozet": {
            "aktif": badge is not None,
            "tiklama_sayisi": badge_clicks,
        },
        "kaynaklar": [
            {
                "id": item.id,
                "baslik": item.baslik,
                "kategori": item.kategori,
                "url": item.url,
                "tiklama_sayisi": item.tiklama_sayisi,
                "vurgulu": bool(item.vurgulu),
                "kilitli": bool(item.sifre_ozeti),
                "medya_turu": item.medya_turu,
                "zaman_durumu": _zaman_durumu(item, now),
            }
            for item in resources
        ],
        "ag": {
            "baglanti_sayisi": accepted_connections,
            "bekleyen_baglanti": pending_connections,
            "uzmanlik_iliskisi_sayisi": specialty_signals,
            "tavsiye_verilen": recommendations_given,
            "tavsiye_alinan": recommendations_received,
        },
        "yonlendirme_ozeti": {
            "olusturulan_link": referral_links_created,
            "aktif_link": referral_links_active,
            "toplam_goruntulenme": referral_views,
            "alinan_yonlendirme": referrals_received,
            "profil_tiklamasi": referral_clicks_received,
        },
        "davet_ozeti": {
            "limit": profile.davet_limiti,
            "gonderilen": invites_sent,
            "kabul_edilen": invites_accepted,
            "bekleyen": invites_pending,
        },
    }


@router.get("/kurucu-programi/uyeler")
def kurucu_programi_uyeleri(user: Yonetici, db: Db):
    """Mevcut kurucu üyeleri ve eklenebilecek onaylı adayları listeler."""

    member_rows = db.execute(
        select(KurucuUye, Uzman)
        .join(Uzman, Uzman.id == KurucuUye.uzman_id)
        .order_by(KurucuUye.kurucu_no.asc())
    ).all()
    candidate_rows = db.execute(
        select(Uzman)
        .outerjoin(KurucuUye, KurucuUye.uzman_id == Uzman.id)
        .where(
            Uzman.arsivli.is_(False),
            Uzman.onayli.is_(True),
            KurucuUye.id.is_(None),
        )
        .order_by(Uzman.uye_olma.asc(), Uzman.ad.asc())
    ).scalars()
    return {
        "program": program_ozeti(db),
        "uyeler": [
            {
                "uzman_id": therapist.id,
                "kurucu_no": member.kurucu_no,
                "verilme": member.verilme,
                "ad": therapist.ad,
                "kullanici_adi": therapist.kullanici_adi,
                "sehir": therapist.sehir,
                "ilce": therapist.ilce,
                "onayli": therapist.onayli,
                "arsivli": therapist.arsivli,
                "kurucu_durumunu_goster": therapist.kurucu_durumunu_goster,
            }
            for member, therapist in member_rows
        ],
        "adaylar": [
            {
                "uzman_id": candidate.id,
                "ad": candidate.ad,
                "kullanici_adi": candidate.kullanici_adi,
                "sehir": candidate.sehir,
                "ilce": candidate.ilce,
                "uye_olma": candidate.uye_olma,
            }
            for candidate in candidate_rows
        ],
    }


@router.post("/kurucu-programi/uyeler", status_code=201)
def kurucu_uyesi_ekle(body: KurucuUyeEkleGirdi, user: Yonetici, db: Db):
    """Doğrulanmış bir terapisti kurucu programına sıradaki numarayla ekler."""

    setting = program_ayari(db, kilitle=True)
    profile = db.get(Uzman, body.uzman_id, with_for_update=True)
    if not profile or profile.arsivli:
        raise HTTPException(404, "Uzman bulunamadı.")

    verification = db.scalar(
        select(TerapistDogrulama).where(
            TerapistDogrulama.uzman_id == profile.id
        )
    )
    if not profile.onayli or (
        verification and verification.durum != "verified"
    ):
        raise HTTPException(
            422,
            "Yalnız doğrulanmış (yayındaki) terapistler kurucu programına "
            "eklenebilir.",
        )

    existing = db.scalar(
        select(KurucuUye).where(KurucuUye.uzman_id == profile.id)
    )
    if existing:
        raise HTTPException(409, "Bu terapist zaten kurucu programına dahil.")

    last_number = db.scalar(select(func.max(KurucuUye.kurucu_no))) or 0
    next_number = last_number + 1
    if next_number > setting.azami_uye:
        raise HTTPException(
            409,
            "Kurucu programı kontenjanı dolu. Önce azami sayıyı artırın.",
        )

    founding = KurucuUye(
        uzman_id=profile.id,
        kurucu_no=next_number,
        verilme=int(time.time()),
        veren_kullanici_id=user.id,
    )
    db.add(founding)
    denetle(db, "kurucu_programi.uye_ekle", user.id, profile.id)
    db.commit()
    return {
        "program": program_ozeti(db),
        "eklenen": {
            "uzman_id": profile.id,
            "kurucu_no": next_number,
            "ad": profile.ad,
        },
    }


@router.delete("/kurucu-programi/uyeler/{uzman_id}")
def kurucu_uyesi_cikar(uzman_id: str, user: Yonetici, db: Db):
    """Terapisti kurucu programından çıkarır ve denetim kaydına yazar."""

    program_ayari(db, kilitle=True)
    founding = db.scalar(
        select(KurucuUye)
        .where(KurucuUye.uzman_id == uzman_id)
        .with_for_update()
    )
    if not founding:
        raise HTTPException(
            404, "Kurucu programında böyle bir üye bulunamadı."
        )
    kurucu_no = founding.kurucu_no
    db.delete(founding)
    denetle(
        db,
        "kurucu_programi.uye_cikar",
        user.id,
        f"{uzman_id}:{kurucu_no}",
    )
    db.commit()
    return {
        "program": program_ozeti(db),
        "cikarilan_uzman_id": uzman_id,
        "kurucu_no": kurucu_no,
    }


@router.get("/yonlendirmeler")
def yonlendirmeler(user: Yonetici, db: Db):
    """Danışan yönlendirme linkleri ve meslektaş kırılımlarını döner."""

    now = int(time.time())
    links = db.execute(
        select(DanisanYonlendirme, Uzman)
        .outerjoin(Uzman, Uzman.id == DanisanYonlendirme.yonlendiren_uzman_id)
        .order_by(DanisanYonlendirme.olusturma.desc())
    ).all()
    target_rows = db.execute(
        select(YonlendirmeHedefi, Uzman)
        .outerjoin(Uzman, Uzman.id == YonlendirmeHedefi.uzman_id)
        .order_by(YonlendirmeHedefi.sira.asc())
    ).all()
    click_rows = db.execute(
        select(
            YonlendirmeOlayi.yonlendirme_id,
            YonlendirmeOlayi.hedef_uzman_id,
            func.count(),
        )
        .where(YonlendirmeOlayi.olay == "profile_clicked_from_referral")
        .group_by(
            YonlendirmeOlayi.yonlendirme_id,
            YonlendirmeOlayi.hedef_uzman_id,
        )
    ).all()

    targets_by_link: dict[str, list[Uzman | None]] = defaultdict(list)
    target_ids_by_link: dict[str, list[str]] = defaultdict(list)
    profiles_map: dict[str, Uzman] = {}
    for _, creator in links:
        if creator:
            profiles_map[creator.id] = creator
    for target_row, target_profile in target_rows:
        targets_by_link[target_row.yonlendirme_id].append(target_profile)
        target_ids_by_link[target_row.yonlendirme_id].append(
            target_row.uzman_id
        )
        if target_profile:
            profiles_map[target_profile.id] = target_profile

    link_clicks: dict[str, int] = defaultdict(int)
    pair_clicks: dict[tuple[str, str], int] = defaultdict(int)
    for ref_id, target_id, cnt in click_rows:
        count_int = int(cnt)
        link_clicks[ref_id] += count_int
        if target_id:
            pair_clicks[(ref_id, target_id)] = count_int

    reason_counts: dict[str, int] = defaultdict(int)
    creator_stats: dict[str, dict] = {}
    recipient_stats: dict[str, dict] = {}
    active_links = 0
    total_views = 0
    total_target_placements = 0

    for link, creator in links:
        reason_counts[link.neden] += 1
        effective_status = (
            "expired"
            if link.durum == "active" and link.sure_bitimi <= now
            else link.durum
        )
        if effective_status == "active":
            active_links += 1
        total_views += link.goruntulenme_sayisi

        cid = link.yonlendiren_uzman_id
        if cid not in creator_stats:
            creator_stats[cid] = {
                "uzman": _uzman_ozeti(creator, cid),
                "link_sayisi": 0,
                "aktif_link_sayisi": 0,
                "toplam_goruntulenme": 0,
                "toplam_hedef_gosterimi": 0,
                "toplam_profil_tiklamasi": 0,
                "_targets": defaultdict(
                    lambda: {"sayi": 0, "tiklama_sayisi": 0}
                ),
            }
        entry = creator_stats[cid]
        entry["link_sayisi"] += 1
        if effective_status == "active":
            entry["aktif_link_sayisi"] += 1
        entry["toplam_goruntulenme"] += link.goruntulenme_sayisi
        entry["toplam_profil_tiklamasi"] += link_clicks.get(link.id, 0)

        for target_id in target_ids_by_link.get(link.id, []):
            total_target_placements += 1
            entry["toplam_hedef_gosterimi"] += 1
            clicks_on_target = pair_clicks.get((link.id, target_id), 0)
            entry["_targets"][target_id]["sayi"] += 1
            entry["_targets"][target_id]["tiklama_sayisi"] += clicks_on_target

            if target_id not in recipient_stats:
                recipient_stats[target_id] = {
                    "uzman": _uzman_ozeti(
                        profiles_map.get(target_id), target_id
                    ),
                    "alinan_yonlendirme_sayisi": 0,
                    "profil_tiklama_sayisi": 0,
                    "_sources": defaultdict(int),
                }
            rec = recipient_stats[target_id]
            rec["alinan_yonlendirme_sayisi"] += 1
            rec["profil_tiklama_sayisi"] += clicks_on_target
            rec["_sources"][cid] += 1

    creator_summary = []
    for data in creator_stats.values():
        target_breakdown = []
        for target_id, stats in data.pop("_targets").items():
            summary = _uzman_ozeti(profiles_map.get(target_id), target_id)
            target_breakdown.append(
                {
                    "uzman_id": target_id,
                    "ad": summary["ad"],
                    "kullanici_adi": summary["kullanici_adi"],
                    "sehir": summary["sehir"],
                    "sayi": stats["sayi"],
                    "tiklama_sayisi": stats["tiklama_sayisi"],
                }
            )
        target_breakdown.sort(
            key=lambda item: (
                -item["sayi"],
                -item["tiklama_sayisi"],
                item["ad"],
            )
        )
        data["hedefler"] = target_breakdown
        creator_summary.append(data)
    creator_summary.sort(
        key=lambda item: (
            -item["link_sayisi"],
            -item["toplam_hedef_gosterimi"],
            -item["toplam_goruntulenme"],
        )
    )

    recipient_summary = []
    for data in recipient_stats.values():
        sources = []
        for source_id, count in data.pop("_sources").items():
            summary = _uzman_ozeti(profiles_map.get(source_id), source_id)
            sources.append(
                {
                    "uzman_id": source_id,
                    "ad": summary["ad"],
                    "kullanici_adi": summary["kullanici_adi"],
                    "sayi": count,
                }
            )
        sources.sort(key=lambda item: (-item["sayi"], item["ad"]))
        data["yonlendirenler"] = sources
        recipient_summary.append(data)
    recipient_summary.sort(
        key=lambda item: (
            -item["alinan_yonlendirme_sayisi"],
            -item["profil_tiklama_sayisi"],
        )
    )

    denetle(db, "yonlendirmeler.listele", user.id)
    db.commit()
    return {
        "ozet": {
            "toplam_link": len(links),
            "aktif_link": active_links,
            "suresi_dolan_veya_kapali": len(links) - active_links,
            "yonlendiren_uzman_sayisi": len(creator_summary),
            "toplam_yonlendirilen_hedef": total_target_placements,
            "toplam_goruntulenme": total_views,
            "toplam_profil_tiklamasi": sum(link_clicks.values()),
        },
        "neden_dagilimi": [
            {"neden": reason, "sayi": cnt}
            for reason, cnt in sorted(
                reason_counts.items(), key=lambda item: (-item[1], item[0])
            )
        ],
        "uzman_ozetleri": creator_summary,
        "alan_uzman_ozetleri": recipient_summary,
        "linkler": [
            {
                "id": link.id,
                "neden": link.neden,
                "durum": (
                    "expired"
                    if link.durum == "active" and link.sure_bitimi <= now
                    else link.durum
                ),
                "olusturma": link.olusturma,
                "sure_bitimi": link.sure_bitimi,
                "goruntulenme_sayisi": link.goruntulenme_sayisi,
                "profil_tiklamasi": link_clicks.get(link.id, 0),
                "yonlendiren": _uzman_ozeti(
                    creator, link.yonlendiren_uzman_id
                ),
                "hedefler": [
                    {
                        **_uzman_ozeti(
                            profiles_map.get(tid),
                            tid,
                        ),
                        "tiklama_sayisi": pair_clicks.get((link.id, tid), 0),
                    }
                    for tid in target_ids_by_link.get(link.id, [])
                ],
            }
            for link, creator in links[:100]
        ],
    }


@router.delete("/davetler/{davet_id}", status_code=204)
def davet_iptal_et(davet_id: str, user: Yonetici, db: Db):
    """Bekleyen bir daveti yönetici yetkisiyle iptal eder."""

    invitation = db.get(Davet, davet_id, with_for_update=True)
    if not invitation:
        raise HTTPException(404, "Davet bulunamadı.")
    if invitation.durum != "pending":
        raise HTTPException(409, "Yalnız bekleyen davetler iptal edilebilir.")
    invitation.durum = "revoked"
    denetle(db, "davet.admin_iptal", user.id, invitation.id)
    db.commit()


@router.get("/referanslar")
def referanslar(user: Yonetici, db: Db):
    """Yalnız yöneticiye davet, kota ve öneri kaynaklarını gösterir."""

    now = int(time.time())
    inviter = aliased(Uzman)
    accepted = aliased(Uzman)
    invitation_rows = db.execute(
        select(Davet, inviter, accepted)
        .join(inviter, inviter.id == Davet.davet_eden_uzman_id)
        .outerjoin(accepted, accepted.id == Davet.kabul_eden_uzman_id)
        .order_by(Davet.olusturma.desc())
        .limit(100)
    ).all()

    all_invites = db.execute(
        select(Davet, inviter, accepted)
        .join(inviter, inviter.id == Davet.davet_eden_uzman_id)
        .outerjoin(accepted, accepted.id == Davet.kabul_eden_uzman_id)
    ).all()
    invite_counts = {
        "toplam_davet": 0,
        "bekleyen_davet": 0,
        "kabul_edilen_davet": 0,
        "suresi_dolan_davet": 0,
        "iptal_davet": 0,
    }
    inviter_stats: dict[str, dict] = {}
    for invitation, source, target in all_invites:
        invite_counts["toplam_davet"] += 1
        effective_status = (
            "expired"
            if invitation.durum == "pending" and invitation.sure_bitimi <= now
            else invitation.durum
        )
        if effective_status == "pending":
            invite_counts["bekleyen_davet"] += 1
        elif effective_status == "accepted":
            invite_counts["kabul_edilen_davet"] += 1
        elif effective_status == "expired":
            invite_counts["suresi_dolan_davet"] += 1
        elif effective_status == "revoked":
            invite_counts["iptal_davet"] += 1

        if source.id not in inviter_stats:
            inviter_stats[source.id] = {
                "uzman_id": source.id,
                "ad": source.ad,
                "kullanici_adi": source.kullanici_adi,
                "davet_limiti": source.davet_limiti,
                "toplam_gonderilen": 0,
                "kabul_edilen": 0,
                "bekleyen": 0,
                "kalan_hak": source.davet_limiti,
                "kabul_edenler": [],
            }
        entry = inviter_stats[source.id]
        entry["toplam_gonderilen"] += 1
        if effective_status == "accepted":
            entry["kabul_edilen"] += 1
            if target:
                entry["kabul_edenler"].append(
                    {"id": target.id, "ad": target.ad}
                )
        elif effective_status == "pending":
            entry["bekleyen"] += 1
        used = entry["kabul_edilen"] + entry["bekleyen"]
        entry["kalan_hak"] = max(source.davet_limiti - used, 0)

    giver = aliased(Uzman)
    receiver = aliased(Uzman)
    recommendation_rows = db.execute(
        select(Tavsiye, giver, receiver)
        .join(giver, giver.id == Tavsiye.veren_id)
        .join(receiver, receiver.id == Tavsiye.alan_id)
        .order_by(Tavsiye.olusturma.desc())
        .limit(100)
    ).all()
    total_recommendations = _sayim(
        db, select(func.count()).select_from(Tavsiye)
    )
    denetle(db, "referanslar.listele", user.id)
    db.commit()
    return {
        "ozet": {
            **invite_counts,
            "toplam_oneri": total_recommendations,
        },
        "davet_ozetleri": sorted(
            inviter_stats.values(),
            key=lambda item: (
                -item["kabul_edilen"],
                -item["toplam_gonderilen"],
                item["ad"],
            ),
        ),
        "davetler": [
            {
                "id": invitation.id,
                "davet_eden": {"id": source.id, "ad": source.ad},
                "davet_edilen": {
                    "id": target.id if target else None,
                    "ad": (target.ad if target else invitation.ad),
                    "email": invitation.email,
                },
                "uzmanlik": invitation.onerilen_uzmanlik,
                "durum": invitation.durum,
                "olusturma": invitation.olusturma,
            }
            for invitation, source, target in invitation_rows
        ],
        "oneriler": [
            {
                "veren": {"id": source.id, "ad": source.ad},
                "onerilen": {"id": target.id, "ad": target.ad},
                "uzmanlik": recommendation.uzmanlik,
                "olusturma": recommendation.olusturma,
            }
            for recommendation, source, target in recommendation_rows
        ],
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


@router.get("/moderasyon-raporlari")
def moderasyon_raporlari(
    user: Yonetici, db: Db, sayfa: Annotated[int, Query(ge=1)] = 1
):
    rows = list(
        db.scalars(
            select(ModerasyonRaporu)
            .order_by(
                (ModerasyonRaporu.durum == "open").desc(),
                ModerasyonRaporu.olusturma.desc(),
            )
            .offset((sayfa - 1) * 50)
            .limit(50)
        )
    )
    profiles = {
        profile.id: profile.ad
        for profile in db.scalars(
            select(Uzman).where(
                Uzman.id.in_(
                    {
                        profile_id
                        for report in rows
                        for profile_id in (
                            report.raporlayan_uzman_id,
                            report.hedef_uzman_id,
                        )
                    }
                )
            )
        )
    }
    denetle(db, "moderasyon.rapor_listele", user.id)
    db.commit()
    return [
        {
            "id": report.id,
            "tur": report.tur,
            "durum": report.durum,
            "aciklama": report.aciklama,
            "kaynak_id": report.kaynak_id,
            "olusturma": report.olusturma,
            "raporlayan": {
                "id": report.raporlayan_uzman_id,
                "ad": profiles.get(
                    report.raporlayan_uzman_id, "Arşivli profil"
                ),
            },
            "hedef": {
                "id": report.hedef_uzman_id,
                "ad": profiles.get(report.hedef_uzman_id, "Arşivli profil"),
            },
        }
        for report in rows
    ]


@router.patch("/moderasyon-raporlari/{report_id}")
def moderasyon_raporu_sonuclandir(
    report_id: str,
    body: ModerasyonDurumuGirdi,
    user: Yonetici,
    db: Db,
):
    report = db.get(ModerasyonRaporu, report_id, with_for_update=True)
    if not report:
        raise HTTPException(404, "Moderasyon raporu bulunamadı.")
    if report.durum != "open":
        raise HTTPException(
            409, "Moderasyon raporu daha önce sonuçlandırılmış."
        )
    report.durum = body.durum
    report.incelenme = int(time.time())
    report.inceleyen_kullanici_id = user.id
    denetle(db, "moderasyon.rapor_" + body.durum, user.id, report.id)
    db.commit()
    return {"id": report.id, "durum": report.durum}
