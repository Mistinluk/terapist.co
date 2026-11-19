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
import time

import pyotp
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import delete, func, or_, select

from app.config import get_settings
from app.db import SessionLocal
from app.models import (
    Kullanici,
    KurucuUye,
    MeslektasUzmanlikIliskisi,
    Oturum,
    ProfesyonelBaglanti,
    ProfilKaynagi,
    Tavsiye,
    TerapistDogrulama,
    Uzman,
    baglanti_cifti,
)
from app.ornek_adresler import adresleri_tamamla, ornek_adres
from app.ornek_profiller import DEMO_BIYOGRAFI, ornek_dogrulamalarini_tamamla
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
                    biyografi=DEMO_BIYOGRAFI,
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
        ornek_dogrulamalarini_tamamla(db)
        db.commit()
    print(
        "Altı kurgusal profil oluşturuldu; örnek hesaplarla giriş kapalıdır."
    )


def tam_profil() -> None:
    """Geliştirme ortamına bütün profil bölümlerini dolduran örnek ekler.

    Komut aynı kısa ad için tekrar çalıştırılabilir. Yalnız bu kurgusal
    profilin kaynaklarını, bağlantılarını ve meslektaş sinyallerini yeniler;
    gerçek veya başka örnek profillerin içerik alanlarını değiştirmez.
    """
    if get_settings().ortam == "uretim":
        raise SystemExit("Üretimde örnek veri oluşturulamaz.")
    slug = "uzm-psk-deniz-yalin-demo"
    now = int(time.time())
    with SessionLocal() as db:
        profile = db.scalar(select(Uzman).where(Uzman.kullanici_adi == slug))
        if profile:
            user = db.get(Kullanici, profile.kullanici_id)
        else:
            user = Kullanici(
                email="deniz.yalin.demo@example.com",
                aktif=False,
                parola_ozeti=parolalar.hash(secrets.token_urlsafe(32)),
            )
            db.add(user)
            db.flush()
            profile = Uzman(kullanici_id=user.id, kullanici_adi=slug)
            db.add(profile)
        profile.ad = "Uzm. Psk. Deniz Yalın"
        profile.unvan = "Uzman Klinik Psikolog"
        profile.profil_fotografi_url = (
            "https://api.dicebear.com/9.x/initials/svg?seed=Deniz%20Yalin"
            "&backgroundColor=2563eb&fontFamily=Arial"
        )
        profile.sehir = "İstanbul"
        profile.ilce = "Kadıköy"
        profile.biyografi = (
            "Bu profil terapist.co arayüzünün tüm bölümlerini göstermek için "
            "hazırlanmış, tamamen kurgusal bir uzman örneğidir. Gerçek bir "
            "kişiyi, eğitimi veya mesleki yetkinliği temsil etmez. "
            "Yetişkinlerle duygu düzenleme, yaşam geçişleri ve ilişki "
            "güçlükleri üzerine çalıştığını varsayan örnek içerikler kullanır."
        )
        profile.terapi_yaklasimi = (
            "Kurgusal çalışma yaklaşımı; danışanın hedeflerini birlikte "
            "netleştiren, görüşme sürecini anlaşılır tutan ve kanıta dayalı "
            "yöntemlerden yararlanan işbirlikçi bir çerçeve olarak tanımlanır."
        )
        profile.ucret = 2800
        profile.seans_suresi_dakika = 50
        profile.deneyim_yili = 9
        profile.ekoller = [
            "Şema Terapi",
            "Bilişsel Davranışçı Terapi",
            "Kabul ve Kararlılık Terapisi",
        ]
        profile.kitle = ["Yetişkin", "Genç yetişkin", "Çift"]
        profile.formatlar = ["Çevrim içi", "Yüz yüze"]
        profile.diller = ["Türkçe", "İngilizce"]
        profile.uzmanliklar = [
            "Duygu düzenleme",
            "İlişki sorunları",
            "Yaşam geçişleri",
            "Özgüven",
        ]
        profile.egitim_universite = "Örnek Marmara Üniversitesi"
        profile.egitim_program = "Klinik Psikoloji Yüksek Lisans Programı"
        profile.egitim_derece = "Uzmanlık derecesi"
        profile.egitim = [
            "Şema Terapi Temel Eğitimi — Kurgusal Eğitim Enstitüsü",
            "Çiftlerle Çalışma Atölyesi — Kurgusal Mesleki Program",
            "Kabul ve Kararlılık Terapisi Eğitimi — Örnek Akademi",
        ]
        profile.kurumlar = [
            "Örnek Psikolojik Danışmanlık Merkezi",
            "Kurgusal Üniversite Psikolojik Destek Birimi",
        ]
        profile.sosyal_baglantilar = {
            "instagram": "https://www.instagram.com/terapistco_demo",
            "linkedin": "https://www.linkedin.com/in/terapistco-demo",
            "x": "https://x.com/terapistco_demo",
            "youtube": "https://www.youtube.com/@terapistco_demo",
            "website": "https://example.com/terapist-demo",
        }
        profile.adres = (
            "Örnek Mahallesi, Terapi Sokak No: 12 Kat: 3, Kadıköy, İstanbul"
        )
        profile.calisma_saatleri = [
            {"gun": day, "baslangic": 10, "bitis": 19} for day in range(5)
        ]
        profile.onayli = True
        profile.arsivli = False
        profile.davet_edeni_goster = True
        profile.mesleki_agi_goster = True
        profile.uzmanlik_iliskilerini_goster = True
        profile.tavsiyeleri_goster = True
        profile.kurucu_durumunu_goster = True
        db.flush()

        verification = db.scalar(
            select(TerapistDogrulama).where(
                TerapistDogrulama.uzman_id == profile.id
            )
        )
        if not verification:
            verification = TerapistDogrulama(
                uzman_id=profile.id,
                gonderilme=now,
                incelenme=now,
                inceleyen_kullanici_id=None,
            )
            db.add(verification)
        verification.durum = "verified"
        verification.incelenme = now
        verification.notlar = "Yalnız geliştirme ortamı için kurgusal profil."

        founder = db.scalar(
            select(KurucuUye).where(KurucuUye.uzman_id == profile.id)
        )
        if not founder:
            founder = KurucuUye(
                uzman_id=profile.id,
                kurucu_no=(
                    db.scalar(select(func.max(KurucuUye.kurucu_no))) or 0
                )
                + 1,
                verilme=now,
                veren_kullanici_id=user.id,
            )
            db.add(founder)

        db.execute(
            delete(ProfilKaynagi).where(ProfilKaynagi.uzman_id == profile.id)
        )
        for order, resource in enumerate(
            [
                (
                    "Duyguları fark etmek için haftalık notlar",
                    "Kurgusal kısa okuma ve düşünme soruları.",
                    "https://example.com/terapist-demo/duygu-notlari",
                    "yazi",
                    28,
                ),
                (
                    "Görüşme öncesi hazırlık rehberi",
                    "İlk görüşme öncesinde sık sorulan sorular için "
                    "örnek rehber.",
                    "https://example.com/terapist-demo/ilk-gorusme",
                    "diger",
                    19,
                ),
                (
                    "İlişkiler üzerine okuma listesi",
                    "Tamamı kurgusal kitap önerilerinden oluşan örnek liste.",
                    "https://example.com/terapist-demo/okuma-listesi",
                    "kitap",
                    14,
                ),
                (
                    "Yaşam geçişleri: örnek podcast bölümü",
                    "Profilin podcast kategorisini göstermek için "
                    "demo bağlantısı.",
                    "https://example.com/terapist-demo/podcast",
                    "podcast",
                    9,
                ),
            ]
        ):
            title, description, url, category, clicks = resource
            db.add(
                ProfilKaynagi(
                    uzman_id=profile.id,
                    baslik=title,
                    aciklama=description,
                    url=url,
                    kategori=category,
                    sira=order,
                    tiklama_sayisi=clicks,
                    olusturma=now - order * 86400,
                )
            )

        colleagues = list(
            db.scalars(
                select(Uzman)
                .join(
                    TerapistDogrulama,
                    TerapistDogrulama.uzman_id == Uzman.id,
                )
                .where(
                    Uzman.id != profile.id,
                    Uzman.onayli.is_(True),
                    Uzman.arsivli.is_(False),
                    TerapistDogrulama.durum == "verified",
                )
                .order_by(Uzman.ad)
                .limit(6)
            )
        )
        db.execute(
            delete(ProfesyonelBaglanti).where(
                or_(
                    ProfesyonelBaglanti.isteyen_uzman_id == profile.id,
                    ProfesyonelBaglanti.alici_uzman_id == profile.id,
                )
            )
        )
        relations = ["worked_together", "training_colleague", "colleague"]
        for index, colleague in enumerate(colleagues[:3]):
            db.add(
                ProfesyonelBaglanti(
                    isteyen_uzman_id=profile.id,
                    alici_uzman_id=colleague.id,
                    cift_anahtari=baglanti_cifti(profile.id, colleague.id),
                    iliski_turu=relations[index],
                    durum="accepted",
                    istek_zamani=now - (index + 2) * 86400,
                    yanit_zamani=now - (index + 1) * 86400,
                )
            )

        db.execute(
            delete(MeslektasUzmanlikIliskisi).where(
                MeslektasUzmanlikIliskisi.hedef_uzman_id == profile.id
            )
        )
        signals = [
            "Şema Terapi",
            "Duygu düzenleme",
            "İlişki sorunları",
            "Bilişsel Davranışçı Terapi",
        ]
        for index, colleague in enumerate(colleagues[:4]):
            db.add(
                MeslektasUzmanlikIliskisi(
                    iliskilendiren_uzman_id=colleague.id,
                    hedef_uzman_id=profile.id,
                    uzmanlik=signals[index],
                    profesyonel_baglam="worked_together",
                    olusturma=now - (index + 1) * 86400,
                    guncelleme=now - (index + 1) * 86400,
                )
            )

        db.execute(delete(Tavsiye).where(Tavsiye.veren_id == profile.id))
        recommendation_count = 0
        for colleague in colleagues:
            specialty = next(
                (
                    item
                    for item in colleague.uzmanliklar
                    if item not in profile.uzmanliklar and item != "Kaygu"
                ),
                None,
            )
            if not specialty:
                continue
            db.add(
                Tavsiye(
                    veren_id=profile.id,
                    alan_id=colleague.id,
                    uzmanlik=specialty,
                    olusturma=now - recommendation_count * 86400,
                )
            )
            recommendation_count += 1
            if recommendation_count == 2:
                break
        denetle(db, "demo.tam_profil", user.id, profile.id)
        db.commit()
    print(f"Tam kurgusal profil hazır: /{slug}")


def main() -> None:
    """Komutu ayrıştırır; hesap işlemleri için e-posta gerektirir.

    yonetici yeni hesap açar, kurtar yalnızca mevcut hesabı yeniler.
    Parola komut satırı argümanı değildir; kabuk geçmişine taşınmaz.
    """
    parser = argparse.ArgumentParser(description="Terapist.co hesap yönetimi")
    parser.add_argument(
        "komut",
        choices=["yonetici", "kurtar", "demo", "tam-profil", "adresler"],
    )
    parser.add_argument("--email")
    args = parser.parse_args()
    if args.komut == "demo":
        demo()
    elif args.komut == "tam-profil":
        tam_profil()
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
