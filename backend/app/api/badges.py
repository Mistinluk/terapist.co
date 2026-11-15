"""Dış sitelerde kullanılabilen doğrulanmış terapist rozeti."""

import time
from base64 import b64encode
from pathlib import Path as FilePath
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path, Request
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import select

from app.config import get_settings
from app.models import (
    TerapistDogrulama,
    Uzman,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
)
from app.schemas import WebsiteRozetiCikti, WebsiteRozetiOzeti
from app.security import (
    AktifUzman,
    Db,
    DogrulanmisUzman,
    denetle,
    hiz_siniri,
    istemci,
)

router = APIRouter(tags=["Web sitesi rozeti"])
api_router = APIRouter(tags=["Web sitesi rozeti"])
settings = get_settings()
RozetKimligi = Annotated[UUID, Path()]
_WORDMARK_PATH = (
    FilePath(__file__).resolve().parent.parent
    / "assets"
    / "terapistco-wordmark.png"
)
_WORDMARK_DATA = b64encode(_WORDMARK_PATH.read_bytes()).decode("ascii")


def _dogrulanmis_rozet(db: Db, badge_id: UUID) -> tuple[WebsiteRozeti, Uzman]:
    row = db.execute(
        select(WebsiteRozeti, Uzman)
        .join(Uzman, Uzman.id == WebsiteRozeti.uzman_id)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            WebsiteRozeti.id == str(badge_id),
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    ).one_or_none()
    if not row:
        raise HTTPException(404, "Doğrulanmış terapist rozeti bulunamadı.")
    return row


def _rozet_ciktisi(badge: WebsiteRozeti, profile: Uzman) -> dict:
    base = settings.uygulama_adresi.rstrip("/")
    profile_url = f"{base}/{profile.kullanici_adi}"
    click_url = f"{base}/badge/{badge.id}/click"
    image_url = f"{base}/badge/{badge.id}.svg"
    embed = (
        f'<a href="{click_url}" target="_blank" '
        'rel="noopener noreferrer" '
        'aria-label="Terapist.co doğrulanmış terapist profilini aç">'
        f'<img src="{image_url}" '
        'alt="Terapist.co Doğrulanmış Terapist" width="280" height="72" '
        'style="display:block;width:100%;max-width:280px;height:auto;" '
        'loading="lazy" decoding="async" '
        'referrerpolicy="no-referrer"></a>'
    )
    return {
        "id": badge.id,
        "olusturma": badge.olusturma,
        "profil_url": profile_url,
        "pasaport_url": profile_url,
        "tiklama_url": click_url,
        "gorsel_url": image_url,
        "embed_code": embed,
    }


@api_router.get("/uzman/website-badge", response_model=WebsiteRozetiOzeti)
def kendi_rozeti(me: AktifUzman, db: Db):
    verified = db.scalar(
        select(TerapistDogrulama.id).where(
            TerapistDogrulama.uzman_id == me.id,
            TerapistDogrulama.durum == "verified",
        )
    )
    badge = db.scalar(
        select(WebsiteRozeti).where(WebsiteRozeti.uzman_id == me.id)
    )
    eligible = bool(me.onayli and not me.arsivli and verified)
    return {
        "uygun": eligible,
        "rozet": _rozet_ciktisi(badge, me) if eligible and badge else None,
    }


@api_router.post(
    "/uzman/website-badge",
    response_model=WebsiteRozetiCikti,
    status_code=201,
)
def rozet_olustur(me: DogrulanmisUzman, db: Db):
    badge = db.scalar(
        select(WebsiteRozeti)
        .where(WebsiteRozeti.uzman_id == me.id)
        .with_for_update()
    )
    if not badge:
        badge = WebsiteRozeti(uzman_id=me.id, olusturma=int(time.time()))
        db.add(badge)
        db.flush()
        db.add(
            WebsiteRozetiOlayi(
                rozet_id=badge.id,
                olay="badge_created",
                zaman=badge.olusturma,
            )
        )
        denetle(db, "badge_created", me.kullanici_id, badge.id)
        db.commit()
    return _rozet_ciktisi(badge, me)


@router.api_route("/badge/{badge_id}.svg", methods=["GET", "HEAD"])
def rozet_gorseli(badge_id: RozetKimligi, db: Db):
    _dogrulanmis_rozet(db, badge_id)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="72" '
        'viewBox="0 0 280 72" role="img" aria-labelledby="title desc">'
        '<title id="title">Terapist.co Doğrulanmış Terapist</title>'
        '<desc id="desc">Bu terapistin mesleki profili Terapist.co '
        "tarafından doğrulanmıştır.</desc>"
        '<rect x="1" y="1" width="278" height="70" rx="7" '
        'fill="#ffffff" stroke="#cbd7f4" stroke-width="2"/>'
        '<image x="14" y="20" width="126" height="32" '
        'preserveAspectRatio="xMidYMid meet" '
        f'href="data:image/png;base64,{_WORDMARK_DATA}"/>'
        '<line x1="151" y1="15" x2="151" y2="57" stroke="#dbe4f8"/>'
        '<circle cx="174" cy="27" r="10" fill="#eaf0ff"/>'
        '<path d="M169 27l3 3 6-7" fill="none" stroke="#3459d1" '
        'stroke-width="2.5" stroke-linecap="round" '
        'stroke-linejoin="round"/>'
        '<text x="190" y="25" fill="#17243a" '
        'font-family="Arial, sans-serif" font-size="11" '
        'font-weight="700">Doğrulanmış</text>'
        '<text x="190" y="41" fill="#526174" '
        'font-family="Arial, sans-serif" font-size="10">'
        "Terapist profili</text></svg>"
    )
    return Response(svg, media_type="image/svg+xml; charset=utf-8")


@router.get("/badge/{badge_id}/click")
def rozete_tikla(
    badge_id: RozetKimligi,
    request: Request,
    db: Db,
):
    hiz_siniri.kontrol("website-badge-click:" + istemci(request), 120, 3600)
    badge, profile = _dogrulanmis_rozet(db, badge_id)
    db.add(
        WebsiteRozetiOlayi(
            rozet_id=badge.id,
            olay="badge_clicked",
            zaman=int(time.time()),
        )
    )
    db.commit()
    return RedirectResponse(
        f"{settings.uygulama_adresi.rstrip('/')}/{profile.kullanici_adi}",
        status_code=303,
    )
