"""Güvenilir işletici terminalinden hesap yönetimi ve kurgusal veri kurulumu.

Çalıştırma: python -m app.cli yonetici --email adres@example.com
`kurtar` mevcut hesabın parolasını/MFA anahtarını yeniler; kişinin kimliğini
komut doğrulamaz, işletici bunu önceden doğrulamalıdır. `demo` yalnızca boş
uzman tablosuna altı kurgusal profil ekler. Şema için önce Alembic çalışır.
`adresler` bilinen kurgusal profillerin boş/eski yer tutucu adresini tamamlar.
"""

import argparse
import getpass
import secrets
import sys

import pyotp
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import delete, select

from app.config import get_settings
from app.db import SessionLocal
from app.models import Kullanici, Oturum, Uzman
from app.ornek_adresler import adresleri_tamamla, ornek_adres
from app.security import denetle, parolalar, sifrele

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")


def hesap(email: str, rol: str, kurtar: bool) -> None:
    """Hesabı oluşturur veya mevcut hesabın giriş sırlarını yeniler.

    E-posta normalize edilir; parola gizli ve iki kez sorulur. Kurtarma
    mevcut rolü, aktif durumunu ve profil onayını değiştirmez. Parola/MFA
    değişikliği, eski oturumların iptali ve denetim kaydı birlikte commit
    edilir. Yeni MFA anahtarı yalnızca başarıdan sonra terminale yazılır;
    terminal çıktısı gizli kabul edilmeli, kayda veya Git'e alınmamalıdır.
    """
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
        # Yeni kullanıcı kimliği, oturum iptali/denetim için gerekir.
        # flush henüz kalıcılaştırmaz; hata olursa tüm işlem geri alınır.
        db.flush()
        db.execute(delete(Oturum).where(Oturum.kullanici_id == user.id))
        denetle(db, "hesap.kurtar" if kurtar else "hesap.olustur", user.id)
        db.commit()
    print("Doğrulama uygulamasına şu anahtarı ekleyin (gizli tutun):")
    print(secret)
    print("Hesap: " + email)


def demo() -> None:
    """Üretim dışında, boş dizine altı girişe kapalı örnek hesap ekler.

    Dolu tabloda durması mevcut profillerin yanlışlıkla ezilmesini önler.
    Rastgele parolalar saklanmaz/paylaşılmaz; görünür profil, açık giriş
    anlamına gelmez. 1.000 profillik veri için eslestirme_verisi kullanılır.
    Bütün örnekler tek işlemde kaydedilir; kısmi veri bırakılmaz.
    """
    if get_settings().ortam == "uretim":
        raise SystemExit("Üretimde örnek veri oluşturulamaz.")
    with SessionLocal() as db:
        if db.scalar(select(Uzman.id).limit(1)):
            raise SystemExit("Uzman kayıtları var; örnek veri eklenmedi.")
        names = [
            (
                "Dr. Erdee Hasbutchu",
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
            (
                "Psk. Mert Örnek",
                "Ankara",
                "Çankaya",
                ["Kaygı", "Özgüven"],
                "Şema Terapi",
                1700,
                4,
            ),
        ]
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
                    adres=ornek_adres(i),
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
        "Altı kurgusal profil oluşturuldu; örnek hesaplarla giriş kapalıdır."
    )


def main() -> None:
    """Komutu ayrıştırır; hesap işlemleri için e-posta gerektirir.

    yonetici yeni hesap açar, kurtar yalnızca mevcut hesabı yeniler.
    Parola komut satırı argümanı değildir; kabuk geçmişine taşınmaz.
    """
    parser = argparse.ArgumentParser(description="Terapist.co hesap yönetimi")
    parser.add_argument(
        "komut", choices=["yonetici", "kurtar", "demo", "adresler"]
    )
    parser.add_argument("--email")
    args = parser.parse_args()
    if args.komut == "demo":
        demo()
    elif args.komut == "adresler":
        with SessionLocal.begin() as db:
            count = adresleri_tamamla(db)
            if count:
                denetle(db, "demo.adresleri_tamamla")
        print(f"Açık örnek adresi tamamlanan profil: {count}")
    elif args.email:
        hesap(args.email, "yonetici", args.komut == "kurtar")
    else:
        parser.error("--email gereklidir.")


if __name__ == "__main__":
    main()
