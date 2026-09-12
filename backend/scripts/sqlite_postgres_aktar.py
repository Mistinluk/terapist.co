"""Yeni uygulamanın SQLite kayıtlarını boş PostgreSQL'e güvenle aktarır."""

import argparse
import sqlite3
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import Engine

from app import models  # noqa: F401
from app.config import get_settings
from app.db import Base, engine


def aktar(kaynak: Path, hedef: Engine, uygula: bool = False) -> dict:
    """Kaynağı korur; yalnızca boş hedefe tek işlemde aktarır."""
    if not kaynak.is_file():
        raise ValueError("Kaynak SQLite dosyası bulunamadı.")
    if hedef.dialect.name != "postgresql":
        raise ValueError("Hedef PostgreSQL olmalıdır.")
    uri = kaynak.resolve().as_uri() + "?mode=ro"
    eski = create_engine(
        "sqlite://", creator=lambda: sqlite3.connect(uri, uri=True)
    )
    fernet = Fernet(
        get_settings().sifreleme_anahtari.get_secret_value().encode()
    )
    try:
        with eski.connect() as source, hedef.begin() as target:
            inspector = inspect(source)
            tables = Base.metadata.sorted_tables
            if uygula:
                names = ", ".join(table.name for table in tables)
                target.execute(
                    text(f"LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE")
                )
            if any(
                target.scalar(select(func.count()).select_from(table))
                for table in tables
            ):
                raise ValueError("Hedef boş değil; mevcut kayıtlar korunuyor.")
            source_revision = source.scalar(
                text("SELECT version_num FROM alembic_version")
            )
            target_revision = target.scalar(
                text("SELECT version_num FROM alembic_version")
            )
            if source_revision != target_revision:
                raise ValueError("Kaynak ve hedef şema sürümleri farklı.")
            records = {}
            for table in tables:
                columns = {
                    column["name"]
                    for column in inspector.get_columns(table.name)
                }
                if columns != set(table.columns.keys()):
                    raise ValueError("Kaynak yeni uygulama şemasıyla uyumsuz.")
                records[table.name] = [
                    dict(row)
                    for row in source.execute(select(table)).mappings()
                ]
            for name, field in (
                ("kullanicilar", "mfa_sirri"),
                ("randevular", "danisan_sifreli"),
            ):
                for row in records[name]:
                    if row[field]:
                        try:
                            fernet.decrypt(row[field].encode())
                        except InvalidToken:
                            raise ValueError(
                                "Şifreleme anahtarı kaynakla uyuşmuyor."
                            ) from None
            if uygula:
                for table in tables:
                    if records[table.name]:
                        target.execute(table.insert(), records[table.name])
            return {name: len(rows) for name, rows in records.items()}
    finally:
        eski.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kaynak", type=Path, required=True)
    parser.add_argument("--uygula", action="store_true")
    args = parser.parse_args()
    try:
        counts = aktar(args.kaynak, engine, args.uygula)
    except Exception:
        # Veritabanı bağlantı adresleri ve satır içerikleri loglanmaz.
        raise SystemExit(
            "Aktarım durdu; kaynak, boş hedef, şema ve anahtarı kontrol edin."
        ) from None
    print("Aktarıldı:" if args.uygula else "Ön kontrol:", counts)
