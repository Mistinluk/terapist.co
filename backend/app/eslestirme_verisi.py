"""Yerel eşleştirme deneyleri için tekrarlanabilir, kurgusal uzman verisi."""

import argparse
import json
import os
import random
import secrets
from pathlib import Path

import pyotp
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Kullanici, Uzman
from app.ornek_adresler import ornek_adres
from app.schemas import ProfilGirdi
from app.security import denetle, parolalar, sifrele

ETIKET = "[Kurgusal eşleştirme verisi v1]"
ADLAR = (
    "Ada Aylin Ayşe Baran Berk Burcu Can Ceren Cem Deniz Derya Ece Eda Efe "
    "Elif Emre Eren Esra Ezgi Gökçe Hakan İdil İpek Kerem Leyla Mert Nehir "
    "Oğuz Onur Özge Pelin Sarp Selin Sema Suna Tolga Tuna Uğur Yasemin Zeynep"
).split()
SOYADLAR = (
    "Akay Akın Aksu Aras Arı Aslan Aydın Başar Bulut Demir Deniz Doğan "
    "Ekin Ergin Güneş Güven Işık Kaya Kılıç Koç Özkan Şen Taş Tekin Yalçın"
).split()
SEHIRLER = {
    "İstanbul": ["Kadıköy", "Beşiktaş", "Şişli", "Bakırköy"],
    "Ankara": ["Çankaya", "Yenimahalle", "Keçiören"],
    "İzmir": ["Karşıyaka", "Bornova", "Konak"],
    "Bursa": ["Nilüfer", "Osmangazi"],
    "Antalya": ["Muratpaşa", "Konyaaltı"],
    "Eskişehir": ["Tepebaşı", "Odunpazarı"],
    "Adana": ["Seyhan", "Çukurova"],
    "Mersin": ["Yenişehir", "Mezitli"],
    "Konya": ["Selçuklu", "Meram"],
    "Samsun": ["Atakum", "İlkadım"],
    "Trabzon": ["Ortahisar", "Akçaabat"],
    "Diyarbakır": ["Kayapınar", "Yenişehir"],
    "Gaziantep": ["Şahinbey", "Şehitkamil"],
    "Kayseri": ["Melikgazi", "Kocasinan"],
    "Muğla": ["Menteşe", "Bodrum", "Fethiye"],
    "Balıkesir": ["Altıeylül", "Karesi", "Edremit"],
    "Kocaeli": ["İzmit", "Gebze"],
    "Sakarya": ["Serdivan", "Adapazarı"],
    "Tekirdağ": ["Süleymanpaşa", "Çorlu"],
    "Erzurum": ["Yakutiye", "Palandöken"],
}
UNVANLAR = [
    ("Psk.", "Psikolog", "Psikoloji"),
    ("Uzm. Kln. Psk.", "Klinik psikolog", "Klinik Psikoloji"),
    ("Dr. Psk.", "Doktoralı psikolog", "Psikoloji Doktorası"),
    ("Uzm. Dr.", "Psikiyatri uzmanı", "Psikiyatri Uzmanlığı"),
    ("Prof. Dr.", "Psikiyatri öğretim üyesi", "Psikiyatri"),
]
ALANLAR = [
    (["Kaygı", "Panik", "Stres yönetimi"], ["BDT", "ACT"], ["Yetişkin"]),
    (["Travma", "Yas / kayıp"], ["EMDR", "BDT"], ["Yetişkin"]),
    (
        ["İlişki sorunları", "Aile ilişkileri", "İletişim"],
        ["Sistemik Terapi", "Duygu Odaklı Terapi"],
        ["Çift", "Aile"],
    ),
    (
        ["Ergenlik", "Sınav kaygısı", "Özgüven"],
        ["BDT", "ACT"],
        ["Ergen"],
    ),
    (
        ["Çocukluk dönemi sorunları", "Duygu düzenleme"],
        ["Oyun Terapisi", "Sistemik Terapi"],
        ["Çocuk", "Aile"],
    ),
    (
        ["Tükenmişlik", "İş yaşamı", "Stres yönetimi"],
        ["ACT", "BDT", "Şema Terapi"],
        ["Yetişkin"],
    ),
    (
        ["Depresyon", "Duygu düzenleme", "Özgüven"],
        ["Şema Terapi", "Psikodinamik Terapi", "BDT"],
        ["Yetişkin", "İleri yaş"],
    ),
    (["Uyku sorunları", "Kaygı"], ["BDT", "ACT"], ["Yetişkin", "İleri yaş"]),
]


class UretimAyarlari(BaseModel):
    adet: int = Field(default=1000, ge=1, le=1000)
    giris_hesabi: int = Field(default=5, ge=0, le=5)


def profil_uret(index: int) -> ProfilGirdi:
    """Aynı sıra numarası aynı profili üretir; parolalar rastgeledir."""
    rng = random.Random(20260915 + index)  # noqa: S311
    title, profession, education = UNVANLAR[index % len(UNVANLAR)]
    city = list(SEHIRLER)[(index // len(UNVANLAR)) % len(SEHIRLER)]
    district = rng.choice(SEHIRLER[city])
    areas, schools, audiences = ALANLAR[rng.randrange(len(ALANLAR))]
    years = rng.randint(2, 35)
    if title == "Prof. Dr.":
        years = rng.randint(15, 35)
    formats = rng.choice(
        [["Çevrim içi"], ["Yüz yüze"], ["Çevrim içi", "Yüz yüze"]]
    )
    schedule = []
    for day in sorted(rng.sample(range(7), rng.randint(2, 5))):
        start = rng.choice([8, 9, 10, 13, 16, 17])
        schedule.append(
            {"gun": day, "baslangic": start, "bitis": min(start + 6, 23)}
        )
    name = f"{ADLAR[index % len(ADLAR)]} {SOYADLAR[index // len(ADLAR)]}"
    selected_areas = rng.sample(areas, rng.randint(1, len(areas)))
    return ProfilGirdi(
        ad=f"{title} {name}",
        sehir=city,
        ilce=district,
        biyografi=(
            f"{ETIKET} {profession}. Bu kişi, unvanı ve eğitim bilgileri "
            "tamamen kurgusaldır; gerçek bir sağlık çalışanını temsil etmez. "
            f"Örnek odak alanları: {', '.join(selected_areas)}. "
            "Yalnızca arama, filtreleme ve eşleştirme yazılımını sınamak "
            "için oluşturulmuştur."
        ),
        ucret=rng.randrange(800, 5100, 100),
        deneyim_yili=years,
        ekoller=rng.sample(schools, rng.randint(1, len(schools))),
        kitle=audiences,
        formatlar=formats,
        uzmanliklar=selected_areas,
        egitim=[f"Kurgusal Örnek Üniversitesi · {education}"],
        kurumlar=["Kurgusal Örnek Danışmanlık Merkezi"],
        adres=(ornek_adres(index + 6) if "Yüz yüze" in formats else ""),
        calisma_saatleri=schedule,
    )


def veri_ekle(db: Session, settings: UretimAyarlari) -> dict:
    """Var olan hesapları, randevuları ve parolaları değiştirmeden ekler."""
    if get_settings().ortam != "gelistirme":
        raise ValueError(
            "Bu komut yalnızca geliştirme ortamında kullanılabilir."
        )
    profiles = [profil_uret(i) for i in range(settings.adet)]
    added = 0
    accounts = []
    # Kapalı örneklerin bilinmeyen parolası; giriş açılırken sıfırlanır.
    disabled_hash = parolalar.hash(secrets.token_urlsafe(48))
    for i, profile in enumerate(profiles):
        email = f"eslestirme{i + 1:04d}@example.com"
        existing = db.scalar(select(Kullanici).where(Kullanici.email == email))
        if existing:
            expert = db.scalar(
                select(Uzman).where(Uzman.kullanici_id == existing.id)
            )
            if not expert or not expert.biyografi.startswith(ETIKET):
                raise ValueError(
                    "Aynı e-posta başka bir hesapta kullanılıyor."
                )
            continue
        enabled = i < settings.giris_hesabi
        password = secrets.token_urlsafe(24) if enabled else None
        secret = pyotp.random_base32() if enabled else None
        user = Kullanici(
            email=email,
            aktif=enabled,
            parola_ozeti=parolalar.hash(password)
            if enabled
            else disabled_hash,
            mfa_sirri=sifrele({"anahtar": secret}) if enabled else None,
        )
        db.add(user)
        db.flush()
        expert = Uzman(
            kullanici_id=user.id,
            onayli=True,
            **profile.model_dump(mode="json"),
        )
        db.add(expert)
        db.flush()
        if enabled:
            accounts.append(
                {
                    "ad": expert.ad,
                    "uzman_id": expert.id,
                    "email": email,
                    "parola": password,
                    "mfa_anahtari": secret,
                    "mfa_uri": pyotp.TOTP(secret).provisioning_uri(
                        email, issuer_name="Terapist.co"
                    ),
                }
            )
        added += 1
    if added:
        denetle(db, "demo.eslestirme_verisi_ekle")
    return {
        "eklenen": added,
        "atlanan": settings.adet - added,
        "hesaplar": accounts,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adet", type=int, default=1000)
    parser.add_argument("--giris-hesabi", type=int, default=5)
    parser.add_argument("--hesap-dosyasi", type=Path, required=True)
    args = parser.parse_args()
    settings = UretimAyarlari(adet=args.adet, giris_hesabi=args.giris_hesabi)
    written = False
    try:
        with SessionLocal.begin() as db:
            result = veri_ekle(db, settings)
            if result["hesaplar"]:
                args.hesap_dosyasi.parent.mkdir(parents=True, exist_ok=True)
                # Mevcut parola dosyasının üstüne yazılmaz.
                fd = os.open(
                    args.hesap_dosyasi,
                    os.O_WRONLY | os.O_CREAT | os.O_EXCL,
                    0o600,
                )
                written = True
                with os.fdopen(fd, "w", encoding="utf-8") as output:
                    json.dump(
                        result["hesaplar"],
                        output,
                        ensure_ascii=False,
                        indent=2,
                    )
    except Exception:
        if written:
            args.hesap_dosyasi.unlink(missing_ok=True)
        raise
    print(f"Eklenen: {result['eklenen']}; mevcut: {result['atlanan']}.")
    if written:
        print(
            f"Giriş bilgileri yerel dosyaya kaydedildi: {args.hesap_dosyasi}"
        )


if __name__ == "__main__":
    main()
