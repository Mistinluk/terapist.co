import hashlib

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, func, select, text

from app.db import Base
from app.models import Randevu
from scripts.sqlite_postgres_aktar import aktar


def kaynak_hazirla(env, tmp_path):
    _, factory, _, _ = env
    target = factory.kw["bind"]
    if target.dialect.name != "postgresql":
        pytest.skip("Bu aktarım testi gerçek PostgreSQL gerektirir.")
    source = tmp_path / "kaynak.db"
    sqlite = create_engine(f"sqlite:///{source}")
    Base.metadata.create_all(sqlite)
    with sqlite.begin() as output, target.begin() as current:
        output.execute(text("CREATE TABLE alembic_version (version_num TEXT)"))
        output.execute(text("INSERT INTO alembic_version VALUES ('test')"))
        current.execute(
            text("CREATE TABLE alembic_version (version_num TEXT)")
        )
        current.execute(text("INSERT INTO alembic_version VALUES ('test')"))
        counts = {}
        for table in Base.metadata.sorted_tables:
            rows = [
                dict(row) for row in current.execute(select(table)).mappings()
            ]
            counts[table.name] = len(rows)
            if rows:
                output.execute(table.insert(), rows)
        for table in reversed(Base.metadata.sorted_tables):
            current.execute(table.delete())
    sqlite.dispose()
    return source, target, counts


def test_postgres_aktarimi_kaynak_ve_kayitlari_korur(env, tmp_path):
    source, target, expected = kaynak_hazirla(env, tmp_path)
    before = hashlib.sha256(source.read_bytes()).digest()
    try:
        assert aktar(source, target) == expected
        assert aktar(source, target, True) == expected
        with target.connect() as connection:
            for table in Base.metadata.sorted_tables:
                assert (
                    connection.scalar(select(func.count()).select_from(table))
                    == expected[table.name]
                )
        with pytest.raises(ValueError, match="Hedef boş değil"):
            aktar(source, target, True)
        assert hashlib.sha256(source.read_bytes()).digest() == before
    finally:
        with target.begin() as connection:
            connection.execute(text("DROP TABLE alembic_version"))


def test_anahtar_uyusmazligi_hedefe_yazmaz(env, tmp_path):
    source, target, _ = kaynak_hazirla(env, tmp_path)
    sqlite = create_engine(f"sqlite:///{source}")
    with sqlite.begin() as connection:
        connection.execute(
            Randevu.__table__.update().values(
                danisan_sifreli=Fernet(Fernet.generate_key())
                .encrypt(b"test")
                .decode()
            )
        )
    sqlite.dispose()
    try:
        with pytest.raises(ValueError, match="anahtarı"):
            aktar(source, target, True)
        with target.connect() as connection:
            for table in Base.metadata.sorted_tables:
                assert (
                    connection.scalar(select(func.count()).select_from(table))
                    == 0
                )
    finally:
        with target.begin() as connection:
            connection.execute(text("DROP TABLE alembic_version"))
