"""Railway veri biriminin sahibini düzeltip API'yi ayrıcalıksız başlatır.

Railway birimleri root sahibinde bağlar. Yalnız ilk dizin için sahiplik
ayarlanır; alt dizinler taranmaz. Ardından süreç UID/GID 10001'e düşürülür.
Şema migration'ı ayrı pre-deploy komutunda çalışır.
"""

import os
from pathlib import Path


def main() -> None:
    """Yazılabilir yükleme dizini ile tek Uvicorn süreci başlatır."""
    media = Path(os.environ.get("MEDYA_DIZINI", "/app/uploads"))
    media.mkdir(parents=True, exist_ok=True)
    if os.getuid() == 0:
        os.chown(media, 10001, 10001)
        os.setgroups([])
        os.setgid(10001)
        os.setuid(10001)
    os.execvp(
        "uvicorn",
        [
            "uvicorn",
            "app.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            os.environ.get("PORT", "8000"),
            "--no-access-log",
            "--no-proxy-headers",
        ],
    )


if __name__ == "__main__":
    main()
