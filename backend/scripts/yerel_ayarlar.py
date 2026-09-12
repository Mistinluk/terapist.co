"""Mevcut .env dosyasını ezmeden yerel geliştirme anahtarları oluşturur."""

import base64
import secrets
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

target = Path(".env")
if target.exists():
    print(".env zaten var; değiştirilmedi.")
    raise SystemExit(0)
target.write_text(
    "ORTAM=gelistirme\n"
    "VERITABANI_URL=sqlite:///./gelistirme.db\n"
    "SIFRELEME_ANAHTARI="
    f"{base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()}\n"
    f"HIZ_SINIRI_ANAHTARI={secrets.token_urlsafe(48)}\n"
    "UYGULAMA_ADRESI=http://localhost:5173\n",
    encoding="utf-8",
)
print("Yerel .env oluşturuldu. Gerçek danışan verisi kullanmayın.")
