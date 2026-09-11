"""Eski SQLite kopyasını salt okunur açan, atomik ve açık onaylı aktarım."""

import argparse
import json
import re
import secrets
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Kullanici, Randevu, Tavsiye, Uzman
from app.schemas import ProfilGirdi
from app.security import denetle, parolalar, sifrele
from app.services import ISTANBUL

GUNLER = [
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
    "Pazar",
]


def dizi(row, field):
    result = json.loads(row.get(field) or "[]")
    if not isinstance(result, list):
        raise ValueError("Dizi bekleniyor.")
    return result


def profil(row):
    hours = json.loads(row.get("calisma_saatleri") or "{}")
    schedule = []
    if hours and not isinstance(hours, dict):
        raise ValueError("Takvim nesne olmalıdır.")
    for day, interval in (hours or {}).items():
        match = re.fullmatch(r"(\d{2}):00 - (\d{2}):00", interval)
        if not match or day not in GUNLER:
            raise ValueError("Saat başı olmayan takvim elle incelenmelidir.")
        schedule.append(
            {
                "gun": GUNLER.index(day),
                "baslangic": int(match[1]),
                "bitis": int(match[2]),
            }
        )
    fee = str(row.get("ucret", "")).replace("₺", "").replace(".", "").strip()
    if not fee.isdigit():
        raise ValueError("Ücret elle incelenmelidir.")
    formats = {"Online": "Çevrim içi", "Yüz Yüze": "Yüz yüze"}
    return ProfilGirdi(
        ad=row["ad"],
        sehir=row["sehir"],
        ilce=row["ilce"],
        biyografi=row.get("biyografi") or "",
        ucret=int(fee),
        deneyim_yili=row.get("deneyim_yili") or 0,
        ekoller=dizi(row, "ekoller"),
        kitle=dizi(row, "kitle"),
        formatlar=[formats.get(x, x) for x in dizi(row, "format")],
        uzmanliklar=dizi(row, "uzmanlik_alanlari"),
        egitim=dizi(row, "egitim"),
        kurumlar=dizi(row, "kurumlar"),
        adres=row.get("adres") or "",
        calisma_saatleri=schedule,
    )


def aktar(source: Path, uygula: bool):
    if not source.is_file():
        raise SystemExit("Kaynak veritabanı bulunamadı.")
    with sqlite3.connect(
        source.resolve().as_uri() + "?mode=ro", uri=True
    ) as old:
        old.row_factory = sqlite3.Row
        tables = {
            row[0]
            for row in old.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        profiles = [
            dict(row) for row in old.execute("SELECT * FROM psikologlar")
        ]
        bookings = (
            [dict(row) for row in old.execute("SELECT * FROM randevular")]
            if "randevular" in tables
            else []
        )
        recommendations = (
            [
                dict(row)
                for row in old.execute("SELECT * FROM meslektas_onaylari")
            ]
            if "meslektas_onaylari" in tables
            else []
        )
    print(f"Kaynak: {len(profiles)} uzman, {len(bookings)} randevu.")
    prepared = []
    for row in profiles:
        try:
            email = str(
                TypeAdapter(EmailStr).validate_python(row.get("email"))
            ).lower()
            prepared.append((row, email, profil(row)))
        except (ValueError, TypeError, KeyError):
            raise SystemExit(
                f"Uzman #{row.get('id')}: alanlar geçersiz; aktarılmadı."
            ) from None
    if len({email for _, email, _ in prepared}) != len(prepared):
        raise SystemExit("Tekrarlanan e-posta var; aktarım durduruldu.")
    if not uygula:
        print("Ön kontrol tamamlandı. Hiçbir kayıt yazılmadı.")
        print("Randevu ve ilişki kısıtları uygulama işleminde de doğrulanır.")
        return
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Uzman)) or db.scalar(
            select(func.count()).select_from(Randevu)
        ):
            raise SystemExit("Hedefte uzman/randevu var; aktarım durduruldu.")
        mapping = {}
        try:
            for row, email, schema in prepared:
                user = Kullanici(
                    email=email,
                    parola_ozeti=parolalar.hash(secrets.token_urlsafe(48)),
                    aktif=True,
                )
                db.add(user)
                db.flush()
                expert = Uzman(
                    kullanici_id=user.id,
                    onayli=bool(row.get("onayli")),
                    **schema.model_dump(mode="json"),
                )
                db.add(expert)
                db.flush()
                mapping[row["id"]] = expert.id
            for row in bookings:
                status = row.get("durum") or "bekliyor"
                if status not in {
                    "bekliyor",
                    "onaylandi",
                    "reddedildi",
                    "iptal",
                }:
                    raise ValueError("Bilinmeyen randevu durumu.")
                moment = datetime.fromisoformat(
                    f"{row['tarih']}T{row['saat']}"
                ).replace(tzinfo=ISTANBUL)
                db.add(
                    Randevu(
                        uzman_id=mapping[row["uzman_id"]],
                        baslangic=int(moment.timestamp()),
                        durum=status,
                        danisan_sifreli=sifrele(
                            {
                                "ad": row["danisan_ad"],
                                "telefon": row["danisan_telefon"],
                                "eski_not": row.get("danisan_notu") or "",
                            }
                        ),
                        olusturma=int(time.time()),
                        aydinlatma_surumu="eski-sistemde-dogrulanmamis",
                    )
                )
            for row in recommendations:
                db.add(
                    Tavsiye(
                        veren_id=mapping[row["onaylayan_id"]],
                        alan_id=mapping[row["onaylanan_id"]],
                    )
                )
            denetle(db, "sistem.eski_veri_aktar")
            db.commit()
        except Exception:
            db.rollback()
            raise SystemExit(
                "Aktarım geri alındı. E-posta, tarih, ilişki veya "
                "çakışan randevu kayıtlarını kaynak kopyada inceleyin."
            ) from None
    print("Aktarım tamamlandı. Eski parolalar taşınmadı.")
    print("Hesap sahiplerini doğrulayıp kurtar komutuyla parola ve MFA kurun.")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Eski veritabanını aktar")
    parser.add_argument("--kaynak", type=Path, required=True)
    parser.add_argument("--uygula", action="store_true")
    args = parser.parse_args()
    aktar(args.kaynak, args.uygula)
