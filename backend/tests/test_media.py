"""Profil fotoğrafı yükleme, WebP sıkıştırma ve HEIC dönüştürme testleri."""

import io

import pillow_heif
from PIL import Image

from app import media as media_module
from tests.conftest import PAROLA


def _make_image_bytes(fmt: str, size=(1200, 900), mode="RGB") -> bytes:
    img = Image.new(mode, size, (217, 119, 87))
    buf = io.BytesIO()
    if fmt == "HEIC":
        heif_file = pillow_heif.from_pillow(img)
        heif_file.save(buf, quality=70)
    else:
        img.save(buf, format=fmt)
    return buf.getvalue()


def test_upload_converts_jpg_png_heic_to_compressed_webp(
    env, tmp_path, monkeypatch
):
    client, _, _, _ = env
    monkeypatch.setattr(media_module, "profil_medya_dizini", lambda: tmp_path)

    for ext, mime, fmt, mode in [
        ("jpg", "image/jpeg", "JPEG", "RGB"),
        ("png", "image/png", "PNG", "RGBA"),
        ("heic", "image/heic", "HEIC", "RGB"),
    ]:
        raw = _make_image_bytes(fmt, size=(1400, 1000), mode=mode)
        resp = client.post(
            "/api/medya/profil-fotografi",
            files={"file": (f"foto.{ext}", raw, mime)},
            headers={"Origin": "http://localhost:5173"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["url"].startswith("/api/medya/profil/")
        assert data["url"].endswith(".webp")
        assert data["genislik"] == 800
        assert data["yukseklik"] < 800
        assert data["boyut_bayt"] > 0

        fetched = client.get(data["url"])
        assert fetched.status_code == 200
        assert fetched.headers["content-type"] == "image/webp"
        assert "immutable" in fetched.headers["cache-control"]
        with Image.open(io.BytesIO(fetched.content)) as parsed:
            assert parsed.format == "WEBP"
            assert parsed.size == (data["genislik"], data["yukseklik"])


def test_upload_rejects_invalid_file_and_bad_filename(
    env, tmp_path, monkeypatch
):
    client, _, _, _ = env
    monkeypatch.setattr(media_module, "profil_medya_dizini", lambda: tmp_path)

    bad = client.post(
        "/api/medya/profil-fotografi",
        files={"file": ("not-image.txt", b"merhaba dunya", "text/plain")},
        headers={"Origin": "http://localhost:5173"},
    )
    assert bad.status_code == 422

    missing = client.get("/api/medya/profil/not-a-valid-file.webp")
    assert missing.status_code == 404


def test_profile_save_accepts_uploaded_webp_and_cleans_old_file(
    env, tmp_path, monkeypatch
):
    client, _, _, _ = env
    monkeypatch.setattr(media_module, "profil_medya_dizini", lambda: tmp_path)

    login = client.post(
        "/api/oturum/giris",
        json={"email": "uzman0@example.com", "parola": PAROLA},
        headers={"Origin": "http://localhost:5173"},
    )
    assert login.status_code == 200
    csrf = login.json()["csrf"]

    first_upload = client.post(
        "/api/medya/profil-fotografi",
        files={"file": ("ilk.png", _make_image_bytes("PNG"), "image/png")},
        headers={"Origin": "http://localhost:5173"},
    )
    assert first_upload.status_code == 200
    first_url = first_upload.json()["url"]

    profile = client.get("/api/uzman/profil").json()
    payload = {
        "ad": profile["ad"],
        "unvan": profile["unvan"],
        "profil_fotografi_url": first_url,
        "sehir": profile["sehir"],
        "ilce": profile["ilce"],
        "biyografi": profile["biyografi"],
        "terapi_yaklasimi": profile["terapi_yaklasimi"],
        "ucret": profile["ucret"],
        "seans_suresi_dakika": profile["seans_suresi_dakika"],
        "deneyim_yili": profile["deneyim_yili"],
        "ekoller": profile["ekoller"],
        "kitle": profile["kitle"],
        "formatlar": profile["formatlar"],
        "diller": profile["diller"],
        "uzmanliklar": profile["uzmanliklar"],
        "egitim": profile["egitim"],
        "egitim_universite": profile["egitim_universite"],
        "egitim_program": profile["egitim_program"],
        "egitim_derece": profile["egitim_derece"],
        "kurumlar": profile["kurumlar"],
        "sosyal_baglantilar": profile["sosyal_baglantilar"],
        "adres": profile["adres"],
        "calisma_saatleri": profile["calisma_saatleri"],
    }

    save_first = client.put(
        "/api/uzman/profil",
        json=payload,
        headers={"Origin": "http://localhost:5173", "X-CSRF-Token": csrf},
    )
    assert save_first.status_code == 200, save_first.text
    assert save_first.json()["profil_fotografi_url"] == first_url
    assert client.get(first_url).status_code == 200

    second_upload = client.post(
        "/api/medya/profil-fotografi",
        files={
            "file": ("ikinci.jpg", _make_image_bytes("JPEG"), "image/jpeg")
        },
        headers={"Origin": "http://localhost:5173"},
    )
    second_url = second_upload.json()["url"]
    payload["profil_fotografi_url"] = second_url

    save_second = client.put(
        "/api/uzman/profil",
        json=payload,
        headers={"Origin": "http://localhost:5173", "X-CSRF-Token": csrf},
    )
    assert save_second.status_code == 200
    assert save_second.json()["profil_fotografi_url"] == second_url
    assert client.get(first_url).status_code == 404
    assert client.get(second_url).status_code == 200
