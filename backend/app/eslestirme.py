"""Tercihe dayalı uzman sıralaması: filtrele, puanla, sırala, sayfala.

Puanlar veritabanında hesaplanır; bütün profilleri Python'a taşıma veya
her uzman için ayrı sorgu yoktur. SQLite testleri ve PostgreSQL aynı
kuralları uygular. Ağırlıklar ürün tercihidir, klinik doğrulama değildir.
"""

from sqlalchemy import Float, case, cast, exists, func, literal, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models import Uzman
from app.schemas import (
    EslesenProfil,
    EslesmeAciklamasi,
    EslestirmeCikti,
    EslestirmeGirdi,
    ProfilCikti,
)

ALAN_AGIRLIGI = 70
EKOL_AGIRLIGI = 30
SAYFA_BOYUTU = 12


def listede_var(
    db: Session, field: ColumnElement, value: str
) -> ColumnElement[bool]:
    """JSON listesindeki tam etiketi arar; kullanıcı girdisi SQL'e bağlanır.

    PostgreSQL JSONB kapsama operatörü kullanır. SQLite'ta json_each alt
    sorgusu ana uzman satırına bağlıdır; eşleşme başka uzmandan taşınmaz.
    """
    if db.get_bind().dialect.name == "postgresql":
        return cast(field, JSONB).contains([value])
    items = func.json_each(field).table_valued("value")
    return exists(select(1).select_from(items).where(items.c.value == value))


def turkce_ad_sirasi() -> ColumnElement[str]:
    """I/İ ve Türkçe büyük harfleri iki veritabanında tutarlı küçültür."""
    normalized = Uzman.ad
    for upper, lower in zip("IİÇĞÖŞÜ", "ıiçğöşü", strict=True):
        normalized = func.replace(normalized, upper, lower)
    return func.lower(normalized)


def kapsama_orani(
    db: Session, field: ColumnElement, values: list[str]
) -> ColumnElement[float]:
    """İstenen etiketlerin kaçının profilde bulunduğunu 0–1 arası hesaplar.

    Profilin fazladan etiket yazması ek puan sağlamaz. Boş tercih, eksik
    tercih değildir; ağırlık hesabından tamamen çıkarılır.
    """
    if not values:
        return literal(0.0)
    matches = sum(
        (
            case((listede_var(db, field, value), 1), else_=0)
            for value in values
        ),
        literal(0),
    )
    return cast(matches, Float) / len(values)


def eslesme_puani(
    db: Session, request: EslestirmeGirdi
) -> ColumnElement[float]:
    """Yalnızca belirtilen tercihlerin ağırlığını 100'e normalize eder."""
    weight = (ALAN_AGIRLIGI if request.uzmanliklar else 0) + (
        EKOL_AGIRLIGI if request.ekoller else 0
    )
    if not weight:
        return literal(0.0)
    areas = kapsama_orani(db, Uzman.uzmanliklar, request.uzmanliklar)
    schools = kapsama_orani(db, Uzman.ekoller, request.ekoller)
    return (ALAN_AGIRLIGI * areas + EKOL_AGIRLIGI * schools) * 100.0 / weight


def aciklama_uret(
    profile: Uzman, request: EslestirmeGirdi, score: float
) -> EslesmeAciklamasi:
    """Kart açıklamasını aynı tam etiket kurallarından oluşturur.

    Ham puan sıralamada korunur, yalnızca gösterim bir ondalığa yuvarlanır.
    Hiç puanlanan tercih yoksa uydurma bir sıfır/başarı yüzdesi yerine null
    döner. Böylece arayüz alfabetik başlangıç sırasını açıklayabilir.
    """
    return EslesmeAciklamasi(
        puan=round(score, 1)
        if request.uzmanliklar or request.ekoller
        else None,
        eslesen_alanlar=[
            v for v in request.uzmanliklar if v in profile.uzmanliklar
        ],
        eksik_alanlar=[
            v for v in request.uzmanliklar if v not in profile.uzmanliklar
        ],
        eslesen_ekoller=[v for v in request.ekoller if v in profile.ekoller],
        eksik_ekoller=[v for v in request.ekoller if v not in profile.ekoller],
    )


def uzman_eslestir(db: Session, request: EslestirmeGirdi) -> EslestirmeCikti:
    """İki SELECT ile kesin filtrelere uyan uzmanları sıralı döndürür.

    Onay ve arşiv koşulları zorunludur. Şehir, grup, görüşme şekli, bütçe,
    deneyim ve ad araması puan uğruna gevşetilmez. Uzmanlık/yaklaşım ise
    kısmi eşleşmelere izin verir; karşılanmayanlar kartta açıkça belirtilir.
    Aynı veri anında eşit puanlar ad ve UUID ile kararlı biçimde sıralanır.
    """
    query = select(Uzman).where(
        Uzman.onayli.is_(True),
        Uzman.arsivli.is_(False),
        Uzman.deneyim_yili >= request.deneyim,
    )
    if request.sehir:
        query = query.where(Uzman.sehir == request.sehir)
    if request.azami_ucret is not None:
        query = query.where(Uzman.ucret <= request.azami_ucret)
    for field, value in [
        (Uzman.kitle, request.kitle),
        (Uzman.formatlar, request.format),
    ]:
        if value:
            query = query.where(listede_var(db, field, value))
    name = turkce_ad_sirasi()
    if request.arama:
        term = request.arama.translate(str.maketrans("Iİ", "ıi")).lower()
        query = query.where(name.contains(term, autoescape=True))
    count = db.scalar(select(func.count()).select_from(query.subquery()))
    score = eslesme_puani(db, request).label("eslesme_puani")
    order = {
        "eslesme": score.desc(),
        "ad": name,
        "ucret_artan": Uzman.ucret.asc(),
        "ucret_azalan": Uzman.ucret.desc(),
    }[request.sirala]
    rows = db.execute(
        query.add_columns(score)
        .order_by(order, name, Uzman.id)
        .offset((request.sayfa - 1) * SAYFA_BOYUTU)
        .limit(SAYFA_BOYUTU)
    ).all()
    return EslestirmeCikti(
        toplam=count,
        sayfa=request.sayfa,
        sonuclar=[
            EslesenProfil(
                **ProfilCikti.model_validate(profile).model_dump(),
                eslesme=aciklama_uret(profile, request, points),
            )
            for profile, points in rows
        ],
    )
