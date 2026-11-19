"""Yalnız kurgusal önizleme profillerinin eksik yayın kayıtlarını tamamlar.

Eski üreticiler onayli=True yazıyor, fakat profil sayfasının gerektirdiği
TerapistDogrulama kaydını oluşturmuyordu. E-posta ve biyografi birlikte
tanınır; gerçek başvurulara veya mevcut inceleme kararlarına dokunulmaz.
"""

import re
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Kullanici, TerapistDogrulama, Uzman

DEMO_BIYOGRAFI = (
    "Bu profil uygulamayı göstermek için hazırlanmış kurgusal bir örnektir. "
    "Gerçek bir uzmana ait değildir."
)
ESLESTIRME_ETIKETI = "[Kurgusal eşleştirme verisi v1]"


def ornek_dogrulamalarini_tamamla(db: Session) -> int:
    """Eksik demo doğrulamalarını ekler; tekrar çalıştırma kararları ezmez.

    İşlem çağıranın transaction'ındadır. Üretimde çalışmaz, hesap/parola ve
    randevu değiştirmez; girişe kapalı örneklerin girişini de açmaz.
    """
    if get_settings().ortam not in {"gelistirme", "test", "onizleme"}:
        raise ValueError("Kurgusal profil onarımı üretimde çalıştırılamaz.")
    rows = db.execute(
        select(Uzman, Kullanici.email)
        .join(Kullanici, Kullanici.id == Uzman.kullanici_id)
        .outerjoin(TerapistDogrulama, TerapistDogrulama.uzman_id == Uzman.id)
        .where(
            Uzman.onayli.is_(True),
            Uzman.arsivli.is_(False),
            TerapistDogrulama.id.is_(None),
        )
    )
    added = 0
    now = int(time.time())
    for profile, email in rows:
        basic = (
            re.fullmatch(r"ornek[0-5]@example\.com", email)
            and profile.biyografi == DEMO_BIYOGRAFI
        )
        matching = re.fullmatch(
            r"eslestirme[0-9]{4,}@example\.com", email
        ) and profile.biyografi.startswith(ESLESTIRME_ETIKETI)
        if not basic and not matching:
            continue
        db.add(
            TerapistDogrulama(
                uzman_id=profile.id,
                durum="verified",
                gonderilme=now,
                incelenme=now,
                notlar="Kurgusal önizleme; gerçek mesleki onay değildir.",
            )
        )
        added += 1
    db.flush()
    return added
