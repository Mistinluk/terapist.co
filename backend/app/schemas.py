"""Türkçe API sözleşmeleri; bilinmeyen alanlar kabul edilmez."""

from datetime import datetime
from typing import Annotated, Literal

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
    sehir: str = Field(min_length=2, max_length=80)
    ilce: str = Field(min_length=2, max_length=80)
    biyografi: str = Field(min_length=20, max_length=5000)
    ucret: int = Field(ge=0, le=100000)
    deneyim_yili: int = Field(default=0, ge=0, le=70)
    ekoller: list[KisaMetin] = Field(default_factory=list, max_length=20)
    kitle: list[KisaMetin] = Field(default_factory=list, max_length=10)
    formatlar: list[Literal["Çevrim içi", "Yüz yüze"]] = Field(
        min_length=1, max_length=2
    )
    uzmanliklar: list[KisaMetin] = Field(default_factory=list, max_length=30)
    egitim: list[KisaMetin] = Field(default_factory=list, max_length=15)
    kurumlar: list[KisaMetin] = Field(default_factory=list, max_length=15)
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


class ProfilCikti(ProfilGirdi):
    id: str
    onayli: bool
    arsivli: bool


class KayitGirdi(Sema):
    email: EmailStr
    parola: SecretStr = Field(min_length=14, max_length=128)
    profil: ProfilGirdi


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


class OnayGirdi(Sema):
    onayli: bool


class TavsiyeGirdi(Sema):
    tavsiye: bool
