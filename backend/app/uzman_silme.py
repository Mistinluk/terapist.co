"""Randevu geçmişi olmayan uzmanlar için denetlenen kalıcı silme.

Profil ve hesap aynı işlemde kaldırılır. Randevular (iptal edilenler dahil),
bekleme listesi, yazışma ve moderasyon geçmişi silinmez; bunlar varsa arşiv
kullanılmalıdır. Google bağlantısı önce normal bağlantı kesme akışıyla
kapatılır. Yabancı anahtarlar yeni bir ilişkiyi yakalarsa işlem geri alınır.
"""

import logging

from fastapi import HTTPException
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.media import eski_fotografi_sil
from app.models import (
    BeklemeListesiKaydi,
    Bildirim,
    DanisanYonlendirme,
    Davet,
    GoogleTakvimBaglantisi,
    Kullanici,
    KurucuUye,
    MesajKonusu,
    MeslektasUzmanlikIliskisi,
    ModerasyonRaporu,
    Oturum,
    ProfesyonelBaglanti,
    ProfilKaynagi,
    Randevu,
    Tavsiye,
    TerapistDogrulama,
    TrafikOlayi,
    Uzman,
    UzmanEngeli,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
    YonlendirmeHedefi,
    YonlendirmeOlayi,
)
from app.security import denetle

logger = logging.getLogger(__name__)


def silme_engelleri(
    db: Session, profile: Uzman, account: Kullanici
) -> list[str]:
    """Önizleme ve DELETE aynı kuralları kullanır; klinik veri okunmaz."""
    reasons = []
    if account.rol != "uzman":
        reasons.append("Yönetici hesapları bu işlemle silinemez.")
    checks = [
        (
            select(Randevu.id).where(Randevu.uzman_id == profile.id),
            "Randevu geçmişi var (iptal edilenler dahil). Arşivle kullanın.",
        ),
        (
            select(BeklemeListesiKaydi.id).where(
                BeklemeListesiKaydi.uzman_id == profile.id
            ),
            "Bekleme listesi kayıtları var. Arşivle kullanın.",
        ),
        (
            select(MesajKonusu.id).where(
                or_(
                    MesajKonusu.katilimci_a_id == account.id,
                    MesajKonusu.katilimci_b_id == account.id,
                )
            ),
            "Yazışma geçmişi var. Arşivle kullanın.",
        ),
        (
            select(ModerasyonRaporu.id).where(
                or_(
                    ModerasyonRaporu.raporlayan_uzman_id == profile.id,
                    ModerasyonRaporu.hedef_uzman_id == profile.id,
                )
            ),
            "Moderasyon geçmişi var. Arşivle kullanın.",
        ),
        (
            select(GoogleTakvimBaglantisi.id).where(
                GoogleTakvimBaglantisi.uzman_id == profile.id
            ),
            "Önce uzmanın Google Takvim bağlantısı kesilmelidir.",
        ),
    ]
    for query, message in checks:
        if db.scalar(query.limit(1)) is not None:
            reasons.append(message)
    return reasons


def kalici_sil(
    db: Session, profile: Uzman, account: Kullanici, yonetici_id: str
) -> None:
    """Kilitli profili siler; randevu kontrolü yazma anında tekrarlanır.

    Çağıran önce Uzman, sonra Kullanici satırını kilitler. Randevu oluşturma
    da aynı Uzman kilidini kullanır: önizlemeden sonra alınan bir randevu
    silmeyi engeller. FK denetimi yarışan diğer kayıtları korur. Denetim
    günlüğü korunur; yalnız rastgele kayıt kimlikleri içerir.
    """
    reasons = silme_engelleri(db, profile, account)
    if reasons:
        raise HTTPException(409, " ".join(reasons))
    profile_id, account_id = profile.id, account.id
    photos = {profile.profil_fotografi_url, profile.arka_plan_gorseli_url}
    referrals = select(DanisanYonlendirme.id).where(
        DanisanYonlendirme.yonlendiren_uzman_id == profile_id
    )
    badges = select(WebsiteRozeti.id).where(
        WebsiteRozeti.uzman_id == profile_id
    )
    try:
        db.execute(
            delete(YonlendirmeOlayi).where(
                YonlendirmeOlayi.yonlendirme_id.in_(referrals)
            )
        )
        db.execute(
            update(YonlendirmeOlayi)
            .where(YonlendirmeOlayi.hedef_uzman_id == profile_id)
            .values(hedef_uzman_id=None)
        )
        db.execute(
            delete(YonlendirmeHedefi).where(
                or_(
                    YonlendirmeHedefi.yonlendirme_id.in_(referrals),
                    YonlendirmeHedefi.uzman_id == profile_id,
                )
            )
        )
        db.execute(
            delete(DanisanYonlendirme).where(
                DanisanYonlendirme.yonlendiren_uzman_id == profile_id
            )
        )
        db.execute(
            delete(WebsiteRozetiOlayi).where(
                WebsiteRozetiOlayi.rozet_id.in_(badges)
            )
        )
        for model in (
            WebsiteRozeti,
            ProfilKaynagi,
            TerapistDogrulama,
            KurucuUye,
            TrafikOlayi,
        ):
            db.execute(delete(model).where(model.uzman_id == profile_id))
        for model, first, second in (
            (ProfesyonelBaglanti, "isteyen_uzman_id", "alici_uzman_id"),
            (Tavsiye, "veren_id", "alan_id"),
            (
                MeslektasUzmanlikIliskisi,
                "iliskilendiren_uzman_id",
                "hedef_uzman_id",
            ),
            (UzmanEngeli, "engelleyen_uzman_id", "engellenen_uzman_id"),
        ):
            db.execute(
                delete(model).where(
                    or_(
                        getattr(model, first) == profile_id,
                        getattr(model, second) == profile_id,
                    )
                )
            )
        db.execute(
            delete(Davet).where(Davet.davet_eden_uzman_id == profile_id)
        )
        db.execute(
            update(Davet)
            .where(Davet.kabul_eden_uzman_id == profile_id)
            .values(kabul_eden_uzman_id=None, durum="revoked")
        )
        db.execute(
            delete(Bildirim).where(Bildirim.alici_kullanici_id == account_id)
        )
        db.execute(
            update(Bildirim)
            .where(Bildirim.gonderen_kullanici_id == account_id)
            .values(gonderen_kullanici_id=None)
        )
        db.execute(delete(Oturum).where(Oturum.kullanici_id == account_id))
        db.delete(profile)
        db.flush()
        db.delete(account)
        denetle(db, "uzman.kalici_sil", yonetici_id, profile_id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409,
            "Uzmanın ilişkili kayıtları var. Kalıcı silme uygulanmadı; "
            "Arşivle kullanın.",
        ) from None
    # Dosya silme DB commit'inden sonra yapılır; rollback durumunda görsel
    # kaybolmaz. Başka bir profilin kullandığı veya harici URL silinmez.
    for url in photos - {""}:
        used = db.scalar(
            select(func.count())
            .select_from(Uzman)
            .where(
                or_(
                    Uzman.profil_fotografi_url == url,
                    Uzman.arka_plan_gorseli_url == url,
                )
            )
        )
        if not used:
            try:
                eski_fotografi_sil(url)
            except OSError:
                logger.warning(
                    "Silinen profilin medya temizliği tamamlanamadı."
                )
