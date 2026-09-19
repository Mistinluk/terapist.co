"""Veritabanı bağlantısı ve istek başına işlem kapsamı."""

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
engine = create_engine(
    settings.veritabani_url,
    pool_pre_ping=True,
    hide_parameters=True,
    connect_args=(
        {"check_same_thread": False}
        if settings.veritabani_url.startswith("sqlite")
        else {}
    ),
)

if settings.veritabani_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def sqlite_guvenligi(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA busy_timeout=5000")


SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Bir HTTP isteğinin veritabanı oturumunu ve işlem sınırını yönetir.

    Başarılı akış commit, istisna rollback ile biter; bağlam yöneticisi
    bağlantıyı havuza iade eder. Yanıt öncesi kalıcılık gerektiren yazma
    uçları kaydet() çağırır. Eşleştirme yalnızca SELECT çalıştırır.
    """
    with SessionLocal() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise


def kaydet(db: Session) -> None:
    """Yanıt dönmeden önce işlem ve denetim kaydını birlikte kalıcılaştırır."""
    db.commit()
