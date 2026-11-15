"""Kısa profil adreslerinin arama motoru metaverisi ve uygulama kabuğu."""

import json
from html import escape

from fastapi import APIRouter
from fastapi.responses import (
    HTMLResponse,
    PlainTextResponse,
    RedirectResponse,
    Response,
)
from sqlalchemy import select

from app.api.profiles import public_profile
from app.config import get_settings
from app.models import TerapistDogrulama, Uzman
from app.security import Db

router = APIRouter(tags=["Açık profil sayfaları"])
settings = get_settings()


def _base_url() -> str:
    return settings.uygulama_adresi.rstrip("/")


def _verified_profile(db: Db, username: str) -> Uzman | None:
    return db.scalar(
        select(Uzman)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            Uzman.kullanici_adi == username,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )


def _profile_html(profile: Uzman) -> str:
    """React yüklenmeden önce gerçek profil bilgisini ve kanonik URL'yi sunar.

    Tek etkileşimli profil React'tir. Buradaki içerik JS kapalıyken okunabilir
    bir özet ve arama motoru için güvenli, doğrulanmış profil verisidir.
    """
    name = escape(profile.ad)
    title = escape(profile.unvan or "Terapist")
    location = escape(", ".join(filter(None, [profile.ilce, profile.sehir])))
    canonical = escape(f"{_base_url()}/{profile.kullanici_adi}", quote=True)
    description = (
        " ".join(profile.biyografi.split())[:160]
        or f"{profile.ad} mesleki profili ve görüşme bilgileri."
    )
    bio = escape(profile.biyografi)
    approaches = ", ".join(escape(value) for value in profile.ekoller)
    audiences = ", ".join(escape(value) for value in profile.kitle)
    specialties = ", ".join(escape(value) for value in profile.uzmanliklar)
    education = "".join(
        f"<li>{escape(value)}</li>" for value in profile.egitim
    )
    initial_profile = escape(
        json.dumps(
            public_profile(profile).model_dump(mode="json"),
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        quote=True,
    )
    raw_image = profile.profil_fotografi_url
    if raw_image.startswith("/api/medya/profil/"):
        raw_image = _base_url() + raw_image
    has_profile_image = raw_image.startswith(("https://", "http://"))
    effective_image = (
        raw_image
        if has_profile_image
        else f"{_base_url()}/brand/terapistco-og.png"
    )
    image_url = escape(effective_image, quote=True)
    secure_image = (
        f'<meta property="og:image:secure_url" content="{image_url}">'
        if effective_image.startswith("https://")
        else ""
    )
    image_dims = (
        '<meta property="og:image:width" content="1200">'
        '<meta property="og:image:height" content="630">'
        if not has_profile_image
        else ""
    )
    image = (
        f'<meta property="og:image" content="{image_url}">'
        f"{secure_image}{image_dims}"
        f'<meta property="og:image:alt" content="{name} · {title}">'
    )
    twitter_card = "summary" if has_profile_image else "summary_large_image"
    canonical_plain = f"{_base_url()}/{profile.kullanici_adi}"
    person_id = f"{canonical_plain}#person"
    knows_about = [
        item for item in [*profile.ekoller, *profile.uzmanliklar] if item
    ]
    person_node: dict = {
        "@type": "Person",
        "@id": person_id,
        "name": profile.ad,
        "jobTitle": profile.unvan or "Terapist",
        "description": description,
        "url": canonical_plain,
    }
    if has_profile_image:
        person_node["image"] = effective_image
    if knows_about:
        person_node["knowsAbout"] = knows_about
    if profile.egitim_universite:
        person_node["alumniOf"] = {
            "@type": "CollegeOrUniversity",
            "name": profile.egitim_universite,
        }
    if profile.sehir or profile.ilce:
        person_node["workLocation"] = {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": profile.ilce or profile.sehir,
                "addressRegion": profile.sehir or profile.ilce,
                "addressCountry": "TR",
            },
        }
    service_node: dict = {
        "@type": "ProfessionalService",
        "name": f"{profile.ad} · {profile.unvan or 'Terapist'}",
        "url": canonical_plain,
        "provider": {"@id": person_id},
        "areaServed": profile.sehir or "Türkiye",
    }
    if knows_about:
        service_node["serviceType"] = knows_about
    json_ld = json.dumps(
        {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "ProfilePage",
                    "url": canonical_plain,
                    "mainEntity": {"@id": person_id},
                },
                person_node,
                service_node,
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Ana Sayfa",
                            "item": f"{_base_url()}/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": "Terapistleri Keşfet",
                            "item": f"{_base_url()}/kesfet",
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": profile.ad,
                            "item": canonical_plain,
                        },
                    ],
                },
            ],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")
    assets = (
        '<link rel="stylesheet" href="/assets/app.css">'
        '<script type="module" src="/assets/app.js"></script>'
        if settings.ortam == "uretim"
        else '<script type="module" src="/react-preamble.js"></script>'
        '<script type="module" src="/@vite/client"></script>'
        '<script type="module" src="/src/main.tsx"></script>'
    )
    return f"""<!doctype html><html lang="tr"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{name} · {title} | terapist.co</title>
<meta name="description" content="{escape(description, quote=True)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="terapist.co">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="{name} · {title}">
<meta property="og:description" content="{escape(description, quote=True)}">
<meta property="og:url" content="{canonical}">{image}
<meta name="twitter:card" content="{twitter_card}">
<meta name="twitter:title" content="{name} · {title}">
<meta name="twitter:description" content="{escape(description, quote=True)}">
<meta name="twitter:image" content="{image_url}">
<script type="application/ld+json">{json_ld}</script>{assets}</head><body>
<div id="root" data-profile="{initial_profile}">
<main itemscope itemtype="https://schema.org/Person">
<h1 itemprop="name">{name}</h1><p itemprop="jobTitle">{title}</p>
<p itemprop="workLocation">{location}</p><p itemprop="description">{bio}</p>
<section><h2>Terapi yaklaşımları</h2><p>{approaches}</p></section>
<section><h2>Çalışma alanları</h2><p>{specialties}</p></section>
<section><h2>Çalıştığı danışan grupları</h2><p>{audiences}</p></section>
<section><h2>Eğitim</h2><ul>{education}</ul></section>
<p>Randevu talebi göndermek ve güncel uygun saatleri görmek için
JavaScript'i açın.</p>
</main></div></body></html>"""


@router.api_route("/passport/{username}", methods=["GET", "HEAD"])
def legacy_profile(username: str, db: Db):
    """Paylaşılmış eski bağlantıları kısa adrese taşır."""
    profile = _verified_profile(db, username)
    if not profile:
        return HTMLResponse(
            '<!doctype html><html lang="tr"><head><meta name="robots" '
            'content="noindex"><title>Profil bulunamadı · terapist.co</title>'
            "</head><body><h1>Profil bulunamadı</h1></body></html>",
            status_code=404,
        )
    return RedirectResponse(f"/{profile.kullanici_adi}", status_code=308)


@router.api_route("/uzman/{profile_id}", methods=["GET", "HEAD"])
def legacy_profile_id(profile_id: str, db: Db):
    profile = db.scalar(
        select(Uzman)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            Uzman.id == profile_id,
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
    )
    if not profile:
        return HTMLResponse(
            '<!doctype html><html lang="tr"><head><meta name="robots" '
            'content="noindex"><title>Profil bulunamadı · terapist.co</title>'
            "</head><body><h1>Profil bulunamadı</h1></body></html>",
            status_code=404,
        )
    return RedirectResponse(f"/{profile.kullanici_adi}", status_code=308)


SEO_STATIC_PATHS = (
    "",
    "/kesfet",
    "/karsilastirma",
    "/karsilastirma/terapistco-vs-linktree",
    "/karsilastirma/terapistco-vs-klasik-web-sitesi",
    "/karsilastirma/terapistco-vs-pazaryerleri",
    "/karsilastirma/terapistco-vs-calendly",
    "/karsilastirma/terapistco-vs-standart-bio-araclari",
    "/cozumler",
    "/cozumler/psikolog-link-in-bio",
    "/cozumler/online-terapi-randevu-takvimi",
    "/cozumler/sifreli-bdt-sema-formlari",
    "/cozumler/klinik-masa-qr-karti",
    "/cozumler/dogrulanmis-meslektas-agi",
    "/rehber",
    "/rehber/klinik-psikolog-dijital-kimlik",
    "/rehber/bdt-ve-sema-terapistleri-icin",
    "/rehber/cift-ve-emdr-terapistleri-icin",
    "/rehber/terapide-kvkk-ve-veri-minimasyonu",
    "/basvuru",
    "/aydinlatma",
)


@router.api_route("/sitemap.xml", methods=["GET", "HEAD"])
def sitemap(db: Db):
    usernames = db.scalars(
        select(Uzman.kullanici_adi)
        .join(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.durum == "verified",
        )
        .order_by(Uzman.kullanici_adi)
    )
    static_urls = "".join(
        f"<url><loc>{escape(_base_url())}{escape(path)}</loc></url>"
        for path in SEO_STATIC_PATHS
    )
    profile_urls = "".join(
        f"<url><loc>{escape(_base_url())}/{escape(username)}</loc></url>"
        for username in usernames
    )
    return Response(
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{static_urls}{profile_urls}</urlset>",
        media_type="application/xml",
    )


@router.api_route(
    "/robots.txt", methods=["GET", "HEAD"], response_class=PlainTextResponse
)
def robots():
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Disallow: /panel\n"
        "Disallow: /yonetim\n"
        "Disallow: /admin\n"
        "Disallow: /davet/\n"
        "Disallow: /r/\n"
        f"Sitemap: {_base_url()}/sitemap.xml\n"
    )


@router.api_route(
    "/{username}", methods=["GET", "HEAD"], response_class=HTMLResponse
)
def short_profile(username: str, db: Db):
    profile = _verified_profile(db, username)
    if not profile:
        return HTMLResponse(
            '<!doctype html><html lang="tr"><head><meta name="robots" '
            'content="noindex"><title>Profil bulunamadı · terapist.co</title>'
            "</head><body><h1>Profil bulunamadı</h1></body></html>",
            status_code=404,
        )
    return HTMLResponse(_profile_html(profile))
