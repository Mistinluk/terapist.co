"""Migration ve açıkça seçilmiş boş önizleme DB'si için örnek kurulum.

Railway pre-deploy aşamasında bir kez çalışır; HTTP worker'larında çalışmaz.
SEED_DEMO=1 yalnız ORTAM=onizleme ile kabul edilir. Var olan uzmanlar veya
üretim verileri değiştirilmez. Kurgusal hesapların girişi kapalıdır.
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

    if get_settings().ortam != "onizleme":
        raise RuntimeError("SEED_DEMO yalnızca önizlemede kullanılabilir.")
    with SessionLocal() as db:
        if db.scalar(select(Uzman.id).limit(1)):
            print("Mevcut profiller korunuyor; örnek kurulum atlandı.")
            return
    demo()
    with SessionLocal.begin() as db:
        veri_ekle(db, UretimAyarlari(adet=1000, giris_hesabi=0))
    print("1006 kurgusal profil hazır; örnek hesaplarla giriş kapalıdır.")


if __name__ == "__main__":
    main()
