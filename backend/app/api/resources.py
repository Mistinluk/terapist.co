"""Açık profil kaynakları, şifreli/zamanlı bağlantılar ve medya gömme."""

import re
import time
from urllib.parse import parse_qs, urlsplit

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select, update

from app.models import ProfilKaynagi, TerapistDogrulama, Uzman
from app.schemas import (
    KaynakAcCikti,
    KaynakAcGirdi,
    KaynakCikti,
    KaynakGirdi,
    KaynakSirasiGirdi,
)
from app.security import (
    AktifUzman,
    Db,
    denetle,
    hiz_siniri,
    istemci,
    parolalar,
)

router = APIRouter(tags=["Profil kaynakları"])

_YT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_SPOTIFY_ID_RE = re.compile(r"^[A-Za-z0-9]{10,40}$")
_SPOTIFY_KINDS = {"track", "episode", "show", "playlist", "album"}


def _medya_cozumle(url: str, medya_gomme: bool) -> tuple[str, str | None]:
    """Desteklenen YouTube/Spotify linklerinden güvenli embed URL üretir."""
    if not medya_gomme:
        return "none", None
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower()
    parts = [p for p in parsed.path.split("/") if p]

    if host in {"youtu.be"} and parts and _YT_ID_RE.fullmatch(parts[0]):
        return (
            "youtube",
            f"https://www.youtube-nocookie.com/embed/{parts[0]}",
        )

    if host in {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
    }:
        video_id = None
        if parts == ["watch"]:
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif len(parts) >= 2 and parts[0] in {"embed", "shorts", "live"}:
            video_id = parts[1]
        if video_id and _YT_ID_RE.fullmatch(video_id):
            return (
                "youtube",
                f"https://www.youtube-nocookie.com/embed/{video_id}",
            )

    if host == "open.spotify.com" and parts:
        cleaned = (
            parts[1:]
            if parts[0].startswith("intl-") and len(parts) >= 3
            else parts
        )
        if len(cleaned) >= 2 and cleaned[0] == "embed":
            cleaned = cleaned[1:]
        if (
            len(cleaned) >= 2
            and cleaned[0] in _SPOTIFY_KINDS
            and _SPOTIFY_ID_RE.fullmatch(cleaned[1])
        ):
            return (
                "spotify",
                f"https://open.spotify.com/embed/{cleaned[0]}/{cleaned[1]}",
            )

    return "none", None


def _zaman_durumu(row: ProfilKaynagi, now: int) -> str:
    if row.baslangic_zamani is not None and now < row.baslangic_zamani:
        return "planli"
    if row.bitis_zamani is not None and now >= row.bitis_zamani:
        return "suresi_doldu"
    return "aktif"


def _row(
    row: ProfilKaynagi, *, public: bool = False, now: int = 0
) -> KaynakCikti:
    now_ts = now or int(time.time())
    locked = bool(row.sifre_ozeti)
    redact = public and locked
    return KaynakCikti(
        id=row.id,
        baslik=row.baslik,
        aciklama=row.aciklama,
        url="" if redact else row.url,
        kategori=row.kategori,  # type: ignore[arg-type]
        sira=row.sira,
        tiklama_sayisi=row.tiklama_sayisi,
        olusturma=row.olusturma,
        vurgulu=bool(row.vurgulu),
        vurgu_etiketi=row.vurgu_etiketi or "",
        baslangic_zamani=row.baslangic_zamani,
        bitis_zamani=row.bitis_zamani,
        kilitli=locked,
        zaman_durumu=_zaman_durumu(row, now_ts),  # type: ignore[arg-type]
        medya_turu=row.medya_turu,  # type: ignore[arg-type]
        medya_embed_url=None if redact else row.medya_embed_url,
    )


def _owner_resource(db: Db, resource_id: str, owner_id: str) -> ProfilKaynagi:
    row = db.scalar(
        select(ProfilKaynagi).where(
            ProfilKaynagi.id == resource_id,
            ProfilKaynagi.uzman_id == owner_id,
        )
    )
    if not row:
        raise HTTPException(404, "Kaynak bulunamadı.")
    return row


def _public_resource_query(resource_id: str):
    return (
        select(ProfilKaynagi)
        .join(Uzman, Uzman.id == ProfilKaynagi.uzman_id)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            ProfilKaynagi.id == resource_id,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )


@router.get("/uzmanlar/{uzman_id}/kaynaklar", response_model=list[KaynakCikti])
def public_resources(uzman_id: str, request: Request, db: Db):
    hiz_siniri.kontrol("kaynak-liste:" + istemci(request), 120, 60)
    visible = db.scalar(
        select(Uzman.id)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            Uzman.id == uzman_id,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )
    if not visible:
        raise HTTPException(404, "Uzman bulunamadı.")
    now = int(time.time())
    rows = db.scalars(
        select(ProfilKaynagi)
        .where(ProfilKaynagi.uzman_id == uzman_id)
        .order_by(
            ProfilKaynagi.vurgulu.desc(),
            ProfilKaynagi.sira,
            ProfilKaynagi.olusturma,
            ProfilKaynagi.id,
        )
        .limit(20)
    )
    return [
        _row(row, public=True, now=now)
        for row in rows
        if _zaman_durumu(row, now) == "aktif"
    ]


@router.get("/uzman/kaynaklar", response_model=list[KaynakCikti])
def own_resources(me: AktifUzman, db: Db):
    now = int(time.time())
    rows = db.scalars(
        select(ProfilKaynagi)
        .where(ProfilKaynagi.uzman_id == me.id)
        .order_by(
            ProfilKaynagi.sira, ProfilKaynagi.olusturma, ProfilKaynagi.id
        )
    )
    return [_row(row, public=False, now=now) for row in rows]


@router.post("/uzman/kaynaklar", response_model=KaynakCikti, status_code=201)
def create_resource(
    body: KaynakGirdi, request: Request, me: AktifUzman, db: Db
):
    hiz_siniri.kontrol("kaynak-ekle:" + me.id, 30, 24 * 60 * 60)
    hiz_siniri.kontrol("kaynak-ekle-ip:" + istemci(request), 60, 60 * 60)
    db.refresh(me, with_for_update=True)
    positions = list(
        db.scalars(
            select(ProfilKaynagi.sira).where(ProfilKaynagi.uzman_id == me.id)
        )
    )
    if len(positions) >= 20:
        raise HTTPException(422, "Bir profilde en fazla 20 kaynak olabilir.")
    medya_turu, embed_url = _medya_cozumle(body.url, body.medya_gomme)
    sifre_ozeti = (
        parolalar.hash(body.erisim_kodu) if body.erisim_kodu else None
    )
    row = ProfilKaynagi(
        uzman_id=me.id,
        baslik=body.baslik,
        aciklama=body.aciklama,
        url=body.url,
        kategori=body.kategori,
        vurgulu=body.vurgulu,
        vurgu_etiketi=body.vurgu_etiketi if body.vurgulu else "",
        baslangic_zamani=body.baslangic_zamani,
        bitis_zamani=body.bitis_zamani,
        sifre_ozeti=sifre_ozeti,
        medya_turu=medya_turu,
        medya_embed_url=embed_url,
        sira=max(positions, default=-1) + 1,
        olusturma=int(time.time()),
    )
    db.add(row)
    db.flush()
    denetle(db, "kaynak.ekle", me.kullanici_id, row.id)
    db.commit()
    return _row(row)


@router.patch("/uzman/kaynaklar/sira", status_code=204)
def reorder_resources(body: KaynakSirasiGirdi, me: AktifUzman, db: Db):
    rows = list(
        db.scalars(
            select(ProfilKaynagi)
            .where(ProfilKaynagi.uzman_id == me.id)
            .with_for_update()
        )
    )
    if len(body.ids) != len(rows) or set(body.ids) != {row.id for row in rows}:
        raise HTTPException(
            422, "Kaynak sırası güncel değil. Sayfayı yenileyin."
        )
    by_id = {row.id: row for row in rows}
    for index, resource_id in enumerate(body.ids):
        by_id[resource_id].sira = index
    denetle(db, "kaynak.sirala", me.kullanici_id, me.id)
    db.commit()


@router.patch("/uzman/kaynaklar/{resource_id}", response_model=KaynakCikti)
def update_resource(
    resource_id: str, body: KaynakGirdi, me: AktifUzman, db: Db
):
    row = _owner_resource(db, resource_id, me.id)
    medya_turu, embed_url = _medya_cozumle(body.url, body.medya_gomme)
    row.baslik = body.baslik
    row.aciklama = body.aciklama
    row.url = body.url
    row.kategori = body.kategori
    row.vurgulu = body.vurgulu
    row.vurgu_etiketi = body.vurgu_etiketi if body.vurgulu else ""
    row.baslangic_zamani = body.baslangic_zamani
    row.bitis_zamani = body.bitis_zamani
    row.medya_turu = medya_turu
    row.medya_embed_url = embed_url
    if body.kilidi_kaldir:
        row.sifre_ozeti = None
    elif body.erisim_kodu:
        row.sifre_ozeti = parolalar.hash(body.erisim_kodu)
    denetle(db, "kaynak.guncelle", me.kullanici_id, resource_id)
    db.commit()
    return _row(row)


@router.delete("/uzman/kaynaklar/{resource_id}", status_code=204)
def delete_resource(resource_id: str, me: AktifUzman, db: Db):
    row = _owner_resource(db, resource_id, me.id)
    db.delete(row)
    denetle(db, "kaynak.kaldir", me.kullanici_id, resource_id)
    db.commit()


@router.get("/kaynaklar/{resource_id}/ac")
def open_resource(resource_id: str, request: Request, db: Db):
    hiz_siniri.kontrol("kaynak-ac:" + istemci(request), 120, 60)
    row = db.scalar(_public_resource_query(resource_id))
    if not row:
        raise HTTPException(404, "Kaynak bulunamadı.")
    now = int(time.time())
    if _zaman_durumu(row, now) != "aktif":
        raise HTTPException(404, "Bu kaynak şu anda yayında değil.")
    if row.sifre_ozeti:
        raise HTTPException(403, "Bu bağlantı erişim kodu ile korunmaktadır.")
    # İstemci kimliği saklanmaz; yalnız toplu tıklama sayısı artar.
    db.execute(
        update(ProfilKaynagi)
        .where(ProfilKaynagi.id == row.id)
        .values(tiklama_sayisi=ProfilKaynagi.tiklama_sayisi + 1)
    )
    db.commit()
    return RedirectResponse(row.url, status_code=302)


@router.post("/kaynaklar/{resource_id}/ac", response_model=KaynakAcCikti)
def unlock_resource(
    resource_id: str,
    body: KaynakAcGirdi,
    request: Request,
    db: Db,
):
    hiz_siniri.kontrol(
        f"kaynak-kilit:{istemci(request)}:{resource_id}", 12, 900
    )
    row = db.scalar(_public_resource_query(resource_id))
    if not row:
        raise HTTPException(404, "Kaynak bulunamadı.")
    now = int(time.time())
    if _zaman_durumu(row, now) != "aktif":
        raise HTTPException(404, "Bu kaynak şu anda yayında değil.")
    if row.sifre_ozeti and not parolalar.verify(body.kod, row.sifre_ozeti):
        raise HTTPException(403, "Erişim kodu hatalı.")
    db.execute(
        update(ProfilKaynagi)
        .where(ProfilKaynagi.id == row.id)
        .values(tiklama_sayisi=ProfilKaynagi.tiklama_sayisi + 1)
    )
    db.commit()
    return KaynakAcCikti(
        id=row.id,
        url=row.url,
        medya_turu=row.medya_turu,  # type: ignore[arg-type]
        medya_embed_url=row.medya_embed_url,
    )
