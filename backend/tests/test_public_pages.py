"""Kısa profil adresi, güvenli HTML kabuğu ve indeksleme kuralları."""

import json
from html import unescape
from re import search

from sqlalchemy import select

from app.accounts import kullanici_adi_uret
from app.api import public_pages
from app.models import TerapistDogrulama, Uzman


def _prepare_profile(factory, ids):
    with factory() as db:
        owner = db.get(Uzman, ids[0])
        owner.kullanici_adi = "ornek-uzman"
        owner.biyografi = "Kaygı alanında çalışan kurgusal terapist."
        owner.unvan = "Uzm. Klinik Psikolog"
        owner.profil_fotografi_url = "https://cdn.example.com/ornek.jpg"
        owner.egitim = ["Örnek Üniversitesi, Psikoloji"]
        owner.egitim_universite = "Örnek Üniversitesi"
        owner.ekoller = ["Bilişsel Davranışçı Terapi"]
        owner.uzmanliklar = ["Kaygı"]
        colleague = db.get(Uzman, ids[1])
        colleague.kullanici_adi = "ornek-meslektas"
        db.commit()


def test_kisa_adres_tek_profil_uygulamasini_ve_meta_bilgilerini_sunar(env):
    client, factory, ids, _ = env
    _prepare_profile(factory, ids)

    response = client.get("/ornek-uzman")
    old = client.get("/passport/ornek-uzman", follow_redirects=False)
    old_id = client.get(f"/uzman/{ids[0]}", follow_redirects=False)
    by_username = client.get("/api/uzmanlar/kullanici-adi/ornek-uzman")

    assert response.status_code == 200
    assert client.head("/ornek-uzman").status_code == 200
    assert old.status_code == 308
    assert old.headers["location"] == "/ornek-uzman"
    assert old_id.status_code == 308
    assert old_id.headers["location"] == "/ornek-uzman"
    assert response.headers["cache-control"] == "no-store"
    assert "script-src 'self'" in response.headers["content-security-policy"]
    match = search(r'<div id="root" data-profile="([^"]+)">', response.text)
    assert match is not None
    initial = json.loads(unescape(match.group(1)))
    assert initial["kullanici_adi"] == "ornek-uzman"
    assert 'src="/src/main.tsx"' in response.text
    assert (
        '<main class="public-profile-fallback" itemscope\n'
        'itemtype="https://schema.org/Person">' in response.text
    )
    assert (
        '<link rel="canonical" href="http://localhost:5173/ornek-uzman">'
        in response.text
    )
    assert "Uzm. Klinik Psikolog" in response.text
    assert "Örnek Üniversitesi" in response.text
    assert "Bilişsel Davranışçı Terapi" in response.text
    assert "/passport-assets/" not in response.text
    assert by_username.status_code == 200
    assert by_username.json()["id"] == ids[0]
    assert by_username.json()["kullanici_adi"] == "ornek-uzman"


def test_html_kullanici_icerigini_kacislar(env):
    client, factory, ids, _ = env
    _prepare_profile(factory, ids)
    with factory() as db:
        db.get(Uzman, ids[0]).biyografi = '<img src=x onerror="alert(1)">'
        db.commit()

    response = client.get("/ornek-uzman")

    assert "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;" in response.text
    assert '<img src=x onerror="alert(1)">' not in response.text


def test_uretim_profili_sabit_derleme_dosyalarini_ve_dar_cspyi_kullanir(
    env, monkeypatch
):
    client, factory, ids, _ = env
    _prepare_profile(factory, ids)
    monkeypatch.setattr(public_pages.settings, "ortam", "uretim")

    response = client.get("/ornek-uzman")

    assert 'href="/assets/app.css"' in response.text
    assert 'src="/assets/app.js"' in response.text
    assert "/@vite/client" not in response.text
    assert "'unsafe-inline'" not in response.headers["content-security-policy"]
    assert "ws: wss:" not in response.headers["content-security-policy"]


def test_dogrulanmamis_profil_gizlenir_ve_sitemapten_cikar(env):
    client, factory, ids, _ = env
    _prepare_profile(factory, ids)
    with factory() as db:
        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == ids[1]
            )
        )
        verification.durum = "pending"
        db.commit()

    hidden = client.get("/ornek-meslektas")
    sitemap = client.get("/sitemap.xml")

    assert hidden.status_code == 404
    assert 'content="noindex"' in hidden.text
    assert (
        client.get("/api/uzmanlar/kullanici-adi/ornek-meslektas").status_code
        == 404
    )
    assert "/ornek-uzman" in sitemap.text
    assert "/ornek-meslektas" not in sitemap.text


def test_docker_gelistirme_profili_derlenmis_arayuzu_kullanir(
    env, monkeypatch
):
    """Geliştirme güvenlik ayarları derlenmiş React seçimini engellemez."""
    client, factory, ids, _ = env
    _prepare_profile(factory, ids)
    monkeypatch.setattr(public_pages.settings, "ortam", "gelistirme")
    monkeypatch.setattr(public_pages.settings, "arayuz_sunumu", "derleme")

    response = client.get("/ornek-uzman")

    assert response.status_code == 200
    assert 'href="/assets/app.css"' in response.text
    assert 'src="/assets/app.js"' in response.text
    assert "/@vite/client" not in response.text
    assert "/src/main.tsx" not in response.text


def test_eski_stil_kaldirilir_ve_robots_korunur(env):
    client, _, _, _ = env
    assert client.get("/passport-assets/passport.css").status_code == 404
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "Allow: /" in robots.text
    assert "Disallow: /api/" in robots.text
    assert "Disallow: /yonetim" in robots.text
    assert "Disallow: /davet/" in robots.text
    assert "http://localhost:5173/sitemap.xml" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "http://localhost:5173/basvuru" in sitemap.text
    assert "http://localhost:5173/aydinlatma" in sitemap.text


def test_profil_fotografi_yoksa_varsayilan_og_gorseli_kullanilir(env):
    client, factory, ids, _ = env
    _prepare_profile(factory, ids)
    with factory() as db:
        db.get(Uzman, ids[0]).profil_fotografi_url = ""
        db.commit()

    response = client.get("/ornek-uzman")

    assert response.status_code == 200
    assert (
        '<meta property="og:image" content="http://localhost:5173/brand/terapistco-og.png">'
        in response.text
    )
    assert (
        '<meta name="twitter:card" content="summary_large_image">'
        in response.text
    )
    assert (
        '<meta property="og:site_name" content="terapist.co">' in response.text
    )
    assert '<meta property="og:locale" content="tr_TR">' in response.text
    ld_match = search(
        r'<script type="application/ld\+json">([^<]+)</script>',
        response.text,
    )
    assert ld_match is not None
    ld_data = json.loads(ld_match.group(1))
    assert ld_data["@context"] == "https://schema.org"
    types = [node["@type"] for node in ld_data["@graph"]]
    assert "ProfilePage" in types
    assert "Person" in types
    assert "ProfessionalService" in types
    assert "BreadcrumbList" in types


def test_kullanici_adi_cakismasina_sirali_ek_uygulanir(env):
    _, factory, ids, _ = env
    with factory() as db:
        db.get(Uzman, ids[0]).kullanici_adi = "ornekuzman0"
        db.get(Uzman, ids[1]).kullanici_adi = "ornekuzman1"
        db.flush()
        db.get(Uzman, ids[0]).kullanici_adi = "ornekuzman"
        db.get(Uzman, ids[1]).kullanici_adi = "ornekuzman2"
        db.flush()

        assert kullanici_adi_uret(db, "Örnek Uzman") == "ornekuzman3"
