"""SQLAlchemy tabloları: hesap, açık profil ve özel randevu verisi ayrılır.

Bu sınıflar saklama biçimini tanımlar; HTTP doğrulaması schemas.py içindeki
Pydantic modellerindedir. Şema değişikliği Alembic geçişi de gerektirir.
İlişkiler yabancı anahtarla kurulur; kayıtlar kendiliğinden cascade silinmez.
ORM nesnesini doğrudan API'ye döndürmek yerine çıktı şeması kullanılmalıdır.
"""

import time
import uuid

from sqlalchemy import (
    JSON,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    column,
    select,
    table,
    text,
)
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.db import Base


def yeni_id() -> str:
    """Yeni satır için UUID üretir; kimliği bilmek erişim yetkisi vermez."""
    return str(uuid.uuid4())


def baglanti_cifti(birinci_id: str, ikinci_id: str) -> str:
    """Terapist çifti için yön bağımsız benzersizlik anahtarı üretir."""
    return ":".join(sorted((birinci_id, ikinci_id)))


_kurucu_uyelik = table(
    "founding_members",
    column("uzman_id"),
    column("kurucu_no"),
)


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
    onayli/arsivli dizin görünürlüğünü belirler. Randevu geçmişi varsa yalnız
    arşiv kullanılır; geçmişsiz hesaplar yönetici onayıyla kalıcı silinebilir.
    Liste alanları profil etiketlerini, calisma_saatleri haftalık programı
    tutar: gun=0 Pazartesi, baslangic/bitis saatleri İstanbul saatindedir.
    """

    __tablename__ = "uzmanlar"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    kullanici_adi: Mapped[str] = mapped_column(
        String(80),
        unique=True,
        index=True,
        default=lambda: f"terapist{uuid.uuid4().hex[:12]}",
    )
    uye_olma: Mapped[int] = mapped_column(default=lambda: int(time.time()))
    kullanici_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id"), unique=True
    )
    ad: Mapped[str] = mapped_column(String(150))
    unvan: Mapped[str] = mapped_column(String(100), default="")
    profil_fotografi_url: Mapped[str] = mapped_column(String(1000), default="")
    sehir: Mapped[str] = mapped_column(String(80), index=True)
    ilce: Mapped[str] = mapped_column(String(80))
    biyografi: Mapped[str] = mapped_column(Text, default="")
    terapi_yaklasimi: Mapped[str] = mapped_column(Text, default="")
    ucret: Mapped[int] = mapped_column(default=0)
    seans_suresi_dakika: Mapped[int] = mapped_column(default=60)
    deneyim_yili: Mapped[int] = mapped_column(default=0)
    # default=list her kayıt için ayrı liste üretir. JSON listesi değişirken
    # yeni liste atayın; yerinde append işlemi otomatik izlenmez.
    ekoller: Mapped[list] = mapped_column(JSON, default=list)
    kitle: Mapped[list] = mapped_column(JSON, default=list)
    formatlar: Mapped[list] = mapped_column(JSON, default=list)
    diller: Mapped[list] = mapped_column(JSON, default=lambda: ["Türkçe"])
    uzmanliklar: Mapped[list] = mapped_column(JSON, default=list)
    egitim: Mapped[list] = mapped_column(JSON, default=list)
    egitim_universite: Mapped[str] = mapped_column(String(150), default="")
    egitim_program: Mapped[str] = mapped_column(String(150), default="")
    egitim_derece: Mapped[str] = mapped_column(String(100), default="")
    kurumlar: Mapped[list] = mapped_column(JSON, default=list)
    sosyal_baglantilar: Mapped[dict] = mapped_column(JSON, default=dict)
    calisma_saatleri: Mapped[list] = mapped_column(JSON, default=list)
    adres: Mapped[str] = mapped_column(Text, default="")
    onayli: Mapped[bool] = mapped_column(default=False, index=True)
    arsivli: Mapped[bool] = mapped_column(default=False)
    davet_limiti: Mapped[int] = mapped_column(default=3)
    davet_edeni_goster: Mapped[bool] = mapped_column(default=True)
    mesleki_agi_goster: Mapped[bool] = mapped_column(default=True)
    uzmanlik_iliskilerini_goster: Mapped[bool] = mapped_column(default=True)
    tavsiyeleri_goster: Mapped[bool] = mapped_column(default=True)
    yonlendirme_agini_goster: Mapped[bool] = mapped_column(default=False)
    kurucu_durumunu_goster: Mapped[bool] = mapped_column(default=True)
    bekleme_listesi_acik: Mapped[bool] = mapped_column(default=True)
    ozel_tema_yetkisi: Mapped[bool] = mapped_column(default=False)
    tasarim_tarzi: Mapped[str] = mapped_column(
        String(24), default="klinik_modern"
    )
    tema_stili: Mapped[str] = mapped_column(String(24), default="klasik")
    vurgu_rengi: Mapped[str] = mapped_column(String(7), default="#3459d1")
    buton_stili: Mapped[str] = mapped_column(String(16), default="yuvarlak")
    yazi_tipi: Mapped[str] = mapped_column(String(24), default="modern_sans")
    yuzey_stili: Mapped[str] = mapped_column(String(24), default="temiz")
    arka_plan_gorseli_url: Mapped[str] = mapped_column(String(500), default="")
    terapistco_markasi_gizli: Mapped[bool] = mapped_column(default=False)
    # İlişkili kurucu numarası aynı Uzman sorgusundaki skaler alt sorguyla
    # okunur; dizin/eşleştirme sırasına veya sorgu sayısına etki etmez.
    kurucu_no: Mapped[int | None] = column_property(
        select(_kurucu_uyelik.c.kurucu_no)
        .where(_kurucu_uyelik.c.uzman_id == id)
        .scalar_subquery()
    )


class TerapistDogrulama(Base):
    """Uzmanın mesleki doğrulama durumunu ve yönetici incelemesini tutar."""

    __tablename__ = "therapist_verifications"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    durum: Mapped[str] = mapped_column(default="pending", index=True)
    gonderilme: Mapped[int]
    incelenme: Mapped[int | None]
    inceleyen_kullanici_id: Mapped[str | None] = mapped_column(
        ForeignKey("kullanicilar.id")
    )
    notlar: Mapped[str] = mapped_column(Text, default="")

    __table_args__ = (
        # Migration, benzersiz kısıt ve arama indeksini ayrı oluşturur.
        UniqueConstraint("uzman_id"),
        CheckConstraint(
            "durum IN ('pending', 'verified', 'rejected')",
            name="ck_therapist_verifications_durum",
        ),
    )


class Davet(Base):
    """Sınırlı terapist daveti; ham kabul anahtarı hiçbir zaman saklanmaz."""

    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    davet_eden_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    email: Mapped[str] = mapped_column(String(254), index=True)
    ad: Mapped[str] = mapped_column(String(150), default="")
    token_ozeti: Mapped[str] = mapped_column(String(64), unique=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    sure_bitimi: Mapped[int] = mapped_column(index=True)
    kabul: Mapped[int | None]
    durum: Mapped[str] = mapped_column(default="pending", index=True)
    kabul_eden_uzman_id: Mapped[str | None] = mapped_column(
        ForeignKey("uzmanlar.id"), unique=True
    )
    iliski_turu: Mapped[str] = mapped_column(default="invited_to_platform")
    onerilen_uzmanlik: Mapped[str | None] = mapped_column(String(100))

    __table_args__ = (
        CheckConstraint(
            "durum IN ('pending', 'accepted', 'expired', 'revoked')",
            name="ck_invitations_durum",
        ),
        Index(
            "uq_aktif_davet_email",
            "email",
            unique=True,
            sqlite_where=text("durum IN ('pending', 'accepted')"),
            postgresql_where=text("durum IN ('pending', 'accepted')"),
        ),
    )


class KurucuUye(Base):
    """Kalıcı ve benzersiz Founding Therapist numarasını uzmana bağlar."""

    __tablename__ = "founding_members"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    kurucu_no: Mapped[int] = mapped_column(unique=True)
    verilme: Mapped[int]
    veren_kullanici_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id")
    )

    __table_args__ = (
        UniqueConstraint("uzman_id"),
        CheckConstraint("kurucu_no > 0", name="ck_founding_members_no"),
    )


class KurucuProgramiAyari(Base):
    """Kurucu programının yönetici tarafından belirlenen tekil kapasitesi."""

    __tablename__ = "founding_program_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    azami_uye: Mapped[int] = mapped_column(default=500)
    guncelleme: Mapped[int]
    guncelleyen_kullanici_id: Mapped[str | None] = mapped_column(
        ForeignKey("kullanicilar.id")
    )

    __table_args__ = (
        CheckConstraint(
            "id = 1", name="ck_founding_program_settings_singleton"
        ),
        CheckConstraint(
            "azami_uye >= 0", name="ck_founding_program_settings_maximum"
        ),
    )


class BaglantiIliskiTuru(Base):
    """Profesyonel bağlantılarda kullanılabilen kontrollü ilişki kataloğu."""

    __tablename__ = "connection_relationship_types"

    slug: Mapped[str] = mapped_column(String(60), primary_key=True)
    ad: Mapped[str] = mapped_column(String(120))
    secilebilir: Mapped[bool] = mapped_column(default=True)
    aktif: Mapped[bool] = mapped_column(default=True)
    sira: Mapped[int] = mapped_column(default=0)


class ProfesyonelBaglanti(Base):
    """İki terapist arasındaki rızaya dayalı, yön bağımsız bağlantı."""

    __tablename__ = "professional_connections"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    isteyen_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    alici_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    cift_anahtari: Mapped[str] = mapped_column(String(73), unique=True)
    iliski_turu: Mapped[str] = mapped_column(
        ForeignKey("connection_relationship_types.slug"), index=True
    )
    durum: Mapped[str] = mapped_column(default="pending", index=True)
    istek_zamani: Mapped[int] = mapped_column(index=True)
    yanit_zamani: Mapped[int | None]

    __table_args__ = (
        CheckConstraint(
            "isteyen_uzman_id <> alici_uzman_id",
            name="ck_professional_connections_farkli_uzman",
        ),
        CheckConstraint(
            "durum IN ('pending', 'accepted', 'rejected', 'revoked')",
            name="ck_professional_connections_durum",
        ),
    )


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
    # Süre profil sonradan değişse de randevu oluşturulduğu gibi kalır.
    bitis: Mapped[int | None]
    # Eski çerez akışından kalan sütun; artık yazılmaz veya yetki vermez.
    danisan_oturum_ozeti: Mapped[str | None] = mapped_column(
        String(64), index=True
    )
    # Ham özel bağlantı anahtarı saklanmaz; yenileme eski linki iptal eder.
    takip_anahtar_ozeti: Mapped[str | None] = mapped_column(String(64))
    takip_son_kullanim: Mapped[int | None]
    # Yeniden planlamada yanıt süresi sıfırlanır; oluşturma tarihi korunur.
    son_talep_zamani: Mapped[int | None]
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
    """Çalışılmayan bir alan için uzmandan uzmana yönlü tavsiye.

    Birleşik anahtar aynı meslektaşın birden çok kez eklenmesini engeller.
    Alan sahipliği, kendi kendine tavsiye ve doğrulama API'de denetlenir.
    """

    __tablename__ = "tavsiyeler"

    veren_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    alan_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    uzmanlik: Mapped[str] = mapped_column(
        String(100), default="Genel yönlendirme"
    )
    olusturma: Mapped[int] = mapped_column(default=0)


class DanisanYonlendirme(Base):
    """Kimlik veya sağlık verisi içermeyen, token ile açılan yönlendirme."""

    __tablename__ = "client_referrals"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    yonlendiren_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    token_ozeti: Mapped[str] = mapped_column(String(64), unique=True)
    neden: Mapped[str] = mapped_column(String(40), index=True)
    durum: Mapped[str] = mapped_column(default="active", index=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    sure_bitimi: Mapped[int] = mapped_column(index=True)
    goruntulenme_sayisi: Mapped[int] = mapped_column("view_count", default=0)

    __table_args__ = (
        CheckConstraint(
            "neden IN ('schedule_full', 'outside_specialty', 'age_group', "
            "'location', 'budget', 'therapy_format', 'psychiatry', 'other')",
            name="ck_client_referrals_reason",
        ),
        CheckConstraint(
            "durum IN ('active', 'expired', 'revoked')",
            name="ck_client_referrals_status",
        ),
        CheckConstraint(
            "view_count >= 0",
            name="ck_client_referrals_view_count",
        ),
    )


class YonlendirmeHedefi(Base):
    """Yönlendirme sayfasında gösterilecek sıralı doğrulanmış profiller."""

    __tablename__ = "referral_targets"

    yonlendirme_id: Mapped[str] = mapped_column(
        ForeignKey("client_referrals.id"), primary_key=True
    )
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    sira: Mapped[int]


class YonlendirmeOlayi(Base):
    """Kişisel ziyaretçi verisi olmadan yönlendirme dönüşüm olayları."""

    __tablename__ = "referral_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    yonlendirme_id: Mapped[str] = mapped_column(
        ForeignKey("client_referrals.id"), index=True
    )
    olay: Mapped[str] = mapped_column(String(50), index=True)
    hedef_uzman_id: Mapped[str | None] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    zaman: Mapped[int] = mapped_column(index=True)

    __table_args__ = (
        CheckConstraint(
            "olay IN ('referral_created', 'referral_opened', "
            "'profile_clicked_from_referral')",
            name="ck_referral_events_event",
        ),
    )


class ProfilKaynagi(Base):
    """Terapistin açık profilindeki sıralanabilir kaynak bağlantısı."""

    __tablename__ = "profile_resources"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    baslik: Mapped[str] = mapped_column(String(120))
    aciklama: Mapped[str] = mapped_column(String(240), default="")
    url: Mapped[str] = mapped_column(String(1000))
    kategori: Mapped[str] = mapped_column(String(20), default="diger")
    sira: Mapped[int] = mapped_column(default=0)
    tiklama_sayisi: Mapped[int] = mapped_column(default=0)
    olusturma: Mapped[int] = mapped_column(index=True)
    vurgulu: Mapped[bool] = mapped_column(default=False)
    vurgu_etiketi: Mapped[str] = mapped_column(String(40), default="")
    baslangic_zamani: Mapped[int | None] = mapped_column(
        nullable=True, index=True
    )
    bitis_zamani: Mapped[int | None] = mapped_column(nullable=True, index=True)
    sifre_ozeti: Mapped[str | None] = mapped_column(String(255), nullable=True)
    medya_turu: Mapped[str] = mapped_column(String(16), default="none")
    medya_embed_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "kategori IN ('yazi', 'kitap', 'podcast', 'diger')",
            name="ck_profile_resources_kategori",
        ),
        CheckConstraint("sira >= 0", name="ck_profile_resources_sira"),
        CheckConstraint(
            "tiklama_sayisi >= 0", name="ck_profile_resources_clicks"
        ),
        CheckConstraint(
            "medya_turu IN ('none', 'youtube', 'spotify')",
            name="ck_profile_resources_medya_turu",
        ),
    )


class BeklemeListesiKaydi(Base):
    """Takvim dolu olduğunda ziyaretçinin şifreli bekleme listesi kaydı."""

    __tablename__ = "waitlist_entries"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id", ondelete="CASCADE"), index=True
    )
    danisan_sifreli: Mapped[str] = mapped_column(Text)
    tercih_format: Mapped[str] = mapped_column(String(20), default="farketmez")
    tercih_zaman: Mapped[str] = mapped_column(String(20), default="esnek")
    durum: Mapped[str] = mapped_column(
        String(24), default="bekliyor", index=True
    )
    aydinlatma_surumu: Mapped[str] = mapped_column(String(40))
    olusturma: Mapped[int] = mapped_column(index=True)
    guncelleme: Mapped[int | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            "tercih_format IN ('farketmez', 'cevrim_ici', 'yuz_yuze')",
            name="ck_waitlist_entries_format",
        ),
        CheckConstraint(
            "tercih_zaman IN "
            "('esnek', 'sabah', 'ogleden_sonra', 'aksam', 'hafta_sonu')",
            name="ck_waitlist_entries_zaman",
        ),
        CheckConstraint(
            "durum IN ('bekliyor', 'iletisime_gecildi', 'kapandi')",
            name="ck_waitlist_entries_durum",
        ),
    )


class WebsiteRozeti(Base):
    """Doğrulanmış terapistin dış sitesinde kullanacağı tekil rozet."""

    __tablename__ = "website_badges"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), unique=True, index=True
    )
    olusturma: Mapped[int] = mapped_column(index=True)

    # Mevcut migration benzersiz indeks yanında bu kısıtı da tanımlar.
    __table_args__ = (UniqueConstraint("uzman_id"),)


class WebsiteRozetiOlayi(Base):
    """Ziyaretçi verisi tutmadan rozet oluşturma ve tıklama olayı."""

    __tablename__ = "website_badge_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    rozet_id: Mapped[str] = mapped_column(
        ForeignKey("website_badges.id"), index=True
    )
    olay: Mapped[str] = mapped_column(String(30), index=True)
    zaman: Mapped[int] = mapped_column(index=True)

    __table_args__ = (
        CheckConstraint(
            "olay IN ('badge_created', 'badge_clicked')",
            name="ck_website_badge_events_event",
        ),
    )


class MeslektasUzmanlikIliskisi(Base):
    """Bir meslektaşın terapisti belirli bir çalışma alanıyla eşlemesi.

    Kayıt puan veya kalite değerlendirmesi değildir. Bir katkıda bulunan
    aynı hedef ve alan için yalnız bir kez sayılır; bağlam açık profilde
    yayımlanmaz.
    """

    __tablename__ = "peer_specialty_associations"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    iliskilendiren_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    hedef_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    uzmanlik: Mapped[str] = mapped_column(String(100), index=True)
    profesyonel_baglam: Mapped[str] = mapped_column(String(40), index=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    guncelleme: Mapped[int] = mapped_column(index=True)

    __table_args__ = (
        UniqueConstraint(
            "iliskilendiren_uzman_id",
            "hedef_uzman_id",
            "uzmanlik",
            name="uq_peer_specialty_association",
        ),
        CheckConstraint(
            "iliskilendiren_uzman_id <> hedef_uzman_id",
            name="ck_peer_specialty_associations_farkli_uzman",
        ),
        CheckConstraint(
            "profesyonel_baglam IN ('worked_together', "
            "'same_training_program', 'supervision_context', "
            "'referred_client_to', 'received_client_referral', "
            "'follows_professional_work', 'referral_relationship')",
            name="ck_peer_specialty_associations_context",
        ),
    )


class UzmanEngeli(Base):
    """Bir terapistin başka bir terapistle etkileşimini iki yönde durdurur."""

    __tablename__ = "therapist_blocks"

    engelleyen_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    engellenen_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    olusturma: Mapped[int] = mapped_column(index=True)

    __table_args__ = (
        CheckConstraint(
            "engelleyen_uzman_id <> engellenen_uzman_id",
            name="ck_therapist_blocks_farkli_uzman",
        ),
    )


class ModerasyonRaporu(Base):
    """Bağlantı veya yanlış alan ilişkisi için yönetici inceleme kaydı."""

    __tablename__ = "moderation_reports"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    raporlayan_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    hedef_uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    tur: Mapped[str] = mapped_column(String(40), index=True)
    kaynak_id: Mapped[str] = mapped_column(index=True)
    aciklama: Mapped[str] = mapped_column(String(500), default="")
    durum: Mapped[str] = mapped_column(default="open", index=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    incelenme: Mapped[int | None]
    inceleyen_kullanici_id: Mapped[str | None] = mapped_column(
        ForeignKey("kullanicilar.id")
    )

    __table_args__ = (
        CheckConstraint(
            "tur IN ('connection', 'false_relationship')",
            name="ck_moderation_reports_type",
        ),
        CheckConstraint(
            "durum IN ('open', 'resolved', 'dismissed')",
            name="ck_moderation_reports_status",
        ),
    )


class GoogleTakvimBaglantisi(Base):
    """Uzmanın Google Takvim yetkisi ve son alınan dolu/müsait aralıklar.

    token_sifreli yenileme/erişim anahtarlarını, hesap_sifreli Google
    e-postasını, takvim listesini ve uzmanın takvim seçimlerini şifreli JSON
    olarak tutar. Etkinlik başlığı, açıklaması veya katılımcısı hiçbir zaman
    alınmaz; yalnız Google FreeBusy yanıtındaki zaman aralıkları saklanır.
    dolu_araliklar ve musait_araliklar [baslangic, bitis] Unix saniyesi
    çiftleridir. musait_araliklar None ise haftalık Terapist.co saatleri
    kullanılır. durum='koptu' yetkinin Google tarafında kaldırıldığını
    belirtir; uzman yeniden bağlanana kadar son bilinen aralıklar korunur.
    """

    __tablename__ = "google_calendar_connections"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), unique=True, index=True
    )
    token_sifreli: Mapped[str] = mapped_column(Text)
    hesap_sifreli: Mapped[str] = mapped_column(Text)
    durum: Mapped[str] = mapped_column(String(20), default="aktif")
    dolu_araliklar: Mapped[list] = mapped_column(JSON, default=list)
    musait_araliklar: Mapped[list | None] = mapped_column(JSON)
    son_senkron: Mapped[int | None]
    son_deneme: Mapped[int | None]
    son_hata: Mapped[str | None] = mapped_column(String(40))
    olusturma: Mapped[int]
    guncelleme: Mapped[int]

    __table_args__ = (
        # Mevcut şemadaki ayrı kısıt, indeks ile birlikte korunur.
        UniqueConstraint("uzman_id"),
        CheckConstraint(
            "durum IN ('aktif', 'koptu')",
            name="ck_google_calendar_connections_durum",
        ),
    )


class RandevuTakvimIsi(Base):
    """Randevuyla aynı işlemde kaydedilen, yeniden denenebilir Google işi.

    Tek satır her zaman randevunun en son durumunu temsil eder. Google
    yanıtı kaybolsa bile aynı etkinlik kimliği mükerrer kaydı önler.
    """

    __tablename__ = "appointment_calendar_jobs"

    randevu_id: Mapped[str] = mapped_column(
        ForeignKey("randevular.id", ondelete="CASCADE"), primary_key=True
    )
    baglanti_id: Mapped[str] = mapped_column(
        ForeignKey("google_calendar_connections.id", ondelete="CASCADE"),
        index=True,
    )
    etkinlik_id: Mapped[str] = mapped_column(String(64))
    hedef_durum: Mapped[str] = mapped_column(String(20))
    durum: Mapped[str] = mapped_column(String(20), default="bekliyor")
    deneme: Mapped[int] = mapped_column(default=0)
    sonraki_deneme: Mapped[int] = mapped_column(default=0, index=True)
    son_hata: Mapped[str | None] = mapped_column(String(40))


class GoogleTakvimKanali(Base):
    """Google Calendar push notification (watch) kanalı.

    Her seçili takvim için tek bir aktif izleme kanalı tutulur. Google'dan
    gelen webhook bildirimleri kanal kimliği, kaynak kimliği ve
    dogrulama_ozeti (SHA-256) ile doğrulanır; ham kanal belirteci saklanmaz.
    """

    __tablename__ = "google_calendar_channels"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    baglanti_id: Mapped[str] = mapped_column(
        ForeignKey("google_calendar_connections.id"), index=True
    )
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    takvim_id: Mapped[str] = mapped_column(String(300))
    kaynak_id: Mapped[str] = mapped_column(String(300), default="")
    dogrulama_ozeti: Mapped[str] = mapped_column(String(64))
    bitis: Mapped[int] = mapped_column(index=True)
    son_bildirim: Mapped[int | None]
    olusturma: Mapped[int]

    __table_args__ = (
        UniqueConstraint(
            "baglanti_id",
            "takvim_id",
            name="uq_google_calendar_channels_baglanti_takvim",
        ),
    )


class AnalitikAyari(Base):
    """Site geneli GA4 ölçüm kimliği ve Google Analytics Data API ayarları.

    google_kimlik_sifreli yalnızca yönetici tarafından yapılandırılan OAuth
    yenileme belirteçlerini veya Hizmet Hesabı (Service Account) JSON
    kimlik bilgisini Fernet ile şifrelenmiş olarak saklar; hiçbir zaman dışa
    açık döndürülmez.
    """

    __tablename__ = "analytics_settings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    ga_olcum_kimligi: Mapped[str | None] = mapped_column(String(32))
    ga4_mulk_kimligi: Mapped[str | None] = mapped_column(String(32))
    olcum_etkin: Mapped[bool] = mapped_column(default=True)
    google_baglanti_durumu: Mapped[str] = mapped_column(
        String(30), default="bagli_degil"
    )
    google_kimlik_sifreli: Mapped[str | None] = mapped_column(Text)
    google_hesap_etiketi: Mapped[str | None] = mapped_column(String(160))
    son_ga4_senkron: Mapped[int | None]
    son_ga4_hata: Mapped[str | None] = mapped_column(String(80))
    ga4_onbellek: Mapped[dict | None] = mapped_column(JSON)
    guncelleme: Mapped[int] = mapped_column(default=0)

    __table_args__ = (
        CheckConstraint(
            "google_baglanti_durumu IN "
            "('bagli_degil', 'oauth_bagli', 'hizmet_hesabi', 'koptu')",
            name="ck_analytics_settings_baglanti_durumu",
        ),
    )


class TrafikOlayi(Base):
    """Kişisel ziyaretçi verisi veya IP adresi içermeyen toplulaştırılabilir
    site ölçüm ve kaynak olayları.
    """

    __tablename__ = "traffic_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    zaman: Mapped[int] = mapped_column(index=True)
    tarih_gun: Mapped[str] = mapped_column(String(10), index=True)
    ziyaretci_karma: Mapped[str] = mapped_column(String(32), index=True)
    olay_turu: Mapped[str] = mapped_column(String(32), index=True)
    sayfa_yolu: Mapped[str] = mapped_column(String(200))
    sayfa_turu: Mapped[str] = mapped_column(String(32), index=True)
    uzman_id: Mapped[str | None] = mapped_column(
        ForeignKey("uzmanlar.id"), index=True
    )
    kaynak_kategorisi: Mapped[str] = mapped_column(String(32), index=True)
    kaynak_etiketi: Mapped[str] = mapped_column(String(80))
    kaynak_alani: Mapped[str] = mapped_column(String(120), default="")
    utm_kaynak: Mapped[str] = mapped_column(String(60), default="")
    sehir: Mapped[str] = mapped_column(String(80), default="Bilinmiyor")
    ulke: Mapped[str] = mapped_column(String(60), default="TR")
    cihaz: Mapped[str] = mapped_column(String(20), default="bilinmiyor")
    hedef_kaynak_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )

    __table_args__ = (
        CheckConstraint(
            "olay_turu IN ('page_view', 'profile_view', "
            "'directory_search', 'booking_drawer_open', 'booking_submitted', "
            "'resource_click', 'link_unlock', 'waitlist_submitted', "
            "'embed_play', 'qr_scan')",
            name="ck_traffic_events_olay_turu",
        ),
        CheckConstraint(
            "sayfa_turu IN ('ana_sayfa', 'dizin', 'terapist_profili', "
            "'yonlendirme', 'basvuru', 'diger')",
            name="ck_traffic_events_sayfa_turu",
        ),
        CheckConstraint(
            "kaynak_kategorisi IN ('instagram', 'youtube', 'google', "
            "'linkedin', 'facebook', 'x', 'diger_site', 'platform_ici', "
            "'dogrudan')",
            name="ck_traffic_events_kaynak_kategorisi",
        ),
        CheckConstraint(
            "cihaz IN ('masaustu', 'mobil', 'tablet', 'bilinmiyor')",
            name="ck_traffic_events_cihaz",
        ),
    )


class RandevuBildirimi(Base):
    """Yöneticinin randevu özelinde uzmana gönderdiği bildirim."""

    __tablename__ = "appointment_notifications"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    randevu_id: Mapped[str] = mapped_column(
        ForeignKey("randevular.id", ondelete="CASCADE"), index=True
    )
    uzman_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id", ondelete="CASCADE"), index=True
    )
    gonderen_kullanici_id: Mapped[str | None] = mapped_column(
        ForeignKey("kullanicilar.id"), nullable=True
    )
    tur: Mapped[str] = mapped_column(String(32), default="hatirlatma")
    mesaj: Mapped[str] = mapped_column(String(500))
    okundu: Mapped[bool] = mapped_column(default=False, index=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    okunma_zamani: Mapped[int | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            "tur IN ('hatirlatma', 'eskalasyon', 'durum_degisikligi')",
            name="ck_appointment_notifications_tur",
        ),
    )


class Bildirim(Base):
    """Hem yöneticiler hem terapistler için birleşik site içi bildirimler."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    alici_kullanici_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id", ondelete="CASCADE"), index=True
    )
    gonderen_kullanici_id: Mapped[str | None] = mapped_column(
        ForeignKey("kullanicilar.id"), nullable=True
    )
    randevu_id: Mapped[str | None] = mapped_column(
        ForeignKey("randevular.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tur: Mapped[str] = mapped_column(String(32), default="admin_notu")
    baslik: Mapped[str] = mapped_column(String(120))
    mesaj: Mapped[str] = mapped_column(String(600))
    hedef_yol: Mapped[str] = mapped_column(String(200), default="")
    kaynak_anahtari: Mapped[str | None] = mapped_column(
        String(120), unique=True, nullable=True
    )
    okundu: Mapped[bool] = mapped_column(default=False, index=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    okunma_zamani: Mapped[int | None] = mapped_column(nullable=True)

    __table_args__ = (
        CheckConstraint(
            "tur IN ('yeni_randevu', 'randevu_hatirlatma', "
            "'sistem_hatirlatma', 'randevu_guncelleme', 'admin_notu')",
            name="ck_notifications_tur",
        ),
    )


class MesajKonusu(Base):
    """Kullanıcılar (terapist-terapist veya yönetici-terapist) arası konu."""

    __tablename__ = "message_threads"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    baslik: Mapped[str] = mapped_column(String(120))
    katilimci_a_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id", ondelete="CASCADE"), index=True
    )
    katilimci_b_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id", ondelete="CASCADE"), index=True
    )
    son_mesaj_zamani: Mapped[int] = mapped_column(index=True)
    olusturma: Mapped[int] = mapped_column(index=True)

    __table_args__ = (
        CheckConstraint(
            "katilimci_a_id <> katilimci_b_id",
            name="ck_message_threads_farkli_kullanici",
        ),
    )


class KonuMesaji(Base):
    """Bir mesaj konusu içindeki tekil mesaj ve okunma durumu."""

    __tablename__ = "thread_messages"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    konu_id: Mapped[str] = mapped_column(
        ForeignKey("message_threads.id", ondelete="CASCADE"), index=True
    )
    gonderen_kullanici_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id", ondelete="CASCADE"), index=True
    )
    alici_kullanici_id: Mapped[str] = mapped_column(
        ForeignKey("kullanicilar.id", ondelete="CASCADE"), index=True
    )
    icerik: Mapped[str] = mapped_column(String(2000))
    okundu: Mapped[bool] = mapped_column(default=False, index=True)
    olusturma: Mapped[int] = mapped_column(index=True)
    okunma_zamani: Mapped[int | None] = mapped_column(nullable=True)


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
