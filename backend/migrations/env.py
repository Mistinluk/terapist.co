"""Şema değişikliklerini uygulamadan bağımsız yürütür."""

from alembic import context

from app import models  # noqa: F401
from app.db import Base, engine

with engine.connect() as connection:
    sqlite = connection.dialect.name == "sqlite"
    if sqlite:
        # SQLite ALTER COLUMN için tabloyu yeniden kurar. Bağlı tablolar
        # varken eski tablo ancak migration süresince FK denetimi kapalıysa
        # değiştirilebilir; işlem sonunda bütün ilişkiler tekrar taranır.
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        connection.commit()
    try:
        context.configure(
            connection=connection,
            target_metadata=Base.metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
        if sqlite:
            violations = connection.exec_driver_sql(
                "PRAGMA foreign_key_check"
            ).fetchall()
            if violations:
                raise RuntimeError(
                    "SQLite migration sonrası yabancı anahtar ihlali var."
                )
    finally:
        if sqlite:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
