"""Kimlik, kamuya açık profil ve gizli randevu verilerinin ayrımı."""

import uuid

from sqlalchemy import JSON, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def yeni_id() -> str:
    return str(uuid.uuid4())


class Kullanici(Base):
    __tablename__ = "kullanicilar"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    parola_ozeti: Mapped[str] = mapped_column(Text)
    rol: Mapped[str] = mapped_column(default="uzman")
    aktif: Mapped[bool] = mapped_column(default=True)
    mfa_sirri: Mapped[str | None] = mapped_column(Text)
    son_mfa_adimi: Mapped[int] = mapped_column(default=-1)


class Uzman(Base):
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
    __tablename__ = "oturumlar"

    ozet: Mapped[str] = mapped_column(primary_key=True)
    kullanici_id: Mapped[str] = mapped_column(ForeignKey("kullanicilar.id"))
    csrf_ozeti: Mapped[str]
    olusturma: Mapped[int]
    son_erisim: Mapped[int]


class Randevu(Base):
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
    __tablename__ = "tavsiyeler"

    veren_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )
    alan_id: Mapped[str] = mapped_column(
        ForeignKey("uzmanlar.id"), primary_key=True
    )


class Denetim(Base):
    __tablename__ = "denetim"

    id: Mapped[str] = mapped_column(primary_key=True, default=yeni_id)
    zaman: Mapped[int] = mapped_column(index=True)
    kullanici_id: Mapped[str | None]
    islem: Mapped[str]
    kaynak_id: Mapped[str | None]
