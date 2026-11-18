"""Randevu kaydı kaybolmadan Google'a aktarım ve kalıcı yeniden deneme.

API yalnız işi kendi işlemi içinde kuyruğa koyar. Çalışan, PostgreSQL satır
kilidiyle en güncel durumu gönderir; ağ hatası randevuyu geri almaz. Dışarıya
ad, telefon, uzman adı veya takip bağlantısı gönderilmez.
"""

import asyncio
import hashlib
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.google_takvim import (
    GoogleHatasi,
    baglanti_bul,
    erisim_anahtari,
    google_istemcisi,
    hesap,
)
from app.models import GoogleTakvimBaglantisi, Randevu, RandevuTakvimIsi
from app.security import coz, sifrele


def kuyruga_ekle(db: Session, booking: Randevu) -> None:
    """Randevuyla aynı commit'te tek işi oluşturur veya günceller."""
    connection = baglanti_bul(db, booking.uzman_id)
    if not connection or not hesap(connection).get("randevu_yazma_izni"):
        return
    # Çalışan gönderirken durum değişirse eski ORM görüntüsünü kullanma.
    # Kilit bırakıldıktan sonra bekliyor durumu mutlaka yeniden yazılır.
    job = db.scalar(
        select(RandevuTakvimIsi)
        .where(RandevuTakvimIsi.randevu_id == booking.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if not job:
        job = RandevuTakvimIsi(
            randevu_id=booking.id,
            baglanti_id=connection.id,
            etkinlik_id=hashlib.sha256(booking.id.encode()).hexdigest(),
        )
        db.add(job)
    elif (
        job.hedef_durum in {"iptal", "reddedildi"}
        and booking.durum in {"bekliyor", "onaylandi"}
        and job.durum == "esitlendi"
    ):
        # Google'ın silinen etkinlik kimliği yeniden kullanılamaz.
        job.etkinlik_id = uuid.uuid4().hex
    job.baglanti_id = connection.id
    job.hedef_durum = booking.durum
    job.durum = "bekliyor"
    job.deneme = 0
    job.sonraki_deneme = 0
    job.son_hata = None


def etkinlik_govdesi(booking: Randevu) -> dict:
    """Asgari, özel görünürlüklü Google etkinliğini oluşturur."""

    def iso(value: int) -> str:
        return datetime.fromtimestamp(value, UTC).isoformat()

    return {
        "summary": "Randevu talebi"
        if booking.durum == "bekliyor"
        else "Randevu",
        "start": {"dateTime": iso(booking.baslangic)},
        "end": {"dateTime": iso(booking.bitis or booking.baslangic + 3600)},
        "status": "tentative" if booking.durum == "bekliyor" else "confirmed",
        "visibility": "private",
        "transparency": "opaque",
        "reminders": {"useDefault": False},
    }


def bir_is_calistir(factory=SessionLocal, now: int | None = None) -> bool:
    """Bir işi kilitleyip işler; farklı API çalışanları aynı işi göndermez."""
    now = now or int(time.time())
    with factory() as db:
        job = db.scalar(
            select(RandevuTakvimIsi)
            .where(
                RandevuTakvimIsi.durum != "esitlendi",
                RandevuTakvimIsi.sonraki_deneme <= now,
            )
            .order_by(RandevuTakvimIsi.sonraki_deneme)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if not job:
            return False
        booking = db.get(Randevu, job.randevu_id)
        # OAuth yenilemesi bağlantıyı kilitlemişse işi bırakıp yeniden dene.
        # İş -> bağlantı ve bağlantı -> iş sırası kilitlenmeye dönüşmesin.
        connection = db.scalar(
            select(GoogleTakvimBaglantisi)
            .where(GoogleTakvimBaglantisi.id == job.baglanti_id)
            .with_for_update(nowait=True)
        )
        try:
            if connection.durum != "aktif":
                raise GoogleHatasi("yetki_kaldirildi")
            if not hesap(connection).get("randevu_yazma_izni"):
                raise GoogleHatasi("izin_eksik")
            access = erisim_anahtari(connection, now)
            if job.hedef_durum in {"iptal", "reddedildi"}:
                google_istemcisi.etkinlik_sil(access, job.etkinlik_id)
            else:
                google_istemcisi.etkinlik_yaz(
                    access, job.etkinlik_id, etkinlik_govdesi(booking)
                )
            job.durum = "esitlendi"
            job.son_hata = None
            # İptal sonrası önceki FreeBusy önbelleği saati kapatmamalı.
            connection.son_deneme = None
        except GoogleHatasi as exc:
            job.deneme += 1
            job.durum = "hata"
            job.son_hata = exc.kod
            job.sonraki_deneme = now + min(3600, 15 * 2 ** min(job.deneme, 8))
            if exc.status == 410 and job.hedef_durum in {
                "bekliyor",
                "onaylandi",
            }:
                job.etkinlik_id = uuid.uuid4().hex
            if exc.kod == "yetki_kaldirildi":
                connection.durum = "koptu"
            if exc.status == 401:
                tokens = coz(connection.token_sifreli)
                tokens.pop("access_token", None)
                connection.token_sifreli = sifrele(tokens)
        db.commit()
        return True


@asynccontextmanager
async def takvim_yasam_dongusu(app):
    """API ile çalışan kuyruk, yeniden başlatmada bekleyen işleri bulur."""
    stop = asyncio.Event()

    async def run() -> None:
        while not stop.is_set():
            try:
                worked = await asyncio.to_thread(bir_is_calistir)
            except Exception:
                # SQL veya OAuth sırlarını günlükte açığa çıkarma.
                logging.getLogger(__name__).warning(
                    "Takvim kuyruğu işlenemedi; yeniden denenecek."
                )
                worked = False
            try:
                await asyncio.wait_for(stop.wait(), 0.1 if worked else 5)
            except TimeoutError:
                pass

    task = None
    settings = get_settings()
    if settings.ortam != "test" and settings.google_takvim_etkin:
        task = asyncio.create_task(run())
    try:
        yield
    finally:
        stop.set()
        if task:
            await task
