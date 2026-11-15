"""Türkçe API sözleşmeleri; bilinmeyen alanlar kabul edilmez."""

import re
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)

KisaMetin = Annotated[str, Field(min_length=1, max_length=100)]
IliskiTuru = Literal[
    "colleague",
    "worked_together",
    "same_institution",
    "training_colleague",
    "supervision_relationship",
    "professional_acquaintance",
]
YonlendirmeNedeni = Literal[
    "schedule_full",
    "outside_specialty",
    "age_group",
    "location",
    "budget",
    "therapy_format",
    "psychiatry",
    "other",
]
MeslektasBaglami = Literal[
    "worked_together",
    "same_training_program",
    "supervision_context",
    "referred_client_to",
    "received_client_referral",
    "follows_professional_work",
]


class Sema(BaseModel):
    model_config = ConfigDict(
        extra="forbid", str_strip_whitespace=True, from_attributes=True
    )


class CalismaSaati(Sema):
    gun: int = Field(ge=0, le=6)
    baslangic: int = Field(ge=0, le=23)
    bitis: int = Field(ge=1, le=24)

    @model_validator(mode="after")
    def sirala(self):
        if self.bitis <= self.baslangic:
            raise ValueError("Bitiş, başlangıçtan sonra olmalıdır.")
        return self


class ProfilGirdi(Sema):
    ad: str = Field(min_length=3, max_length=150)
    unvan: str = Field(default="", max_length=100)
    profil_fotografi_url: str = Field(default="", max_length=1000)
    sehir: str = Field(min_length=2, max_length=80)
    ilce: str = Field(min_length=2, max_length=80)
    biyografi: str = Field(min_length=20, max_length=5000)
    terapi_yaklasimi: str = Field(default="", max_length=2000)
    ucret: int = Field(ge=0, le=100000)
    seans_suresi_dakika: Literal[30, 45, 50, 60] = 60
    deneyim_yili: int = Field(default=0, ge=0, le=70)
    ekoller: list[KisaMetin] = Field(default_factory=list, max_length=20)
    kitle: list[KisaMetin] = Field(default_factory=list, max_length=10)
    formatlar: list[Literal["Çevrim içi", "Yüz yüze"]] = Field(
        min_length=1, max_length=2
    )
    diller: list[KisaMetin] = Field(
        default_factory=lambda: ["Türkçe"], min_length=1, max_length=10
    )
    uzmanliklar: list[KisaMetin] = Field(default_factory=list, max_length=30)
    egitim: list[KisaMetin] = Field(default_factory=list, max_length=15)
    egitim_universite: str = Field(default="", max_length=150)
    egitim_program: str = Field(default="", max_length=150)
    egitim_derece: str = Field(default="", max_length=100)
    kurumlar: list[KisaMetin] = Field(default_factory=list, max_length=15)
    sosyal_baglantilar: dict[
        Literal["instagram", "linkedin", "x", "youtube", "website"], str
    ] = Field(default_factory=dict, max_length=5)
    adres: str = Field(default="", max_length=500)
    calisma_saatleri: list[CalismaSaati] = Field(
        default_factory=list, max_length=7
    )

    @field_validator("calisma_saatleri")
    @classmethod
    def tek_gun(cls, value):
        if len({item.gun for item in value}) != len(value):
            raise ValueError("Her gün yalnızca bir kez tanımlanabilir.")
        return value

    @field_validator("profil_fotografi_url")
    @classmethod
    def guvenli_fotograf_adresi(cls, value: str) -> str:
        if not value:
            return value
        if re.fullmatch(r"/api/medya/profil/[a-f0-9]{32}\.webp", value):
            return value
        parsed = urlsplit(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError(
                "Profil fotoğrafı yüklenen WebP dosyası veya geçerli "
                "bir HTTPS adresi olmalıdır."
            )
        return value

    @field_validator("sosyal_baglantilar")
    @classmethod
    def guvenli_sosyal_baglantilar(
        cls, values: dict[str, str]
    ) -> dict[str, str]:
        allowed = {
            "instagram": {"instagram.com", "www.instagram.com"},
            "linkedin": {"linkedin.com", "www.linkedin.com"},
            "x": {"x.com", "www.x.com", "twitter.com", "www.twitter.com"},
            "youtube": {"youtube.com", "www.youtube.com", "youtu.be"},
        }
        result = {}
        for key, value in values.items():
            if not value:
                continue
            parsed = urlsplit(value)
            if (
                parsed.scheme != "https"
                or not parsed.hostname
                or parsed.username
                or parsed.password
                or (
                    key in allowed
                    and parsed.hostname.lower() not in allowed[key]
                )
            ):
                raise ValueError(
                    f"{key} için geçerli bir HTTPS bağlantısı girin."
                )
            result[key] = value
        return result


class ProfilCikti(ProfilGirdi):
    id: str
    kullanici_adi: str
    uye_olma: int
    kurucu_no: int | None = None
    onayli: bool
    arsivli: bool


class KaynakGirdi(Sema):
    baslik: str = Field(min_length=3, max_length=120)
    aciklama: str = Field(default="", max_length=240)
    url: str = Field(max_length=1000)
    kategori: Literal["yazi", "kitap", "podcast", "diger"] = "diger"
    vurgulu: bool = False
    vurgu_etiketi: str = Field(default="", max_length=40)
    baslangic_zamani: int | None = Field(default=None, ge=0)
    bitis_zamani: int | None = Field(default=None, ge=0)
    erisim_kodu: str | None = Field(default=None, max_length=32)
    kilidi_kaldir: bool = False
    medya_gomme: bool = True

    @field_validator("url")
    @classmethod
    def guvenli_adres(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError(
                "Kaynak bağlantısı geçerli bir HTTPS adresi olmalıdır."
            )
        return value

    @field_validator("erisim_kodu")
    @classmethod
    def gecerli_erisim_kodu(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if len(cleaned) < 4:
            raise ValueError("Erişim kodu en az 4 karakter olmalıdır.")
        return cleaned

    @model_validator(mode="after")
    def zaman_araligi_gecerli(self):
        if (
            self.baslangic_zamani is not None
            and self.bitis_zamani is not None
            and self.bitis_zamani <= self.baslangic_zamani
        ):
            raise ValueError(
                "Bitiş zamanı başlangıç zamanından sonra olmalıdır."
            )
        return self


class KaynakCikti(Sema):
    id: str
    baslik: str
    aciklama: str
    url: str
    kategori: Literal["yazi", "kitap", "podcast", "diger"]
    sira: int
    tiklama_sayisi: int
    olusturma: int
    vurgulu: bool = False
    vurgu_etiketi: str = ""
    baslangic_zamani: int | None = None
    bitis_zamani: int | None = None
    kilitli: bool = False
    zaman_durumu: Literal["aktif", "planli", "suresi_doldu"] = "aktif"
    medya_turu: Literal["none", "youtube", "spotify"] = "none"
    medya_embed_url: str | None = None


class KaynakAcGirdi(Sema):
    kod: str = Field(min_length=4, max_length=32)


class KaynakAcCikti(Sema):
    id: str
    url: str
    medya_turu: Literal["none", "youtube", "spotify"] = "none"
    medya_embed_url: str | None = None


class KaynakSirasiGirdi(Sema):
    ids: list[str] = Field(min_length=1, max_length=20)


class GorunurlukAyarlari(Sema):
    davet_edeni_goster: bool = True
    mesleki_agi_goster: bool = True
    uzmanlik_iliskilerini_goster: bool = True
    tavsiyeleri_goster: bool = True
    yonlendirme_agini_goster: bool = False
    kurucu_durumunu_goster: bool = True


class ModerasyonRaporGirdi(Sema):
    aciklama: str = Field(default="", max_length=500)


class ModerasyonDurumuGirdi(Sema):
    durum: Literal["resolved", "dismissed"]


class EslestirmeGirdi(Sema):
    """Kesin filtreler ve puanlanan tercihler; danışan kimliği alınmaz.

    Destek alanı ve yaklaşım listeleri OR filtresi değildir: her eşleşme
    kapsama oranına katkı sağlar. Diğer alanlar sonuçları kesin olarak eler.
    """

    arama: str = Field(default="", max_length=150)
    sehir: str = Field(default="", max_length=80)
    kitle: str = Field(default="", max_length=100)
    format: Literal["", "Çevrim içi", "Yüz yüze"] = ""
    dil: str = Field(default="", max_length=100)
    meslektas_alani: str = Field(default="", max_length=100)
    deneyim: int = Field(default=0, ge=0, le=70)
    azami_ucret: int | None = Field(default=None, ge=0, le=100000)
    uzmanliklar: list[KisaMetin] = Field(default_factory=list, max_length=5)
    ekoller: list[KisaMetin] = Field(default_factory=list, max_length=3)
    sayfa: int = Field(default=1, ge=1, le=100000)
    sirala: Literal["eslesme", "ad", "ucret_artan", "ucret_azalan"] = "eslesme"

    @field_validator("uzmanliklar", "ekoller")
    @classmethod
    def tekrar_gider(cls, values: list[str]) -> list[str]:
        """Aynı tercihin tekrar gönderilmesi ağırlığı artırmasın."""
        return list(dict.fromkeys(values))


class EslesmeAciklamasi(Sema):
    """Tercih uyumu; başarı olasılığı veya klinik uygunluk ölçümü değildir."""

    puan: float | None = Field(default=None, ge=0, le=100)
    eslesen_alanlar: list[str]
    eslesen_ekoller: list[str]
    eksik_alanlar: list[str]
    eksik_ekoller: list[str]


class MeslektasAlanSinyali(Sema):
    """Kalite veya sıralama puanı olmayan meslektaş alan ilişkilendirmesi."""

    uzmanlik: str
    meslektas_sayisi: int = Field(ge=1)


class EslesenProfil(ProfilCikti):
    eslesme: EslesmeAciklamasi
    meslektas_alanlari: list[MeslektasAlanSinyali] = Field(
        default_factory=list
    )


class EslestirmeCikti(Sema):
    """Sayfalama tüm adaylar puanlandıktan sonra uygulanır."""

    toplam: int
    sayfa: int
    sonuclar: list[EslesenProfil]
    surum: str = "tercih-v1"


RESERVED_USERNAMES = frozenset(
    {
        "api",
        "assets",
        "aydinlatma",
        "badge",
        "basvuru",
        "cozumler",
        "davet",
        "favicon",
        "giris",
        "karsilastirma",
        "kesfet",
        "panel",
        "passport",
        "passport-assets",
        "r",
        "rehber",
        "uzman",
        "yonetim",
        "admin",
    }
)


class KayitGirdi(Sema):
    email: EmailStr
    parola: SecretStr = Field(min_length=14, max_length=128)
    profil: ProfilGirdi
    kullanici_adi: str | None = Field(
        default=None,
        min_length=3,
        max_length=40,
        pattern=r"^[a-z][a-z0-9]*[a-z0-9]$",
    )

    @field_validator("kullanici_adi")
    @classmethod
    def ayrilmis_adlari_reddet(cls, value: str | None) -> str | None:
        if value in RESERVED_USERNAMES:
            raise ValueError("Bu profil adresi kullanılamaz.")
        return value


class DavetKabulGirdi(Sema):
    parola: SecretStr = Field(min_length=14, max_length=128)
    profil: ProfilGirdi


class DavetGirdi(Sema):
    email: EmailStr
    ad: str = Field(default="", max_length=150)
    uzmanlik: str | None = Field(default=None, min_length=1, max_length=100)


class DavetLimitiGirdi(Sema):
    davet_limiti: int = Field(ge=0, le=100)


class KurucuProgramiGirdi(Sema):
    azami_uye: int = Field(ge=0, le=1_000_000)


class KurucuProgramiCikti(Sema):
    azami_uye: int
    atanmis_uye: int
    kalan: int
    siradaki_numara: int | None


class KurucuUyeEkleGirdi(Sema):
    uzman_id: str = Field(min_length=1, max_length=36)


class WebsiteRozetiCikti(Sema):
    id: str
    olusturma: int
    pasaport_url: str
    profil_url: str
    tiklama_url: str
    gorsel_url: str
    embed_code: str


class WebsiteRozetiOzeti(Sema):
    uygun: bool
    rozet: WebsiteRozetiCikti | None


class BaglantiIstegiGirdi(Sema):
    iliski_turu: IliskiTuru


class BaglantiYanitGirdi(Sema):
    durum: Literal["accepted", "rejected"]


class GirisGirdi(Sema):
    email: EmailStr
    parola: SecretStr = Field(min_length=1, max_length=128)
    dogrulama_kodu: str = Field(default="", pattern=r"^(\d{6})?$")


class RandevuGirdi(Sema):
    uzman_id: str
    baslangic: AwareDatetime
    ad: str = Field(min_length=3, max_length=150)
    telefon: str = Field(pattern=r"^\+?[0-9 ()-]{10,20}$")
    aydinlatma_okundu: Literal[True]
    aydinlatma_surumu: str = Field(max_length=100)


class RandevuCikti(Sema):
    id: str
    uzman_id: str
    baslangic: datetime
    ad: str
    telefon: str
    durum: str


class DurumGirdi(Sema):
    durum: Literal["onaylandi", "reddedildi", "iptal"]


class BeklemeListesiGirdi(Sema):
    uzman_id: str = Field(min_length=1, max_length=36)
    ad: str = Field(min_length=3, max_length=150)
    telefon: str = Field(pattern=r"^\+?[0-9 ()-]{10,20}$")
    email: EmailStr | None = None
    tercih_format: Literal["farketmez", "cevrim_ici", "yuz_yuze"] = "farketmez"
    tercih_zaman: Literal[
        "esnek", "sabah", "ogleden_sonra", "aksam", "hafta_sonu"
    ] = "esnek"
    aydinlatma_okundu: Literal[True]
    aydinlatma_surumu: str = Field(max_length=100)

    @field_validator("email", mode="before")
    @classmethod
    def bos_email(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value


class BeklemeListesiDurumGirdi(Sema):
    durum: Literal["bekliyor", "iletisime_gecildi", "kapandi"]


class BeklemeListesiKaydiCikti(Sema):
    id: str
    ad: str
    telefon: str
    email: str | None = None
    tercih_format: str
    tercih_zaman: str
    durum: str
    olusturma: int
    guncelleme: int | None = None


class TemaAyarlariGirdi(Sema):
    bekleme_listesi_acik: bool = True
    tasarim_tarzi: Literal[
        "klinik_modern", "editoryal_serif", "organik_sakin", "yumusak_cam"
    ] = "klinik_modern"
    tema_stili: Literal[
        "klasik",
        "toprak",
        "orman",
        "okyanus",
        "gece",
        "lavanta",
        "kizilcik",
        "ada_cayi",
        "ozel",
    ] = "klasik"
    vurgu_rengi: str = Field(default="#3459d1", pattern=r"^#[0-9a-fA-F]{6}$")
    buton_stili: Literal[
        "yuvarlak",
        "yastik",
        "keskin",
        "cerceveli",
        "yumusak_golge",
        "cam_efekti",
    ] = "yuvarlak"
    yazi_tipi: Literal[
        "modern_sans", "editoryal_serif", "humanist_sakin", "geometrik_net"
    ] = "modern_sans"
    yuzey_stili: Literal["temiz", "krem", "pastel", "buzlu"] = "temiz"
    arka_plan_gorseli_url: str = Field(default="", max_length=500)
    terapistco_markasi_gizli: bool = False

    @field_validator("vurgu_rengi")
    @classmethod
    def kucuk_renk_kodu(cls, value: str) -> str:
        return value.lower()

    @field_validator("arka_plan_gorseli_url")
    @classmethod
    def guvenli_arka_plan_gorseli(cls, value: str) -> str:
        if not value:
            return ""
        parsed = urlsplit(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or any(ch in value for ch in ('"', "'", "<", ">", "\n", "\r", "\t"))
        ):
            raise ValueError(
                "Arka plan görseli Unsplash gibi güvenilir bir kaynaktan "
                "geçerli bir HTTPS görsel adresi olmalıdır."
            )
        return value


class TemaAyarlariCikti(TemaAyarlariGirdi):
    ozel_tema_yetkisi: bool = False
    premium_etkin: bool = False
    marka_gizleme_etkin: bool = False


class YonetimTemaYetkisiGirdi(Sema):
    ozel_tema_yetkisi: bool


class OnayGirdi(Sema):
    onayli: bool


class TavsiyeOlusturGirdi(Sema):
    uzmanlik: KisaMetin
    uzman_id: str = Field(min_length=1, max_length=36)


class DanisanYonlendirmeGirdi(Sema):
    neden: YonlendirmeNedeni
    uzman_ids: list[str] = Field(min_length=1, max_length=3)

    @field_validator("uzman_ids")
    @classmethod
    def benzersiz_uzmanlar(cls, values: list[str]) -> list[str]:
        if len(set(values)) != len(values):
            raise ValueError("Aynı terapist bir kez seçilebilir.")
        return values


class MeslektasUzmanlikGirdi(Sema):
    profesyonel_baglam: MeslektasBaglami
    uzmanlik: KisaMetin


TakvimKimligi = Annotated[str, Field(min_length=1, max_length=300)]


class GoogleTakvimAyarGirdi(Sema):
    """Müsaitlik kaynağı ve çakışma için kontrol edilecek takvimler."""

    musaitlik_takvimi: TakvimKimligi | None = None
    dolu_takvimleri: list[TakvimKimligi] = Field(max_length=20)

    @model_validator(mode="after")
    def tutarli(self):
        if len(set(self.dolu_takvimleri)) != len(self.dolu_takvimleri):
            raise ValueError("Aynı takvim bir kez seçilebilir.")
        if self.musaitlik_takvimi in self.dolu_takvimleri:
            raise ValueError(
                "Müsaitlik takvimi dolu zaman takvimi olarak seçilemez."
            )
        return self


class GoogleTakvimi(Sema):
    id: str
    ad: str
    birincil: bool


class GoogleTakvimDurumu(Sema):
    yapilandirildi: bool
    bagli: bool
    email: str | None = None
    durum: Literal["aktif", "koptu"] | None = None
    son_senkron: int | None = None
    hata: str | None = None
    takvimler: list[GoogleTakvimi] = []
    musaitlik_takvimi: str | None = None
    dolu_takvimleri: list[str] = []
    dolu_aralik_sayisi: int = 0
    musait_aralik_sayisi: int | None = None
    webhook_etkin: bool = False
    webhook_kanal_sayisi: int = 0
    webhook_son_bildirim: int | None = None


class TrafikOlcumGirdi(Sema):
    """Ziyaretçi IP'si veya kişisel bilgi taşımayan istemci ölçüm olayı."""

    olay_turu: Literal[
        "page_view",
        "profile_view",
        "directory_search",
        "booking_drawer_open",
        "booking_submitted",
        "resource_click",
        "link_unlock",
        "waitlist_submitted",
        "embed_play",
        "qr_scan",
    ]
    sayfa_yolu: str = Field(min_length=1, max_length=200)
    uzman_id: str | None = Field(default=None, max_length=36)
    uzman_kullanici_adi: str | None = Field(default=None, max_length=60)
    referans_url: str = Field(default="", max_length=500)
    utm_kaynak: str = Field(default="", max_length=60)
    ziyaret_anahtari: str = Field(min_length=8, max_length=64)
    cihaz: Literal["masaustu", "mobil", "tablet", "bilinmiyor"] = "bilinmiyor"
    saat_dilimi: str = Field(default="", max_length=64)
    hedef_kaynak_id: str | None = Field(default=None, max_length=36)


class AnalitikAyarGuncelleGirdi(Sema):
    """Yöneticinin GA4 ölçüm kimliği, mülk kimliği ve hizmet hesabı girişi."""

    ga_olcum_kimligi: str | None = Field(default=None, max_length=32)
    ga4_mulk_kimligi: str | None = Field(default=None, max_length=32)
    olcum_etkin: bool | None = None
    hizmet_hesabi_json: str | None = Field(default=None, max_length=16000)

    @field_validator("ga_olcum_kimligi")
    @classmethod
    def gecerli_ga_olcum(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().upper()
        if not cleaned:
            return ""
        if not re.fullmatch(r"G-[A-Z0-9]{4,20}", cleaned):
            raise ValueError(
                "GA4 Ölçüm Kimliği 'G-XXXXXXXXXX' biçiminde olmalıdır."
            )
        return cleaned

    @field_validator("ga4_mulk_kimligi")
    @classmethod
    def gecerli_ga4_mulk(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return ""
        if not re.fullmatch(r"[0-9]{5,20}", cleaned):
            raise ValueError(
                "GA4 Mülk Kimliği (Property ID) yalnızca rakam içermelidir."
            )
        return cleaned


class YonetimRandevuBildirimGirdi(Sema):
    """Yöneticinin ilgili terapiste randevu bildirimi gönderme girişi."""

    mesaj: str = Field(min_length=5, max_length=500)
    tur: Literal["hatirlatma", "eskalasyon"] = "hatirlatma"

    @field_validator("mesaj")
    @classmethod
    def bos_olmayan_mesaj(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 5:
            raise ValueError("Bildirim mesajı en az 5 karakter olmalıdır.")
        return cleaned


class YonetimRandevuDurumGirdi(Sema):
    """Yöneticinin randevu durumunu değiştirme / gecikmiş işlemi tamamlama."""

    durum: Literal["bekliyor", "onaylandi", "reddedildi", "iptal"]
    not_metni: str = Field(default="", max_length=500)
    eskalasyon_tamamla: bool = False
    terapiste_bildir: bool = True

    @field_validator("not_metni")
    @classmethod
    def temiz_not(cls, value: str) -> str:
        return value.strip()


class YonetimBildirimGonderGirdi(Sema):
    """Yöneticinin tek terapiste veya tüm terapistlere bildirim/not girişi."""

    hedef_uzman_id: str | None = Field(default=None, max_length=64)
    randevu_id: str | None = Field(default=None, max_length=64)
    tur: Literal["admin_notu", "randevu_hatirlatma"] = "admin_notu"
    baslik: str = Field(min_length=3, max_length=120)
    mesaj: str = Field(min_length=5, max_length=600)

    @field_validator("baslik", "mesaj")
    @classmethod
    def temiz_metin(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Başlık ve mesaj boş bırakılamaz.")
        return cleaned


class MesajKonuOlusturGirdi(Sema):
    """Kullanıcılar veya yönetici ile yeni mesaj konusu başlatma girişi."""

    alici_id: str = Field(min_length=2, max_length=64)
    baslik: str = Field(min_length=3, max_length=120)
    mesaj: str = Field(min_length=2, max_length=2000)

    @field_validator("baslik", "mesaj")
    @classmethod
    def temiz_konu_metni(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Konu başlığı ve mesaj boş bırakılamaz.")
        return cleaned


class MesajYanitGirdi(Sema):
    """Mevcut mesaj konusuna yanıt gönderme girişi."""

    mesaj: str = Field(min_length=1, max_length=2000)

    @field_validator("mesaj")
    @classmethod
    def temiz_yanit_metni(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Yanıt mesajı boş bırakılamaz.")
        return cleaned
