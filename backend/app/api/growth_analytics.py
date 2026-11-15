"""Terapistin aksiyon odaklı mesleki büyüme özeti."""

import time

from fastapi import APIRouter
from sqlalchemy import func, or_, select

from app.models import (
    DanisanYonlendirme,
    Davet,
    ProfesyonelBaglanti,
    Tavsiye,
    YonlendirmeOlayi,
)
from app.security import AktifUzman, Db

router = APIRouter(tags=["Büyüme analitiği"])


def _sayim(model, *conditions):
    return (
        select(func.count())
        .select_from(model)
        .where(*conditions)
        .scalar_subquery()
    )


@router.get("/uzman/buyume-analitigi")
def buyume_analitigi(me: AktifUzman, db: Db):
    """Kişisel veri toplamadan yönetilebilir toplamları döndürür."""
    now = int(time.time())
    result = db.execute(
        select(
            _sayim(
                ProfesyonelBaglanti,
                ProfesyonelBaglanti.durum == "accepted",
                or_(
                    ProfesyonelBaglanti.isteyen_uzman_id == me.id,
                    ProfesyonelBaglanti.alici_uzman_id == me.id,
                ),
            ).label("baglanti_toplam"),
            _sayim(
                ProfesyonelBaglanti,
                ProfesyonelBaglanti.durum == "pending",
                ProfesyonelBaglanti.alici_uzman_id == me.id,
            ).label("bekleyen_baglanti"),
            _sayim(
                Davet,
                Davet.davet_eden_uzman_id == me.id,
            ).label("davet_toplam"),
            _sayim(
                Davet,
                Davet.davet_eden_uzman_id == me.id,
                Davet.durum == "accepted",
            ).label("davet_kabul"),
            _sayim(
                Davet,
                Davet.davet_eden_uzman_id == me.id,
                Davet.durum == "pending",
                Davet.sure_bitimi > now,
            ).label("davet_bekleyen"),
            _sayim(
                Davet,
                Davet.davet_eden_uzman_id == me.id,
                or_(
                    Davet.durum == "accepted",
                    (Davet.durum == "pending") & (Davet.sure_bitimi > now),
                ),
            ).label("davet_kullanilan"),
            _sayim(
                DanisanYonlendirme,
                DanisanYonlendirme.yonlendiren_uzman_id == me.id,
            ).label("yonlendirme_toplam"),
            _sayim(
                DanisanYonlendirme,
                DanisanYonlendirme.yonlendiren_uzman_id == me.id,
                DanisanYonlendirme.durum == "active",
                DanisanYonlendirme.sure_bitimi > now,
            ).label("yonlendirme_aktif"),
            (
                select(func.count())
                .select_from(YonlendirmeOlayi)
                .join(
                    DanisanYonlendirme,
                    DanisanYonlendirme.id == YonlendirmeOlayi.yonlendirme_id,
                )
                .where(
                    DanisanYonlendirme.yonlendiren_uzman_id == me.id,
                    YonlendirmeOlayi.olay == "profile_clicked_from_referral",
                )
                .scalar_subquery()
                .label("profil_tiklama")
            ),
            _sayim(Tavsiye, Tavsiye.veren_id == me.id).label("tavsiye_toplam"),
        )
    ).one()

    return {
        "baglantilar": {
            "toplam": result.baglanti_toplam,
            "bekleyen_istekler": result.bekleyen_baglanti,
        },
        "davetler": {
            "gonderilen": result.davet_toplam,
            "kabul_edilen": result.davet_kabul,
            "bekleyen": result.davet_bekleyen,
            "kalan_hak": max(me.davet_limiti - result.davet_kullanilan, 0),
        },
        "yonlendirmeler": {
            "olusturulan_baglanti": result.yonlendirme_toplam,
            "aktif_baglanti": result.yonlendirme_aktif,
            "profil_tiklamalari": result.profil_tiklama,
        },
        "tavsiyeler": {"onerilen_terapist": result.tavsiye_toplam},
    }
