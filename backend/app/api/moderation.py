"""Profil görünürlüğü, kullanıcı engelleri ve terapist raporları."""

import time

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import delete, or_, select, update

from app.models import (
    MeslektasUzmanlikIliskisi,
    ModerasyonRaporu,
    ProfesyonelBaglanti,
    Tavsiye,
    Uzman,
    UzmanEngeli,
)
from app.schemas import GorunurlukAyarlari, ModerasyonRaporGirdi
from app.security import AktifUzman, Db, denetle, hiz_siniri, istemci
from app.services import uzmanlar_engelli

router = APIRouter(tags=["Gizlilik ve moderasyon"])


def _gorunurluk(me: Uzman) -> dict:
    return {
        "davet_edeni_goster": me.davet_edeni_goster,
        "mesleki_agi_goster": me.mesleki_agi_goster,
        "uzmanlik_iliskilerini_goster": me.uzmanlik_iliskilerini_goster,
        "tavsiyeleri_goster": me.tavsiyeleri_goster,
        "yonlendirme_agini_goster": me.yonlendirme_agini_goster,
        "kurucu_durumunu_goster": me.kurucu_durumunu_goster,
    }


def _rapor_olustur(
    db: Db,
    me: Uzman,
    target_id: str,
    report_type: str,
    source_id: str,
    description: str,
) -> ModerasyonRaporu:
    duplicate = db.scalar(
        select(ModerasyonRaporu.id).where(
            ModerasyonRaporu.raporlayan_uzman_id == me.id,
            ModerasyonRaporu.tur == report_type,
            ModerasyonRaporu.kaynak_id == source_id,
            ModerasyonRaporu.durum == "open",
        )
    )
    if duplicate:
        raise HTTPException(409, "Bu kayıt daha önce incelemeye gönderildi.")
    report = ModerasyonRaporu(
        raporlayan_uzman_id=me.id,
        hedef_uzman_id=target_id,
        tur=report_type,
        kaynak_id=source_id,
        aciklama=description,
        durum="open",
        olusturma=int(time.time()),
        incelenme=None,
        inceleyen_kullanici_id=None,
    )
    db.add(report)
    db.flush()
    denetle(db, f"moderasyon.{report_type}.rapor", me.kullanici_id, report.id)
    db.commit()
    return report


@router.get("/uzman/gorunurluk")
def gorunurluk(me: AktifUzman):
    return _gorunurluk(me)


@router.put("/uzman/gorunurluk")
def gorunurluk_guncelle(body: GorunurlukAyarlari, me: AktifUzman, db: Db):
    for key, value in body.model_dump().items():
        setattr(me, key, value)
    denetle(db, "gizlilik.gorunurluk_guncelle", me.kullanici_id, me.id)
    db.commit()
    return _gorunurluk(me)


@router.get("/uzman/endorsementlar")
def endorsementlar(me: AktifUzman, db: Db):
    contributor = Uzman.__table__.alias("contributor")
    rows = db.execute(
        select(
            MeslektasUzmanlikIliskisi,
            contributor.c.id,
            contributor.c.ad,
        )
        .join(
            contributor,
            contributor.c.id
            == MeslektasUzmanlikIliskisi.iliskilendiren_uzman_id,
        )
        .where(MeslektasUzmanlikIliskisi.hedef_uzman_id == me.id)
        .order_by(
            MeslektasUzmanlikIliskisi.guncelleme.desc(),
            MeslektasUzmanlikIliskisi.id,
        )
    )
    return {
        "endorsementlar": [
            {
                "id": association.id,
                "uzmanlik": association.uzmanlik,
                "profesyonel_baglam": association.profesyonel_baglam,
                "meslektas": {"id": contributor_id, "ad": contributor_name},
            }
            for association, contributor_id, contributor_name in rows
        ]
    }


@router.delete("/uzman/endorsementlar/{association_id}", status_code=204)
def endorsement_kaldir(association_id: str, me: AktifUzman, db: Db):
    association = db.get(MeslektasUzmanlikIliskisi, association_id)
    if not association or association.hedef_uzman_id != me.id:
        raise HTTPException(404, "Alan ilişkilendirmesi bulunamadı.")
    db.delete(association)
    denetle(
        db, "moderasyon.endorsement_kaldir", me.kullanici_id, association_id
    )
    db.commit()
    return Response(status_code=204)


@router.post("/uzman/baglantilar/{connection_id}/rapor", status_code=201)
def baglanti_raporla(
    connection_id: str,
    body: ModerasyonRaporGirdi,
    request: Request,
    me: AktifUzman,
    db: Db,
):
    hiz_siniri.kontrol("connection-report:" + me.id, 20, 24 * 60 * 60)
    hiz_siniri.kontrol("connection-report-ip:" + istemci(request), 50, 3600)
    connection = db.get(ProfesyonelBaglanti, connection_id)
    if not connection or me.id not in {
        connection.isteyen_uzman_id,
        connection.alici_uzman_id,
    }:
        raise HTTPException(404, "Mesleki bağlantı bulunamadı.")
    target_id = (
        connection.alici_uzman_id
        if connection.isteyen_uzman_id == me.id
        else connection.isteyen_uzman_id
    )
    report = _rapor_olustur(
        db, me, target_id, "connection", connection.id, body.aciklama
    )
    return {"id": report.id, "durum": report.durum}


@router.post("/uzman/endorsementlar/{association_id}/rapor", status_code=201)
def yanlis_iliski_raporla(
    association_id: str,
    body: ModerasyonRaporGirdi,
    request: Request,
    me: AktifUzman,
    db: Db,
):
    hiz_siniri.kontrol("endorsement-report:" + me.id, 20, 24 * 60 * 60)
    hiz_siniri.kontrol("endorsement-report-ip:" + istemci(request), 50, 3600)
    association = db.get(MeslektasUzmanlikIliskisi, association_id)
    if not association or association.hedef_uzman_id != me.id:
        raise HTTPException(404, "Alan ilişkilendirmesi bulunamadı.")
    report = _rapor_olustur(
        db,
        me,
        association.iliskilendiren_uzman_id,
        "false_relationship",
        association.id,
        body.aciklama,
    )
    return {"id": report.id, "durum": report.durum}


@router.get("/uzman/engeller")
def engeller(me: AktifUzman, db: Db):
    rows = db.execute(
        select(UzmanEngeli, Uzman)
        .join(Uzman, Uzman.id == UzmanEngeli.engellenen_uzman_id)
        .where(UzmanEngeli.engelleyen_uzman_id == me.id)
        .order_by(Uzman.ad, Uzman.id)
    )
    return {
        "engeller": [
            {
                "terapist": {"id": profile.id, "ad": profile.ad},
                "olusturma": block.olusturma,
            }
            for block, profile in rows
        ]
    }


@router.post("/uzman/engeller/{uzman_id}", status_code=201)
def uzman_engelle(uzman_id: str, me: AktifUzman, db: Db):
    target = db.get(Uzman, uzman_id)
    if not target or target.arsivli:
        raise HTTPException(404, "Terapist bulunamadı.")
    if target.id == me.id:
        raise HTTPException(403, "Kendinizi engelleyemezsiniz.")
    if uzmanlar_engelli(db, me.id, target.id):
        raise HTTPException(409, "Bu terapistle aranızda zaten engel var.")
    db.add(
        UzmanEngeli(
            engelleyen_uzman_id=me.id,
            engellenen_uzman_id=target.id,
            olusturma=int(time.time()),
        )
    )
    pair = or_(
        (ProfesyonelBaglanti.isteyen_uzman_id == me.id)
        & (ProfesyonelBaglanti.alici_uzman_id == target.id),
        (ProfesyonelBaglanti.isteyen_uzman_id == target.id)
        & (ProfesyonelBaglanti.alici_uzman_id == me.id),
    )
    db.execute(
        update(ProfesyonelBaglanti)
        .where(pair, ProfesyonelBaglanti.durum.in_(["pending", "accepted"]))
        .values(durum="revoked", yanit_zamani=int(time.time()))
    )
    db.execute(
        delete(MeslektasUzmanlikIliskisi).where(
            or_(
                (MeslektasUzmanlikIliskisi.iliskilendiren_uzman_id == me.id)
                & (MeslektasUzmanlikIliskisi.hedef_uzman_id == target.id),
                (
                    MeslektasUzmanlikIliskisi.iliskilendiren_uzman_id
                    == target.id
                )
                & (MeslektasUzmanlikIliskisi.hedef_uzman_id == me.id),
            )
        )
    )
    db.execute(
        delete(Tavsiye).where(
            or_(
                (Tavsiye.veren_id == me.id) & (Tavsiye.alan_id == target.id),
                (Tavsiye.veren_id == target.id) & (Tavsiye.alan_id == me.id),
            )
        )
    )
    denetle(db, "moderasyon.uzman_engelle", me.kullanici_id, target.id)
    db.commit()
    return {"terapist": {"id": target.id, "ad": target.ad}}


@router.delete("/uzman/engeller/{uzman_id}", status_code=204)
def engeli_kaldir(uzman_id: str, me: AktifUzman, db: Db):
    block = db.get(UzmanEngeli, (me.id, uzman_id))
    if not block:
        raise HTTPException(404, "Engel bulunamadı.")
    db.delete(block)
    denetle(db, "moderasyon.engel_kaldir", me.kullanici_id, uzman_id)
    db.commit()
    return Response(status_code=204)
