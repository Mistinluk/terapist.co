"""Migration, boş önizleme kurulumu ve eksik demo yayın kayıtlarının onarımı.

Railway pre-deploy aşamasında bir kez çalışır; HTTP worker'larında çalışmaz.
SEED_DEMO=1 yalnız ORTAM=onizleme ile kabul edilir. Gerçek profiller ve mevcut
inceleme kararları değiştirilmez. Kurgusal hesapların girişi kapalıdır.
"""

import os
import subprocess


def main() -> None:
    """Şemayı günceller; istenirse boş önizlemeye 1006 profil ekler."""
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    if os.environ.get("SEED_DEMO") != "1":
        return

    from sqlalchemy import select

    from app.cli import demo
    from app.config import get_settings
    from app.db import SessionLocal
    from app.eslestirme_verisi import UretimAyarlari, veri_ekle
    from app.models import Uzman
    from app.ornek_profiller import ornek_dogrulamalarini_tamamla

    if get_settings().ortam != "onizleme":
        raise RuntimeError("SEED_DEMO yalnızca önizlemede kullanılabilir.")
    with SessionLocal.begin() as db:
        if db.scalar(select(Uzman.id).limit(1)):
            repaired = ornek_dogrulamalarini_tamamla(db)
            print(f"Eksik kurgusal profil yayın kaydı tamamlandı: {repaired}.")
            print("Mevcut profiller korunuyor; örnek kurulum atlandı.")
            return
    demo()
    with SessionLocal.begin() as db:
        veri_ekle(db, UretimAyarlari(adet=1000, giris_hesabi=0))
    print("1006 kurgusal profil hazır; örnek hesaplarla giriş kapalıdır.")


if __name__ == "__main__":
    main()
