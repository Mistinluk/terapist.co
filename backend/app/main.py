"""Uvicorn'un yüklediği FastAPI uygulaması ve ortak HTTP sınırları.

`uvicorn app.main:app` modülü yüklerken ayarlar doğrulanır ve router'lar
kurulur; burada tablo yaratılmaz veya örnek veri eklenmez. İstekler ortak
güvenlik katmanından sonra Pydantic ve ilgili API işlevine ulaşır. Hesap
yetkisi/CSRF denetimi ayrıca security.py bağımlılıklarında uygulanır.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import admin, appointments, auth, matching, profiles
from app.config import get_settings
from app.db import engine
from app.models import Uzman

settings = get_settings()
# Geliştirmede sözleşme JSON'u kullanılabilir; üretimde yayınlanmaz.
app = FastAPI(
    title="Terapist.co API",
    version="0.1.0",
    description="Türkçe uzman dizini ve güvenli randevu talepleri.",
    docs_url=None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.ortam != "uretim" else None,
)
app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=settings.guvenilir_hostlar
)


async def istegi_dogrula(request: Request) -> JSONResponse | None:
    """Yazma ve eşleştirme POST isteklerinin kaynak/gövde sınırını uygular.

    İzinli Origin ve JSON türü zorunludur. Gövde akışta sayılır; yanıltıcı
    Content-Length başlığına güvenilmez. Başarısızlıkta erken HTTP yanıtı,
    başarıda sonraki katmana geçmek için None döner. Kimlik kontrolü yapmaz.
    """
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if not settings.kaynak_izinli(request.headers.get("origin")):
            return JSONResponse(
                {"detail": "İstek kaynağı doğrulanamadı."}, status_code=403
            )
        if not request.headers.get("content-type", "").startswith(
            "application/json"
        ):
            return JSONResponse(
                {"detail": "JSON içerik gereklidir."}, status_code=415
            )
        size = 0
        chunks = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 32768:
                return JSONResponse(
                    {"detail": "İstek çok büyük."}, status_code=413
                )
            chunks.append(chunk)
        # Okunan akışı FastAPI/Pydantic'in yeniden okuyabilmesi için sakla.
        # Starlette güncellenirse bu gövde aktarımını testlerle doğrulayın.
        request._body = b"".join(chunks)
    return None


@app.middleware("http")
async def guvenlik(request: Request, call_next):
    """Erken hata yanıtlarına da önbellek ve tarayıcı korumaları ekler.

    Beklenmeyen hatanın ham metni SQL/girdi içerebileceğinden dışarı verilmez.
    API'nin CSP'si veri yanıtları içindir; React belgesinin CSP'sini Nginx
    sağlar. HTTPS zorunluluğu başlığı yalnızca üretimde etkinleştirilir.
    """
    try:
        response = await istegi_dogrula(request)
        if response is None:
            response = await call_next(request)
    except Exception:
        # SQL veya kullanıcı girdisi içeren hata yığınları loglanmaz.
        response = JSONResponse(
            {"detail": "İşlem tamamlanamadı. Lütfen tekrar deneyin."},
            status_code=500,
        )
    response.headers.update(
        {
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": (
                "default-src 'none'; frame-ancestors 'none'"
            ),
        }
    )
    if settings.ortam == "uretim":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


@app.exception_handler(RequestValidationError)
async def dogrulama_hatasi(request, exc):
    """422 yanıtında hatalı alan yollarını verir, ham değerleri gizler.

    İstemci bu yollarla alanları işaretleyebilir; Pydantic'in input/ctx
    ayrıntıları danışan verisi içerebildiği için yanıtın parçası değildir.
    """
    # Pydantic'in ham girdi ve hata bağlamı danışan bilgisi içerebilir.
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Alanları kontrol edin. Eksik veya geçersiz bilgi var.",
            "alanlar": [
                ".".join(map(str, e["loc"][1:])) for e in exc.errors()
            ],
        },
    )


@app.exception_handler(Exception)
async def sunucu_hatasi(request, exc):
    """İşlenmemiş istisnalar için ayrıntı sızdırmayan son yanıtı sağlar."""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin."
        },
    )


@app.get("/api/saglik", tags=["Sistem"])
def saglik():
    """Sürecin HTTP yanıtı verebildiğini gösterir; veritabanını sorgulamaz."""
    return {"durum": "hazır"}


@app.get("/api/hazir", tags=["Sistem"])
def hazir():
    """Gerçek tablo sorgusuyla DB bağlantısı ve şema erişimini denetler.

    /saglik başarılıyken DB kopuk olabilir; Compose bu uç noktayı kullanır.
    Redis hazırlığını veya tüm işlevleri test etmez. Bağlantı ayrıntısını
    paylaşmadan 503 döner; boş ama erişilebilir uzman tablosu başarılıdır.
    """
    try:
        with engine.connect() as connection:
            connection.execute(select(Uzman.id).limit(1))
    except SQLAlchemyError:
        return JSONResponse(
            {"durum": "veritabanı hazır değil"}, status_code=503
        )
    return {"durum": "hazır", "veritabani": engine.dialect.name}


@app.get("/api/aydinlatma", tags=["Bilgilendirme"])
def aydinlatma():
    """Formda gösterilecek metni ve talepte doğrulanacak sürümü döndürür.

    İçerik merkezi ayarlardan gelir; hukuki metin bu uçta üretilmez.
    gelistirme işareti, arayüzde örnek ortam uyarısını görünür kılar.
    """
    return {
        "surum": settings.aydinlatma_surumu,
        "metin": settings.aydinlatma_metni,
        "veri_sorumlusu": settings.veri_sorumlusu,
        "gelistirme": settings.ortam != "uretim",
    }


# Ortak /api öneki hem Nginx hem Vite vekilinin yönlendirmesiyle eşleşir.
for router in [
    auth.router,
    profiles.router,
    matching.router,
    appointments.router,
    admin.router,
]:
    app.include_router(router, prefix="/api")
