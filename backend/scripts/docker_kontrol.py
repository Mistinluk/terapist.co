"""Yerel Docker ağında Nginx, API, PostgreSQL ve görsel yüklemeyi sınar.

`make docker-kontrol` ile API konteynerinde çalışır. Gerçek kullanıcı veya
randevu oluşturmaz. Yüklediği kurgusal görseli finally bloğunda temizler.
Örnek profiller önceden oluşturulmalıdır; üretim ortamında çalıştırılmaz.
"""

import io
import json
import random
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image

from app.config import get_settings
from app.media import dosya_yolu_bul


def request(
    path: str, data: bytes | None = None, content_type: str = ""
) -> tuple[int, dict, bytes]:
    """Gerçek Nginx yanıtını, hata kodları dahil, test için döndürür."""
    headers = {
        "Host": "localhost:8080",
        "Origin": "http://localhost:8080",
    }
    if content_type:
        headers["Content-Type"] = content_type
    req = Request("http://web:8080" + path, data=data, headers=headers)
    try:
        response = urlopen(req, timeout=15)
    except HTTPError as exc:
        response = exc
    with response:
        return response.status, dict(response.headers), response.read()


def main() -> None:
    """Derlenmiş profil dosyalarını ve medya yazma/okuma akışını sınar."""
    if get_settings().ortam != "gelistirme":
        raise SystemExit("Bu kontrol yalnızca yerel geliştirmede çalışır.")
    status, _, body = request("/api/hazir")
    assert status == 200
    assert json.loads(body)["veritabani"] == "postgresql"
    status, _, body = request("/api/uzmanlar")
    assert status == 200
    profiles = json.loads(body)["sonuclar"]
    assert profiles, "Önce make docker-ornek ile örnek profil ekleyin."
    slug = quote(profiles[0]["kullanici_adi"], safe="")
    for path in ("/", "/ozellikler", "/kesfet", f"/{slug}"):
        status, _, body = request(path)
        assert status == 200, path
        assert b"/assets/app.js" in body, path
        assert b"/src/main.tsx" not in body, path
    for path, mime in (
        ("/assets/app.js", "javascript"),
        ("/assets/app.css", "text/css"),
    ):
        status, headers, _ = request(path)
        assert status == 200 and mime in headers["Content-Type"]

    # Tekrarlanabilir gürültü PNG'nin 32 KiB altına sıkışmasını engeller.
    pixels = random.Random(42).randbytes(160 * 160 * 3)
    photo = Image.frombytes("RGB", (160, 160), pixels)
    buffer = io.BytesIO()
    photo.save(buffer, format="PNG")
    raw = buffer.getvalue()
    assert len(raw) > 32768
    boundary = "terapist-docker-kontrol"
    data = (
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="file"; '
            'filename="docker-kontrol.png"\r\n'
            "Content-Type: image/png\r\n\r\n"
        ).encode()
        + raw
        + f"\r\n--{boundary}--\r\n".encode()
    )
    filename = None
    try:
        status, _, body = request(
            "/api/medya/profil-fotografi",
            data,
            f"multipart/form-data; boundary={boundary}",
        )
        assert status == 200, f"Görsel yükleme durumu: {status}"
        url = json.loads(body)["url"]
        filename = url.rsplit("/", 1)[-1]
        assert url.startswith("/api/medya/profil/")
        status, headers, body = request(url)
        assert status == 200 and headers["Content-Type"] == "image/webp"
        with Image.open(io.BytesIO(body)) as saved:
            assert saved.format == "WEBP"
        status, _, _ = request(
            "/api/analitik/olcum", b" " * 40000, "application/json"
        )
        assert status == 413, "Normal API istek sınırı korunmalı."
    finally:
        if filename:
            path = dosya_yolu_bul(filename)
            if path is not None:
                path.unlink()
    print("Docker: PostgreSQL, profil, React dosyaları ve görsel yükleme OK.")


if __name__ == "__main__":
    main()
