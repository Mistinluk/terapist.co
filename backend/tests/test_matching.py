"""Tercih sırası, kesin sınırlar ve veri mahremiyeti için örnek senaryolar."""

import pytest
from sqlalchemy import event, func, select

from app.models import Denetim, Kullanici, Randevu, Uzman
from app.schemas import EslestirmeGirdi


def arama(client, **body):
    response = client.post("/api/eslestirme", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def ayarla(factory, ids):
    with factory.begin() as db:
        first, second = [db.get(Uzman, id_) for id_ in ids]
        first.ad = "Aaa Kurgusal Uzman"
        first.uzmanliklar = ["Kaygı"]
        first.ekoller = ["BDT"]
        second.ad = "Zzz Kurgusal Uzman"
        second.uzmanliklar = ["Kaygı", "Travma"]
        second.ekoller = ["BDT", "ACT"]
        for p in (first, second):
            p.kitle = ["Yetişkin"]
            p.deneyim_yili = 5


def test_agirlik_aciklama_ve_bos_tercihler(env):
    client, factory, ids, _ = env
    ayarla(factory, ids)
    body = {"uzmanliklar": ["Kaygı", "Travma"], "ekoller": ["BDT", "ACT"]}
    result = arama(client, **body)
    assert [p["id"] for p in result["sonuclar"]] == ids[::-1]
    assert [p["eslesme"]["puan"] for p in result["sonuclar"]] == [100, 50]
    partial = result["sonuclar"][1]["eslesme"]
    assert partial["eslesen_alanlar"] == ["Kaygı"]
    assert partial["eksik_alanlar"] == ["Travma"]
    assert partial["eksik_ekoller"] == ["ACT"]
    only_areas = arama(client, uzmanliklar=["Kaygı", "Travma"])
    assert [p["eslesme"]["puan"] for p in only_areas["sonuclar"]] == [100, 50]
    none = arama(client)
    assert [p["id"] for p in none["sonuclar"]] == ids
    assert all(p["eslesme"]["puan"] is None for p in none["sonuclar"])
    zero = arama(client, uzmanliklar=["Olmayan alan"])
    assert all(p["eslesme"]["puan"] == 0 for p in zero["sonuclar"])


def test_alan_yaklasimdan_once_gelir_ve_unvan_bonus_degildir(env):
    client, factory, ids, _ = env
    ayarla(factory, ids)
    with factory.begin() as db:
        first, second = [db.get(Uzman, id_) for id_ in ids]
        first.ekoller = []
        second.uzmanliklar = []
        second.ad = "Prof. Dr. Kurgusal Uzman"
        second.deneyim_yili = 40
        second.ucret = 9000
    result = arama(client, uzmanliklar=["Kaygı"], ekoller=["BDT"])
    assert [p["id"] for p in result["sonuclar"]] == ids
    assert [p["eslesme"]["puan"] for p in result["sonuclar"]] == [70, 30]


@pytest.mark.parametrize(
    "change,criteria",
    [
        ({"sehir": "Ankara"}, {"sehir": "İstanbul"}),
        ({"kitle": ["Çocuk"]}, {"kitle": "Yetişkin"}),
        ({"formatlar": ["Yüz yüze"]}, {"format": "Çevrim içi"}),
        ({"ucret": 1501}, {"azami_ucret": 1500}),
        ({"deneyim_yili": 4}, {"deneyim": 5}),
        ({"onayli": False}, {}),
        ({"arsivli": True}, {}),
    ],
)
def test_en_yuksek_puan_kesin_kosullari_asamaz(env, change, criteria):
    client, factory, ids, _ = env
    ayarla(factory, ids)
    with factory.begin() as db:
        for field, value in change.items():
            setattr(db.get(Uzman, ids[1]), field, value)
    result = arama(client, uzmanliklar=["Travma"], **criteria)
    assert [p["id"] for p in result["sonuclar"]] == [ids[0]]


def test_sifir_butce_fiyat_sirasi_ve_turkce_ad(env):
    client, factory, ids, _ = env
    ayarla(factory, ids)
    with factory.begin() as db:
        first = db.get(Uzman, ids[0])
        first.ad = "ÖZGÜR IŞIK"
        first.ucret = 0
    assert arama(client, azami_ucret=0)["toplam"] == 1
    assert arama(client, arama="özgür ışık")["sonuclar"][0]["id"] == ids[0]
    assert arama(client, arama="%")["toplam"] == 0
    result = arama(client, sirala="ucret_artan", uzmanliklar=["Travma"])
    assert [p["id"] for p in result["sonuclar"]] == ids
    assert arama(client, sehir="Olmayan Şehir")["toplam"] == 0


def test_global_siralama_sayfalama_ve_iki_sorgu(env):
    client, factory, ids, _ = env
    ayarla(factory, ids)
    with factory.begin() as db:
        password_hash = db.scalar(select(Kullanici)).parola_ozeti
        for i in range(25):
            user = Kullanici(
                email=f"sirala{i}@example.com", parola_ozeti=password_hash
            )
            db.add(user)
            db.flush()
            db.add(
                Uzman(
                    kullanici_id=user.id,
                    ad="Aaa Kurgusal Uzman",
                    sehir="İstanbul",
                    ilce="Kadıköy",
                    biyografi="Sayfalama testi için kurgusal uzman profili.",
                    onayli=True,
                    uzmanliklar=[],
                    formatlar=["Çevrim içi"],
                )
            )
    queries = []
    engine = factory.kw["bind"]

    def capture(conn, cursor, statement, params, context, many):
        queries.append(statement)

    event.listen(engine, "before_cursor_execute", capture)
    try:
        first = arama(client, uzmanliklar=["Travma"])
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert len(queries) == 2
    assert first["sonuclar"][0]["id"] == ids[1]
    assert first["toplam"] == 27
    pages = [first] + [
        arama(client, uzmanliklar=["Travma"], sayfa=p) for p in (2, 3)
    ]
    returned = [x["id"] for p in pages for x in p["sonuclar"]]
    assert len(returned) == len(set(returned)) == 27
    assert first == arama(client, uzmanliklar=["Travma"])
    assert arama(client, sayfa=4)["sonuclar"] == []


@pytest.mark.parametrize(
    "body",
    [
        {"azami_ucret": -1},
        {"deneyim": 71},
        {"sayfa": 0},
        {"uzmanliklar": ["a"] * 6},
        {"ekoller": ["a"] * 4},
        {"format": "geçersiz"},
        {"hasta_adi": "Gizli Girdi"},
    ],
)
def test_gecersiz_girdi_reddedilir(env, body):
    client, _, _, _ = env
    response = client.post("/api/eslestirme", json=body)
    assert response.status_code == 422
    assert "Gizli Girdi" not in response.text


def test_tekrarlar_mahremiyet_ve_origin(env):
    client, factory, ids, _ = env
    ayarla(factory, ids)
    assert EslestirmeGirdi(uzmanliklar=[" Kaygı ", "Kaygı"]).uzmanliklar == [
        "Kaygı"
    ]
    tables = [Kullanici, Uzman, Randevu, Denetim]
    with factory() as db:
        before = [
            db.scalar(select(func.count()).select_from(t)) for t in tables
        ]
    response = client.post("/api/eslestirme", json={"uzmanliklar": ["Kaygı"]})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "set-cookie" not in response.headers
    assert "parola_ozeti" not in response.text
    assert "danisan_sifreli" not in response.text
    with factory() as db:
        assert before == [
            db.scalar(select(func.count()).select_from(t)) for t in tables
        ]
    assert (
        client.post(
            "/api/eslestirme",
            json={},
            headers={"Origin": "https://yabanci.example"},
        ).status_code
        == 403
    )
