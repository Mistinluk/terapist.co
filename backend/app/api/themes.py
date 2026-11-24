"""Özel tema, marka rengi (white-label), tipografi ve CSP stil uç noktaları."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models import Uzman
from app.schemas import TemaAyarlariCikti, TemaAyarlariGirdi
from app.security import AktifUzman, Db, denetle
from app.services import profil_bul

router = APIRouter(tags=["Tema ve Markalaşma"])

TEMA_PALETLERI: dict[str, dict[str, str]] = {
    "klasik": {
        "accent": "#3459d1",
        "dark": "#233fa1",
        "soft": "#edf3ff",
        "border": "#d7e3fb",
        "bg": "#f5f8ff",
    },
    "toprak": {
        "accent": "#b45309",
        "dark": "#78350f",
        "soft": "#fef3c7",
        "border": "#fde68a",
        "bg": "#fdf8ec",
    },
    "orman": {
        "accent": "#15803d",
        "dark": "#14532d",
        "soft": "#dcfce7",
        "border": "#bbf7d0",
        "bg": "#f2faf4",
    },
    "okyanus": {
        "accent": "#0e7490",
        "dark": "#155e75",
        "soft": "#cffafe",
        "border": "#a5f3fc",
        "bg": "#f1fafc",
    },
    "gece": {
        "accent": "#1e293b",
        "dark": "#0f172a",
        "soft": "#f1f5f9",
        "border": "#cbd5e1",
        "bg": "#f5f7fa",
    },
    "lavanta": {
        "accent": "#6d28d9",
        "dark": "#4c1d95",
        "soft": "#ede9fe",
        "border": "#ddd6fe",
        "bg": "#f7f5ff",
    },
    "kizilcik": {
        "accent": "#9f1239",
        "dark": "#881337",
        "soft": "#ffe4e6",
        "border": "#fecdd3",
        "bg": "#fff5f6",
    },
    "ada_cayi": {
        "accent": "#3f6212",
        "dark": "#365314",
        "soft": "#ecfccb",
        "border": "#d9f99d",
        "bg": "#f7fae9",
    },
}

_SANS_STACK = (
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
)
_SERIF_STACK = (
    'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
)

FONT_HARITASI: dict[str, tuple[str, str]] = {
    "modern_sans": (_SANS_STACK, _SANS_STACK),
    "editoryal_serif": (
        _SERIF_STACK,
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ),
    "humanist_sakin": (
        '"Avenir Next", "Nunito Sans", "Segoe UI", "Trebuchet MS", sans-serif',
        '"Avenir", "Segoe UI", "Helvetica Neue", sans-serif',
    ),
    "geometrik_net": (
        '"SF Pro Display", "Avenir Next", "Segoe UI", sans-serif',
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    ),
}

BUTON_YARICAPLARI: dict[str, str] = {
    "yuvarlak": "14px",
    "yastik": "999px",
    "keskin": "6px",
    "cerceveli": "10px",
    "yumusak_golge": "16px",
    "cam_efekti": "18px",
}


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    cleaned = hex_color.lstrip("#")
    return (
        int(cleaned[0:2], 16),
        int(cleaned[2:4], 16),
        int(cleaned[4:6], 16),
    )


def _rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    r, g, b = (max(0, min(255, c)) for c in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def _blend(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float):
    return (
        round(c1[0] + (c2[0] - c1[0]) * t),
        round(c1[1] + (c2[1] - c1[1]) * t),
        round(c1[2] + (c2[2] - c1[2]) * t),
    )


def _relative_luminance(rgb: tuple[int, int, int]) -> float:
    def ch(v: int) -> float:
        s = v / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def _contrast_ink(hex_color: str) -> str:
    lum = _relative_luminance(_hex_to_rgb(hex_color))
    # WCAG kontrast eşiği: açık tonlarda koyu metin, koyu tonlarda beyaz
    return "#0f172a" if lum > 0.38 else "#ffffff"


def _premium_yetkisi(profile: Uzman) -> bool:
    return bool(profile.ozel_tema_yetkisi or profile.kurucu_no is not None)


def tema_ozeti(profile: Uzman) -> TemaAyarlariCikti:
    premium = _premium_yetkisi(profile)
    effective_style = (
        profile.tema_stili
        if premium or profile.tema_stili != "ozel"
        else "klasik"
    )
    hide_brand = bool(premium and profile.terapistco_markasi_gizli)
    return TemaAyarlariCikti(
        bekleme_listesi_acik=bool(profile.bekleme_listesi_acik),
        tasarim_tarzi=profile.tasarim_tarzi or "klinik_modern",  # type: ignore[arg-type]
        tema_stili=effective_style,  # type: ignore[arg-type]
        vurgu_rengi=profile.vurgu_rengi or "#3459d1",
        buton_stili=profile.buton_stili or "yuvarlak",  # type: ignore[arg-type]
        yazi_tipi=profile.yazi_tipi or "modern_sans",  # type: ignore[arg-type]
        yuzey_stili=profile.yuzey_stili or "temiz",  # type: ignore[arg-type]
        arka_plan_gorseli_url=profile.arka_plan_gorseli_url or "",
        terapistco_markasi_gizli=bool(profile.terapistco_markasi_gizli),
        ozel_tema_yetkisi=bool(profile.ozel_tema_yetkisi),
        premium_etkin=premium,
        marka_gizleme_etkin=hide_brand,
    )


def _css_olustur(profile: Uzman) -> str:
    summary = tema_ozeti(profile)
    radius = BUTON_YARICAPLARI.get(summary.buton_stili, "14px")
    font_heading, font_body = FONT_HARITASI.get(
        summary.yazi_tipi, FONT_HARITASI["modern_sans"]
    )
    if summary.tema_stili == "ozel" and summary.premium_etkin:
        accent = summary.vurgu_rengi
        rgb = _hex_to_rgb(accent)
        dark = _rgb_to_hex(_blend(rgb, (15, 23, 42), 0.28))
        soft = _rgb_to_hex(_blend(rgb, (255, 255, 255), 0.90))
        border = _rgb_to_hex(_blend(rgb, (255, 255, 255), 0.72))
        bg_soft = _rgb_to_hex(_blend(rgb, (255, 255, 255), 0.95))
    else:
        palette = TEMA_PALETLERI.get(
            summary.tema_stili, TEMA_PALETLERI["klasik"]
        )
        accent = palette["accent"]
        dark = palette["dark"]
        soft = palette["soft"]
        border = palette["border"]
        bg_soft = palette["bg"]
    on_accent = _contrast_ink(accent)
    return (
        f'.bento-profile[data-profile-id="{profile.id}"] {{\n'
        f"  --bp-primary: {accent};\n"
        f"  --bp-primary-dark: {dark};\n"
        f"  --bp-pill: {soft};\n"
        f"  --bp-accent-border: {border};\n"
        f"  --bp-bg-soft: {bg_soft};\n"
        f"  --bp-on-accent: {on_accent};\n"
        f"  --bp-btn-radius: {radius};\n"
        f"  --bp-font-heading: {font_heading};\n"
        f"  --bp-font-body: {font_body};\n"
        "}\n"
    )


@router.get("/uzmanlar/{uzman_id}/tema", response_model=TemaAyarlariCikti)
def acik_tema(uzman_id: str, db: Db):
    return tema_ozeti(profil_bul(db, uzman_id))


@router.get("/uzmanlar/{uzman_id}/tema.css", include_in_schema=False)
def acik_tema_css(uzman_id: str, db: Db):
    profile = profil_bul(db, uzman_id)
    return Response(
        content=_css_olustur(profile),
        media_type="text/css; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/uzman/tema", response_model=TemaAyarlariCikti)
def kendi_temasi(me: AktifUzman):
    return tema_ozeti(me)


@router.get("/uzman/tema.css", include_in_schema=False)
def kendi_tema_css(me: AktifUzman):
    return Response(
        content=_css_olustur(me),
        media_type="text/css; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )


@router.put("/uzman/tema", response_model=TemaAyarlariCikti)
def tema_guncelle(body: TemaAyarlariGirdi, me: AktifUzman, db: Db):
    premium = _premium_yetkisi(me)
    if (body.terapistco_markasi_gizli or body.tema_stili == "ozel") and (
        not premium
    ):
        raise HTTPException(
            403,
            "Özel klinik rengi ve beyaz etiket (logo gizleme) özellikleri "
            "yetkili profiller ve kurucu üyeler içindir.",
        )
    me.bekleme_listesi_acik = body.bekleme_listesi_acik
    me.tasarim_tarzi = body.tasarim_tarzi
    me.tema_stili = body.tema_stili
    me.vurgu_rengi = body.vurgu_rengi
    me.buton_stili = body.buton_stili
    me.yazi_tipi = body.yazi_tipi
    me.yuzey_stili = body.yuzey_stili
    me.arka_plan_gorseli_url = body.arka_plan_gorseli_url
    me.terapistco_markasi_gizli = body.terapistco_markasi_gizli
    denetle(db, "profil.tema_guncelle", me.kullanici_id, me.id)
    db.commit()
    return tema_ozeti(me)
