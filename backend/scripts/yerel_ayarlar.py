"""Mevcut .env dosyasını ezmeden yerel geliştirme anahtarları oluşturur."""

import secrets
import sys
from pathlib import Path

from cryptography.fernet import Fernet

sys.stdout.reconfigure(encoding="utf-8")

target = Path(".env")
if target.exists():
    raise SystemExit(".env zaten var; değiştirilmedi.")
target.write_text(
    "ORTAM=gelistirme\n"
    "VERITABANI_URL=sqlite:///./gelistirme.db\n"
    f"SIFRELEME_ANAHTARI={Fernet.generate_key().decode()}\n"
    f"HIZ_SINIRI_ANAHTARI={secrets.token_urlsafe(48)}\n"
    "UYGULAMA_ADRESI=http://localhost:5173\n",
    encoding="utf-8",
)
print("Yerel .env oluşturuldu. Gerçek danışan verisi kullanmayın.")
