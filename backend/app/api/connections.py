"""Rızaya dayalı terapist bağlantı istekleri ve public mesleki ağ."""

import time

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.api.notifications import bildirim_ekle
from app.models import (
    BaglantiIliskiTuru,
    ProfesyonelBaglanti,
    Uzman,
    baglanti_cifti,
)
from app.schemas import BaglantiIstegiGirdi, BaglantiYanitGirdi
from app.security import (
    AktifUzman,
    Db,
    DogrulanmisUzman,
    denetle,
    hiz_siniri,
    istemci,
)
from app.services import profil_bul, uzmanlar_engelli

router = APIRouter(tags=["Mesleki bağlantılar"])


def _uzman_ciktisi(profile: Uzman) -> dict:
    return {"id": profile.id, "ad": profile.ad}


def _baglanti_ciktisi(
    db: Db, connection: ProfesyonelBaglanti, owner_id: str
) -> dict | None:
    other_id = (
        connection.alici_uzman_id
        if connection.isteyen_uzman_id == owner_id
        else connection.isteyen_uzman_id
    )
    other = db.get(Uzman, other_id)
    if not other or not other.onayli or other.arsivli:
        return None
    relation = db.get(BaglantiIliskiTuru, connection.iliski_turu)
    if not relation or not relation.aktif:
        return None
    return {
        "id": connection.id,
        "terapist": _uzman_ciktisi(other),
        "iliski_turu": relation.slug,
        "iliski_adi": relation.ad,
        "durum": connection.durum,
        "yon": (
            "outgoing"
            if connection.isteyen_uzman_id == owner_id
            else "incoming"
        ),
        "istek_zamani": connection.istek_zamani,
        "yanit_zamani": connection.yanit_zamani,
    }


def _listele(db: Db, owner_id: str, status: str) -> list[dict]:
    rows = list(
        db.scalars(
            select(ProfesyonelBaglanti)
            .where(
                ProfesyonelBaglanti.durum == status,
                or_(
                    ProfesyonelBaglanti.isteyen_uzman_id == owner_id,
                    ProfesyonelBaglanti.alici_uzman_id == owner_id,
                ),
            )
            .order_by(ProfesyonelBaglanti.istek_zamani.desc())
            .limit(100)
        )
    )
    return [
        item for row in rows if (item := _baglanti_ciktisi(db, row, owner_id))
    ]


@router.get("/baglanti-turleri")
def baglanti_turleri(db: Db):
    rows = db.scalars(
        select(BaglantiIliskiTuru)
        .where(
            BaglantiIliskiTuru.aktif.is_(True),
            BaglantiIliskiTuru.secilebilir.is_(True),
        )
        .order_by(BaglantiIliskiTuru.sira, BaglantiIliskiTuru.slug)
    )
    return [{"slug": row.slug, "ad": row.ad} for row in rows]


@router.get("/uzmanlar/{uzman_id}/baglantilar")
def public_baglantilar(uzman_id: str, request: Request, db: Db):
    hiz_siniri.kontrol("baglanti-public:" + istemci(request), 120, 60)
    profile = profil_bul(db, uzman_id)
    if not profile.mesleki_agi_goster:
        return {"toplam": 0, "baglantilar": []}
    connections = _listele(db, profile.id, "accepted")
    if not profile.davet_edeni_goster:
        connections = [
            item
            for item in connections
            if item["iliski_turu"] != "invited_to_platform"
        ]
    return {"toplam": len(connections), "baglantilar": connections}


@router.get("/uzmanlar/{uzman_id}/baglanti-durumu")
def baglanti_durumu(uzman_id: str, me: AktifUzman, db: Db):
    target = profil_bul(db, uzman_id)
    if target.id == me.id:
        return {"durum": "self", "baglanti": None}
    connection = db.scalar(
        select(ProfesyonelBaglanti).where(
            ProfesyonelBaglanti.cift_anahtari
            == baglanti_cifti(me.id, target.id)
        )
    )
    return {
        "durum": connection.durum if connection else "none",
        "baglanti": (
            _baglanti_ciktisi(db, connection, me.id) if connection else None
        ),
    }


@router.post("/uzmanlar/{uzman_id}/baglanti", status_code=201)
def baglanti_iste(
    uzman_id: str,
    body: BaglantiIstegiGirdi,
    request: Request,
    me: DogrulanmisUzman,
    db: Db,
):
    hiz_siniri.kontrol("baglanti-istek:" + me.id, 20, 24 * 60 * 60)
    hiz_siniri.kontrol("baglanti-istek-ip:" + istemci(request), 50, 60 * 60)
    target = profil_bul(db, uzman_id)
    if target.id == me.id:
        raise HTTPException(403, "Kendinizle mesleki bağlantı kuramazsınız.")
    if uzmanlar_engelli(db, me.id, target.id):
        raise HTTPException(403, "Bu terapistle etkileşim kuramazsınız.")
    relation = db.get(BaglantiIliskiTuru, body.iliski_turu)
    if not relation or not relation.aktif or not relation.secilebilir:
        raise HTTPException(422, "Geçerli bir ilişki türü seçin.")
    pair = baglanti_cifti(me.id, target.id)
    if db.scalar(
        select(ProfesyonelBaglanti.id).where(
            ProfesyonelBaglanti.cift_anahtari == pair
        )
    ):
        raise HTTPException(409, "Bu terapistle daha önce bağlantı kurulmuş.")
    connection = ProfesyonelBaglanti(
        isteyen_uzman_id=me.id,
        alici_uzman_id=target.id,
        cift_anahtari=pair,
        iliski_turu=relation.slug,
        durum="pending",
        istek_zamani=int(time.time()),
        yanit_zamani=None,
    )
    db.add(connection)
    db.flush()
    denetle(db, "baglanti.istek", me.kullanici_id, connection.id)
    if target.kullanici_id:
        bildirim_ekle(
            db,
            alici_kullanici_id=target.kullanici_id,
            gonderen_kullanici_id=me.kullanici_id,
            tur="sistem_hatirlatma",
            baslik="Yeni mesleki bağlantı isteği",
            mesaj=(
                f"{me.ad} sizinle '{relation.ad}' bağlamında "
                "mesleki bağlantı kurmak istiyor."
            ),
            hedef_yol="/panel?sekme=baglantilar",
            kaynak_anahtari=f"baglanti_istek:{connection.id}",
            now=connection.istek_zamani,
        )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "Bu terapistle daha önce bağlantı kurulmuş."
        ) from None
    return _baglanti_ciktisi(db, connection, me.id)


@router.get("/uzman/baglantilar")
def kendi_baglantilari(me: AktifUzman, db: Db):
    pending = _listele(db, me.id, "pending")
    return {
        "gelen_istekler": [
            item for item in pending if item["yon"] == "incoming"
        ],
        "gonderilen_istekler": [
            item for item in pending if item["yon"] == "outgoing"
        ],
        "baglantilar": _listele(db, me.id, "accepted"),
    }


@router.patch("/uzman/baglanti-istekleri/{baglanti_id}")
def baglanti_yanitla(
    baglanti_id: str,
    body: BaglantiYanitGirdi,
    me: DogrulanmisUzman,
    db: Db,
):
    connection = db.get(ProfesyonelBaglanti, baglanti_id, with_for_update=True)
    if not connection or connection.alici_uzman_id != me.id:
        raise HTTPException(404, "Bağlantı isteği bulunamadı.")
    if connection.durum != "pending":
        raise HTTPException(409, "Bu bağlantı isteği daha önce yanıtlanmış.")
    connection.durum = body.durum
    connection.yanit_zamani = int(time.time())
    if body.durum == "accepted":
        requester = db.get(Uzman, connection.isteyen_uzman_id)
        if requester and requester.kullanici_id:
            bildirim_ekle(
                db,
                alici_kullanici_id=requester.kullanici_id,
                gonderen_kullanici_id=me.kullanici_id,
                tur="sistem_hatirlatma",
                baslik="Mesleki bağlantı isteğiniz kabul edildi",
                mesaj=f"{me.ad} mesleki bağlantı isteğinizi kabul etti.",
                hedef_yol="/panel?sekme=baglantilar",
                kaynak_anahtari=f"baglanti_kabul:{connection.id}",
                now=connection.yanit_zamani,
            )
    denetle(
        db,
        "baglanti.kabul" if body.durum == "accepted" else "baglanti.reddet",
        me.kullanici_id,
        connection.id,
    )
    db.commit()
    return _baglanti_ciktisi(db, connection, me.id)
