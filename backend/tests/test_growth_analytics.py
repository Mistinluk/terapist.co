"""Phase 11 terapist büyüme analitiği ve veri sahipliği."""

import time

from app.models import (
    DanisanYonlendirme,
    Davet,
    ProfesyonelBaglanti,
    Tavsiye,
    YonlendirmeOlayi,
    baglanti_cifti,
)
from tests.conftest import login


def test_buyume_analitigi_hesaba_ait_aksiyon_metriklerini_sayar(env):
    client, factory, ids, _ = env
    assert client.get("/api/uzman/buyume-analitigi").status_code == 401
    login(client)
    now = int(time.time())

    with factory() as db:
        db.add(
            ProfesyonelBaglanti(
                isteyen_uzman_id=ids[0],
                alici_uzman_id=ids[1],
                cift_anahtari=baglanti_cifti(ids[0], ids[1]),
                iliski_turu="colleague",
                durum="accepted",
                istek_zamani=now,
                yanit_zamani=now,
            )
        )
        db.add_all(
            [
                Davet(
                    davet_eden_uzman_id=ids[0],
                    email="kabul@example.com",
                    token_ozeti="a" * 64,
                    olusturma=now,
                    sure_bitimi=now + 1000,
                    kabul=now,
                    durum="accepted",
                    kabul_eden_uzman_id=ids[1],
                ),
                Davet(
                    davet_eden_uzman_id=ids[0],
                    email="bekleyen@example.com",
                    token_ozeti="b" * 64,
                    olusturma=now,
                    sure_bitimi=now + 1000,
                    kabul=None,
                    durum="pending",
                    kabul_eden_uzman_id=None,
                ),
                Davet(
                    davet_eden_uzman_id=ids[0],
                    email="suresi-dolmus@example.com",
                    token_ozeti="f" * 64,
                    olusturma=now - 2000,
                    sure_bitimi=now - 1000,
                    kabul=None,
                    durum="pending",
                    kabul_eden_uzman_id=None,
                ),
            ]
        )
        active = DanisanYonlendirme(
            yonlendiren_uzman_id=ids[0],
            token_ozeti="c" * 64,
            neden="schedule_full",
            durum="active",
            olusturma=now,
            sure_bitimi=now + 1000,
        )
        expired = DanisanYonlendirme(
            yonlendiren_uzman_id=ids[0],
            token_ozeti="d" * 64,
            neden="location",
            durum="active",
            olusturma=now,
            sure_bitimi=now - 1,
        )
        db.add_all([active, expired])
        db.flush()
        db.add_all(
            [
                YonlendirmeOlayi(
                    yonlendirme_id=active.id,
                    olay="profile_clicked_from_referral",
                    hedef_uzman_id=ids[1],
                    zaman=now,
                ),
                YonlendirmeOlayi(
                    yonlendirme_id=active.id,
                    olay="profile_clicked_from_referral",
                    hedef_uzman_id=ids[1],
                    zaman=now + 1,
                ),
            ]
        )
        db.add(
            Tavsiye(
                veren_id=ids[0],
                alan_id=ids[1],
                uzmanlik="Çocuk Terapisi",
                olusturma=now,
            )
        )
        db.commit()

    response = client.get("/api/uzman/buyume-analitigi")
    assert response.status_code == 200, response.text
    assert response.json() == {
        "baglantilar": {"toplam": 1, "bekleyen_istekler": 0},
        "davetler": {
            "gonderilen": 3,
            "kabul_edilen": 1,
            "bekleyen": 1,
            "kalan_hak": 1,
        },
        "yonlendirmeler": {
            "olusturulan_baglanti": 2,
            "aktif_baglanti": 1,
            "profil_tiklamalari": 2,
        },
        "tavsiyeler": {"onerilen_terapist": 1},
    }


def test_buyume_analitigi_baska_terapistin_verisini_saymaz(env):
    client, factory, ids, _ = env
    now = int(time.time())
    with factory() as db:
        db.add(
            DanisanYonlendirme(
                yonlendiren_uzman_id=ids[1],
                token_ozeti="e" * 64,
                neden="other",
                durum="active",
                olusturma=now,
                sure_bitimi=now + 1000,
            )
        )
        db.commit()

    login(client)
    data = client.get("/api/uzman/buyume-analitigi").json()
    assert data["yonlendirmeler"] == {
        "olusturulan_baglanti": 0,
        "aktif_baglanti": 0,
        "profil_tiklamalari": 0,
    }
