"""Profil fotoğrafları için güvenli görsel işleme ve WebP dönüştürme."""

import io
import re
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import pillow_heif
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import get_settings

pillow_heif.register_heif_opener()

# Decompression bomb saldırılarına karşı makul piksel sınırı (~25 MP).
Image.MAX_IMAGE_PIXELS = 25_000_000

MAX_UPLOAD_BYTES = 12 * 1024 * 1024  # 12 MB
MAX_DIMENSION = 800
TARGET_MAX_WEBP_BYTES = 240 * 1024  # 240 KB hedeflenen sıkıştırma üst sınırı
MEDYA_URL_ONEKI = "/api/medya/profil/"
DOSYA_ADI_DESENI = re.compile(r"^[a-f0-9]{32}\.webp$")


class GorselHatasi(ValueError):
    """Geçersiz veya işlenemeyen görsel dosyası hatası."""


@dataclass(frozen=True)
class IslenmisGorsel:
    url: str
    dosya_adi: str
    boyut_bayt: int
    genislik: int
    yukseklik: int


def profil_medya_dizini() -> Path:
    """Profil fotoğraflarının saklandığı dizini döndürür ve oluşturur."""
    configured = get_settings().medya_dizini.strip()
    if configured:
        directory = Path(configured) / "profil_fotograflari"
    else:
        directory = (
            Path(__file__).resolve().parent.parent
            / "uploads"
            / "profil_fotograflari"
        )
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def dosya_yolu_bul(dosya_adi: str) -> Path | None:
    """Güvenli dosya adı desenine uyan görselin disk yolunu döndürür."""
    if not DOSYA_ADI_DESENI.fullmatch(dosya_adi):
        return None
    path = profil_medya_dizini() / dosya_adi
    if not path.is_file():
        return None
    return path


def gorseli_webp_yap(raw_bytes: bytes) -> tuple[bytes, int, int]:
    """HEIC/JPEG/PNG/WebP vb. görseli yeniden boyutlandırıp WebP'ye çevirir."""
    if not raw_bytes:
        raise GorselHatasi("Boş dosya yüklenemez.")
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise GorselHatasi("Görsel en fazla 12 MB olabilir.")

    try:
        with Image.open(io.BytesIO(raw_bytes)) as opened:
            # Çok kareli görsellerde (ör. GIF) ilk kareyi al.
            if getattr(opened, "n_frames", 1) > 1:
                opened.seek(0)
            image = ImageOps.exif_transpose(opened)
            has_alpha = image.mode in {"RGBA", "LA"} or (
                image.mode == "P" and "transparency" in image.info
            )
            converted = image.convert("RGBA" if has_alpha else "RGB")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise GorselHatasi(
            "Geçerli bir görsel dosyası yükleyin (HEIC, JPG, PNG, WebP vb.)."
        ) from None

    converted.thumbnail(
        (MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS
    )
    width, height = converted.size

    encoded = b""
    for quality in (82, 72, 62):
        buffer = io.BytesIO()
        converted.save(
            buffer,
            format="WEBP",
            quality=quality,
            method=6,
        )
        encoded = buffer.getvalue()
        if len(encoded) <= TARGET_MAX_WEBP_BYTES:
            break

    return encoded, width, height


def profil_fotografi_kaydet(raw_bytes: bytes) -> IslenmisGorsel:
    """Görseli sıkıştırılmış WebP olarak kaydeder ve meta verisini döner."""
    webp_bytes, width, height = gorseli_webp_yap(raw_bytes)
    filename = f"{uuid4().hex}.webp"
    target = profil_medya_dizini() / filename
    target.write_bytes(webp_bytes)
    return IslenmisGorsel(
        url=f"{MEDYA_URL_ONEKI}{filename}",
        dosya_adi=filename,
        boyut_bayt=len(webp_bytes),
        genislik=width,
        yukseklik=height,
    )


def eski_fotografi_sil(url: str) -> None:
    """Yerel medya URL'sine karşılık gelen eski dosyayı güvenle siler."""
    if not url or not url.startswith(MEDYA_URL_ONEKI):
        return
    filename = url[len(MEDYA_URL_ONEKI) :]
    path = dosya_yolu_bul(filename)
    if path is not None:
        path.unlink(missing_ok=True)
