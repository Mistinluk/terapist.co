"""SQLAlchemy tabloları: hesap, açık profil ve özel randevu verisi ayrılır.

Bu sınıflar saklama biçimini tanımlar; HTTP doğrulaması schemas.py içindeki
Pydantic modellerindedir. Şema değişikliği Alembic geçişi de gerektirir.
İlişkiler yabancı anahtarla kurulur; kayıtlar kendiliğinden cascade silinmez.
ORM nesnesini doğrudan API'ye döndürmek yerine çıktı şeması kullanılmalıdır.
"""

import uuid

from sqlalchemy import JSON, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def yeni_id() -> str:
    """Yeni satır için UUID üretir; kimliği bilmek erişim yetkisi vermez."""
    return str(uuid.uuid4())


class Kullanici(Base):
    """Giriş kimliği; uzman profili ve danışan iletişiminden bağımsızdır.

    parola_ozeti Argon2id özetidir; geri çözülebilir parola değildir.
    mfa_sirri şifreli TOTP anahtarıdır, son_mfa_adimi kod tekrarını engeller.
    aktif=False girişi kapatır; profilin yayımlanması ayrıca yönetilir.
    Yönetici hesabının uzman profili olması zorunlu değildir.
    """

    __tablename__ = "kullanicilar"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    parola_ozeti: Mapped[str] = mapped_column(Text)
    rol: Mapped[str] = mapped_column(default="uzman")
    aktif: Mapped[bool] = mapped_column(default=True)
    mfa_sirri: Mapped[str | None] = mapped_column(Text)
    son_mfa_adimi: Mapped[int] = mapped_column(default=-1)


class Uzman(Base):
    """Bir hesaba en fazla bir açık uzman profili bağlar.

    kullanici_id üzerindeki unique kısıtı bire bir eşlemeyi sağlar.
    ucret tam TL, deneyim_yili tam yıldır; adres yayımlanan iş adresidir.
    onayli/arsivli dizin görünürlüğünü belirler, silme yerine arşiv kullanılır.
    Liste alanları profil etiketlerini, calisma_saatleri haftalık programı
    tutar: gun=0 Pazartesi, baslangic/bitis saatleri İstanbul saatindedir.
    """

    __tablename__ = "uzmanlar"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    kullanici_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id"), unique=True
    )
    ad: Mapped[str] = mapped_column(String(150))
    sehir: Mapped[str] = mapped_column(String(80), index=True)
    ilce: Mapped[str] = mapped_column(String(80))
    biyografi: Mapped[str] = mapped_column(Text, default="")
    ucret: Mapped[int] = mapped_column(default=0)
    deneyim_yili: Mapped[int] = mapped_column(default=0)
    # default=list her kayıt için ayrı liste üretir. JSON listesi değişirken
    # yeni liste atayın; yerinde append işlemi otomatik izlenmez.
    ekoller: Mapped[list] = mapped_column(JSON, default=list)
    kitle: Mapped[list] = mapped_column(JSON, default=list)
    formatlar: Mapped[list] = mapped_column(JSON, default=list)
    uzmanliklar: Mapped[list] = mapped_column(JSON, default=list)
    egitim: Mapped[list] = mapped_column(JSON, default=list)
    kurumlar: Mapped[list] = mapped_column(JSON, default=list)
    calisma_saatleri: Mapped[list] = mapped_column(JSON, default=list)
    adres: Mapped[str] = mapped_column(Text, default="")
    onayli: Mapped[bool] = mapped_column(default=False, index=True)
    arsivli: Mapped[bool] = mapped_column(default=False)


class Oturum(Base):
    """Sunucuda iptal edilebilen, kullanıcıya bağlı giriş oturumu.

    Tarayıcıdaki ham oturum ve CSRF değerleri yerine özetleri saklanır.
    Zamanlar Unix saniyesidir; süre aşımı security.py içinde denetlenir.
    Çıkış veya hesap kurtarma bu satırları kaldırarak erişimi sonlandırır.
    """

    __tablename__ = "oturumlar"

    ozet: Mapped[str] = mapped_column(primary_key=True)
    kullanici_id: Mapped[str] = mapped_column(ForeignKey("kullanicilar.id"))
    csrf_ozeti: Mapped[str]
    olusturma: Mapped[int]
    son_erisim: Mapped[int]


class Randevu(Base):
    """Hesap gerektirmeyen danışan talebini uzman ve zamana bağlar.

    baslangic/olusturma Unix saniyesidir; gösterimde İstanbul'a çevrilir.
    Danışanın adı ve telefonu danisan_sifreli içinde şifreli JSON tutulur.
    aydinlatma_surumu talep anındaki metni belirtir. İzin verilen durum
    geçişleri API iş kuralıdır; bu model tek başına geçişleri doğrulamaz.
    """

    __tablename__ = "randevular"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    baslangic: Mapped[int] = mapped_column(index=True)
    danisan_sifreli: Mapped[str] = mapped_column(Text)
    durum: Mapped[str] = mapped_column(default="bekliyor")
    olusturma: Mapped[int]
    aydinlatma_surumu: Mapped[str]

    # Aynı uzmanda aynı anda yalnızca bir aktif talep bulunabilir.
    # İptal/reddedilen kayıt korunur fakat saati kapatmaz. Kısıt, API kontrolü
    # dışında yazıldığında ve yarışan taleplerde de çakışmayı engeller.
    __table_args__ = (
        Index(
            "uq_aktif_randevu",
            "uzman_id",
            "baslangic",
            unique=True,
            sqlite_where=text("durum IN ('bekliyor', 'onaylandi')"),
            postgresql_where=text("durum IN ('bekliyor', 'onaylandi')"),
        ),
    )


class Tavsiye(Base):
    """Uzmandan uzmana yönlü tavsiye; birleşik anahtar tekrarı engeller.

    Kendi kendine tavsiye ve onaysız uzman denetimleri API katmanındadır.
    Bu tablo danışan yorumu veya tedavi sonucu değerlendirmesi içermez.
    """

    __tablename__ = "tavsiyeler"

    veren_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    alan_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )


class Denetim(Base):
    """İşlemin kim, ne zaman ve hangi kayıt üzerinde olduğunu saklar.

    Kullanıcı/kaynak kimlikleri bilerek FK değildir; geçmiş olay kaydı
    hedef kaydın yaşam döngüsünden bağımsız kalır. Danışan adı, telefon,
    parola veya şifreli içeriğin kopyası buraya yazılmaz. Yazma işlemleri
    denetim kaydıyla aynı veritabanı işlemi içinde tamamlanmalıdır.
    """

    __tablename__ = "denetim"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    zaman: Mapped[int] = mapped_column(index=True)
    kullanici_id: Mapped[str | None]
    islem: Mapped[str]
    kaynak_id: Mapped[str | None]
