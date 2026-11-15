"""Profil fotoğrafı yükleme ve WebP görsel sunumu uç noktaları."""

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.media import (
    MAX_UPLOAD_BYTES,
    GorselHatasi,
    dosya_yolu_bul,
    profil_fotografi_kaydet,
)
from app.security import hiz_siniri, istemci

router = APIRouter(prefix="/medya", tags=["Medya"])


@router.post("/profil-fotografi")
async def profil_fotografi_yukle(
    request: Request,
    file: Annotated[UploadFile, File(...)],
):
    """Yüklenen görseli (HEIC, JPG, PNG vb.) sıkıştırıp WebP'ye dönüştürür."""
    hiz_siniri.kontrol(f"medya:{istemci(request)}", 30, 900)
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Görsel dosyası en fazla 12 MB olabilir.")
    try:
        saved = profil_fotografi_kaydet(raw)
    except GorselHatasi as exc:
        raise HTTPException(422, str(exc)) from None
    return {
        "url": saved.url,
        "boyut_bayt": saved.boyut_bayt,
        "genislik": saved.genislik,
        "yukseklik": saved.yukseklik,
    }


@router.get("/profil/{dosya_adi}")
def profil_fotografi_getir(dosya_adi: str):
    """Optimize edilmiş WebP profil fotoğrafını sunar."""
    path = dosya_yolu_bul(dosya_adi)
    if path is None:
        raise HTTPException(404, "Görsel bulunamadı.")
    return FileResponse(
        path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
