import os
import secrets
from concurrent.futures import ThreadPoolExecutor

import pyotp
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import select

from app.main import app
from app.models import Kullanici, Uzman
from app.security import HizSiniri
from tests.conftest import PAROLA, login
from tests.test_appointments import payload


def test_basvuru_mfa_profil_onayi(env):
    client, factory, ids, _ = env
    profile = client.get(f"/api/uzmanlar/{ids[0]}").json()
    for field in ["id", "onayli", "arsivli"]:
        profile.pop(field)
    body = {"email": "yeni@example.com", "parola": PAROLA, "profil": profile}
    created = client.post("/api/oturum/basvuru", json=body)
    assert created.status_code == 201, created.text
    secret = created.json()["mfa_anahtari"]
    with factory() as db:
        user = db.scalar(
            select(Kullanici).where(Kullanici.email == "yeni@example.com")
        )
        expert = db.scalar(select(Uzman).where(Uzman.kullanici_id == user.id))
        expert_id = expert.id
        assert not expert.onayli
        assert user.parola_ozeti.startswith("$argon2id$")
        assert secret not in user.mfa_sirri
    response = client.post(
        "/api/oturum/giris",
        json={
            "email": body["email"],
            "parola": PAROLA,
            "dogrulama_kodu": pyotp.TOTP(secret).now(),
        },
    )
    assert response.status_code == 200
    login(client, 2)
    assert (
        client.patch(
            f"/api/yonetim/uzmanlar/{expert_id}", json={"onayli": True}
        ).status_code
        == 204
    )
    assert client.get(f"/api/uzmanlar/{expert_id}").status_code == 200


def test_turkce_arama_json_filtreleri(env):
    client, factory, ids, _ = env
    with factory() as db:
        expert = db.get(Uzman, ids[0])
        expert.ad = "ÖZGÜR IŞIK"
        expert.ekoller = ["BDT"]
        expert.uzmanliklar = ["Kaygı"]
        db.commit()
    response = client.get(
        "/api/uzmanlar",
        params={
            "arama": "özgür ışık",
            "ekol": "BDT",
            "uzmanlik": "Kaygı",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["toplam"] == 1
    assert client.get("/api/uzmanlar?arama=%25").json()["toplam"] == 0
    assert client.get("/api/uzmanlar?ekol=EMDR").json()["toplam"] == 0


def test_es_zamanli_postgresql_talepleri(env):
    client, factory, ids, _ = env
    if factory.kw["bind"].dialect.name != "postgresql":
        pytest.skip("Eşzamanlılık gerçek PostgreSQL üzerinde sınanır.")
    body = payload(client, ids[0])

    def send():
        with TestClient(app, raise_server_exceptions=False) as other:
            return other.post(
                "/api/randevular",
                json=body,
                headers={"Origin": "http://localhost:5173"},
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = list(pool.map(lambda _: send(), range(2)))
    assert sorted(codes) == [201, 409]


@pytest.mark.skipif(not os.environ.get("TEST_REDIS_URL"), reason="Redis yok")
def test_redis_ortak_hiz_siniri():
    url = os.environ["TEST_REDIS_URL"]
    assert url == "redis://127.0.0.1:56379/0"
    first, second = HizSiniri(), HizSiniri()
    first.redis = Redis.from_url(url)
    second.redis = Redis.from_url(url)
    key = "test:" + secrets.token_urlsafe(32)
    first.kontrol(key, 1, 5)
    with pytest.raises(HTTPException) as error:
        second.kontrol(key, 1, 5)
    assert error.value.status_code == 429
    first.redis.close()
    second.redis.close()
