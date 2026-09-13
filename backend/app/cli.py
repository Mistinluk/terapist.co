"""Hesap oluşturma ve kimliği doğrulanmış kullanıcılar için MFA kurtarma."""

import argparse
import getpass
import sys

import pyotp
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import delete, select

from app.config import get_settings
from app.db import SessionLocal
from app.models import Kullanici, Oturum, Uzman
from app.security import denetle, parolalar, sifrele

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")


def hesap(email: str, rol: str, kurtar: bool):
    email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
    password = getpass.getpass("Yeni parola (en az 14 karakter): ")
    if len(password) < 14 or len(password) > 128:
        raise SystemExit("Parola 14–128 karakter olmalıdır.")
    if password != getpass.getpass("Parolayı tekrar girin: "):
        raise SystemExit("Parolalar eşleşmiyor.")
    secret = pyotp.random_base32()
    with SessionLocal() as db:
        user = db.scalar(select(Kullanici).where(Kullanici.email == email))
        if user and not kurtar:
            raise SystemExit(
                "Hesap zaten var. Gerekirse kurtar komutunu kullanın."
            )
        if kurtar and not user:
            raise SystemExit("Hesap bulunamadı.")
        if not user:
            user = Kullanici(email=email, rol=rol)
            db.add(user)
        user.parola_ozeti = parolalar.hash(password)
        user.mfa_sirri = sifrele({"anahtar": secret})
        user.son_mfa_adimi = -1
        db.flush()
        db.execute(delete(Oturum).where(Oturum.kullanici_id == user.id))
        denetle(db, "hesap.kurtar" if kurtar else "hesap.olustur", user.id)
        db.commit()
    print("Doğrulama uygulamasına şu anahtarı ekleyin (gizli tutun):")
    print(secret)
    print("Hesap: " + email)


def demo():
    if get_settings().ortam == "uretim":
        raise SystemExit("Üretimde örnek veri oluşturulamaz.")
    with SessionLocal() as db:
        if db.scalar(select(Uzman.id).limit(1)):
            raise SystemExit("Uzman kayıtları var; örnek veri eklenmedi.")
        names = [
            (
                "Dr. Psk. Erdee Hasbutchu",
                "İstanbul",
                "Kadıköy",
                ["Kaygı", "Stres yönetimi"],
                "BDT",
                1800,
                8,
            ),
            (
                "Uzm. Psk. Whehbee Tosun",
                "Ankara",
                "Çankaya",
                ["İlişki sorunları", "Yas / kayıp"],
                "Şema Terapi",
                1600,
                6,
            ),
            (
                "Uzm. Psk. Shaheen Tosun",
                "İzmir",
                "Karşıyaka",
                ["Travma", "Kaygı"],
                "EMDR",
                2000,
                10,
            ),
            (
                "Psk. Cebele Malone",
                "İstanbul",
                "Beşiktaş",
                ["Tükenmişlik", "Stres yönetimi"],
                "BDT",
                1500,
                5,
            ),
            (
                "Uzm. Psk. Cubala O'Neal",
                "Bursa",
                "Nilüfer",
                ["Ergenlik", "Aile ilişkileri"],
                "Sistemik Terapi",
                1400,
                7,
            ),
        ]
        import secrets

        for i, (name, city, district, areas, school, fee, years) in enumerate(
            names
        ):
            user = Kullanici(
                email=f"ornek{i}@example.com",
                aktif=False,
                parola_ozeti=parolalar.hash(secrets.token_urlsafe(32)),
            )
            db.add(user)
            db.flush()
            db.add(
                Uzman(
                    kullanici_id=user.id,
                    ad=name,
                    sehir=city,
                    ilce=district,
                    biyografi=(
                        "Bu profil uygulamayı göstermek için hazırlanmış "
                        "kurgusal bir örnektir. "
                        "Gerçek bir uzmana ait değildir."
                    ),
                    ucret=fee,
                    deneyim_yili=years,
                    ekoller=[school],
                    uzmanliklar=areas,
                    kitle=["Yetişkin"],
                    formatlar=["Çevrim içi", "Yüz yüze"],
                    onayli=True,
                    egitim=["Örnek Üniversitesi · Klinik Psikoloji"],
                    calisma_saatleri=[
                        {"gun": day, "baslangic": 9, "bitis": 17}
                        for day in range(5)
                    ],
                )
            )
        db.commit()
    print(
        "Beş kurgusal profil oluşturuldu; örnek hesaplarla giriş kapalıdır."
    )


def main():
    parser = argparse.ArgumentParser(description="Terapist.co hesap yönetimi")
    parser.add_argument("komut", choices=["yonetici", "kurtar", "demo"])
    parser.add_argument("--email")
    args = parser.parse_args()
    if args.komut == "demo":
        demo()
    elif args.email:
        hesap(args.email, "yonetici", args.komut == "kurtar")
    else:
        parser.error("--email gereklidir.")


if __name__ == "__main__":
    main()
