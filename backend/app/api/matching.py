"""Kimliksiz, kalıcı kayıt oluşturmayan tercih eşleştirme uç noktası."""

from fastapi import APIRouter, Request

from app.eslestirme import uzman_eslestir
from app.schemas import EslestirmeCikti, EslestirmeGirdi
from app.security import Db, hiz_siniri, istemci

router = APIRouter(tags=["Eşleştirme"])


@router.post("/eslestirme", response_model=EslestirmeCikti)
def eslestir(body: EslestirmeGirdi, request: Request, db: Db):
    """Tercihleri URL, hesap veya denetim kaydına yazmadan sıralar.

    POST seçimi veri yazıldığı anlamına gelmez: destek alanları URL'ye ve
    tarayıcı geçmişine girmesin diye gövde kullanılır. Ortak middleware
    Origin, JSON boyutu ve no-store sınırlarını uygular. Hız sınırı anahtarı
    HMAC'lenir; tercihler içermez. Danışan üyeliği gerekmez.
    """
    hiz_siniri.kontrol("eslestirme:" + istemci(request), 120, 60)
    return uzman_eslestir(db, body)
