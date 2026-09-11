"""Gerçek dosyaları ve kişisel verileri kullanmayan yalıtılmış testler."""

import os
import secrets
import time

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["ORTAM"] = "test"
os.environ["VERITABANI_URL"] = "sqlite://"
os.environ["SIFRELEME_ANAHTARI"] = Fernet.generate_key().decode()
os.environ["HIZ_SINIRI_ANAHTARI"] = secrets.token_urlsafe(48)
os.environ["UYGULAMA_ADRESI"] = "http://localhost:5173"

from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Kullanici, Randevu, Uzman  # noqa: E402
from app.security import hiz_siniri, parolalar, sifrele  # noqa: E402

PAROLA = "Yalnizca-Test-123456!"


@pytest.fixture(
    params=["sqlite"]
    + (["postgresql"] if os.environ.get("TEST_POSTGRES_URL") else [])
)
def env(request):
    if request.param == "postgresql":
        url = os.environ["TEST_POSTGRES_URL"]
        if not url.endswith("/terapist_test") or "127.0.0.1:55439" not in url:
            raise RuntimeError("Yalnızca yerel test veritabanı kabul edilir.")
        engine = create_engine(url)
    else:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, expire_on_commit=False)

    def override():
        with factory() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise

    app.dependency_overrides[get_db] = override
    hiz_siniri.kayitlar.clear()
    with factory() as db:
        ids = []
        for index in range(3):
            user = Kullanici(
                email=f"uzman{index}@example.com",
                parola_ozeti=parolalar.hash(PAROLA),
                rol="yonetici" if index == 2 else "uzman",
            )
            db.add(user)
            db.flush()
            if index < 2:
                profile = Uzman(
                    kullanici_id=user.id,
                    ad=f"Örnek Uzman {index}",
                    sehir="İstanbul",
                    ilce="Kadıköy",
                    biyografi="Test için hazırlanmış kurgusal uzman profili.",
                    ucret=1500,
                    formatlar=["Çevrim içi"],
                    onayli=True,
                    calisma_saatleri=[
                        {"gun": day, "baslangic": 9, "bitis": 17}
                        for day in range(7)
                    ],
                )
                db.add(profile)
                db.flush()
                ids.append(profile.id)
        booking = Randevu(
            uzman_id=ids[0],
            baslangic=int(time.time()) + 86400,
            danisan_sifreli=sifrele(
                {"ad": "Kurgusal Danışan", "telefon": "05000000000"}
            ),
            olusturma=int(time.time()),
            aydinlatma_surumu="taslak-1",
        )
        db.add(booking)
        db.commit()
        booking_id = booking.id
    with TestClient(app, raise_server_exceptions=False) as client:
        client.headers["Origin"] = "http://localhost:5173"
        yield client, factory, ids, booking_id
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def login(client, index=0):
    response = client.post(
        "/api/oturum/giris",
        json={
            "email": f"uzman{index}@example.com",
            "parola": PAROLA,
        },
    )
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = response.json()["csrf"]
    return response
