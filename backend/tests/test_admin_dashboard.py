"""Yönetici paneli analitik, randevu, kurucu ve yönlendirme testleri."""

import time

from sqlalchemy import select

from app.models import (
    DanisanYonlendirme,
    Davet,
    Denetim,
    GoogleTakvimBaglantisi,
    Kullanici,
    MeslektasUzmanlikIliskisi,
    ProfesyonelBaglanti,
    ProfilKaynagi,
    Randevu,
    Tavsiye,
    TerapistDogrulama,
    Uzman,
    WebsiteRozeti,
    WebsiteRozetiOlayi,
    YonlendirmeHedefi,
    YonlendirmeOlayi,
)
from app.security import parolalar, sifrele
from tests.conftest import PAROLA, login


def test_yonetici_yetki_siniri(env):
    client, _, ids, _ = env
    for endpoint in [
        "/api/yonetim/analitik",
        "/api/yonetim/randevular",
        "/api/yonetim/kurucu-programi/uyeler",
        "/api/yonetim/yonlendirmeler",
        f"/api/yonetim/uzmanlar/{ids[0]}/ozet",
    ]:
        assert client.get(endpoint).status_code == 401

    login(client, 0)
    for endpoint in [
        "/api/yonetim/analitik",
        "/api/yonetim/randevular",
        "/api/yonetim/kurucu-programi/uyeler",
        "/api/yonetim/yonlendirmeler",
        f"/api/yonetim/uzmanlar/{ids[0]}/ozet",
    ]:
        assert client.get(endpoint).status_code == 403


def test_analitik_ve_uzman_detay_ozeti(env):
    client, factory, ids, _ = env
    now = int(time.time())
    with factory() as db:
        db.add(
            GoogleTakvimBaglantisi(
                uzman_id=ids[0],
                token_sifreli=sifrele({"refresh_token": "gizli-token"}),
                hesap_sifreli=sifrele({"email": "gizli-takvim@example.com"}),
                durum="aktif",
                dolu_araliklar=[],
                son_senkron=now,
                olusturma=now,
                guncelleme=now,
            )
        )
        badge = WebsiteRozeti(uzman_id=ids[0], olusturma=now)
        db.add(badge)
        db.flush()
        db.add(
            WebsiteRozetiOlayi(
                rozet_id=badge.id, olay="badge_clicked", zaman=now
            )
        )
        db.add(
            ProfilKaynagi(
                uzman_id=ids[0],
                baslik="Kaygı Üzerine Kısa Notlar",
                aciklama="Okuma rehberi",
                url="https://example.com/yazi",
                kategori="yazi",
                sira=0,
                tiklama_sayisi=3,
                olusturma=now,
            )
        )
        cift = "::".join(sorted([ids[0], ids[1]]))
        db.add(
            ProfesyonelBaglanti(
                isteyen_uzman_id=ids[0],
                alici_uzman_id=ids[1],
                cift_anahtari=cift,
                iliski_turu="colleague",
                durum="accepted",
                istek_zamani=now,
                yanit_zamani=now,
            )
        )
        db.add(
            MeslektasUzmanlikIliskisi(
                iliskilendiren_uzman_id=ids[1],
                hedef_uzman_id=ids[0],
                uzmanlik="BDT",
                profesyonel_baglam="worked_together",
                olusturma=now,
                guncelleme=now,
            )
        )
        db.add(
            Tavsiye(
                veren_id=ids[1],
                alan_id=ids[0],
                uzmanlik="Ergen Terapisi",
                olusturma=now,
            )
        )
        db.commit()

    login(client, 2)
    analytics = client.get("/api/yonetim/analitik")
    assert analytics.status_code == 200, analytics.text
    body = analytics.json()
    assert body["ozet"]["toplam_uzman"] == 2
    assert body["ozet"]["yayindaki_uzman"] == 2
    assert body["ozet"]["randevular"]["toplam"] == 1
    assert body["ozet"]["randevular"]["bekliyor"] == 1
    assert body["ag_ve_profil"]["takvim_bagli_uzman"] == 1
    assert body["ag_ve_profil"]["rozet_olusturan_uzman"] == 1
    assert body["ag_ve_profil"]["rozet_toplam_tiklama"] == 1
    assert body["ag_ve_profil"]["profil_kaynagi_sayisi"] == 1
    assert body["ag_ve_profil"]["profil_kaynagi_tiklama"] == 3
    assert body["ag_ve_profil"]["aktif_profesyonel_baglanti"] == 1
    assert body["ag_ve_profil"]["uzmanlik_iliskisi_sayisi"] == 1
    assert body["ag_ve_profil"]["tavsiye_sayisi"] == 1
    assert body["format_dagilimi"]["cevrim_ici"] == 2
    assert body["sehir_dagilimi"][0]["sehir"] == "İstanbul"
    assert "Kurgusal" not in analytics.text
    assert "0500" not in analytics.text

    detail = client.get(f"/api/yonetim/uzmanlar/{ids[0]}/ozet")
    assert detail.status_code == 200, detail.text
    d = detail.json()
    assert d["takvim"]["bagli"] is True
    assert d["takvim"]["durum"] == "aktif"
    assert d["rozet"]["aktif"] is True
    assert d["rozet"]["tiklama_sayisi"] == 1
    assert len(d["kaynaklar"]) == 1
    assert d["ag"]["baglanti_sayisi"] == 1
    assert d["ag"]["uzmanlik_iliskisi_sayisi"] == 1
    assert d["ag"]["tavsiye_alinan"] == 1
    assert d["randevu_ozeti"]["toplam"] == 1
    assert "gizli-token" not in detail.text
    assert "gizli-takvim@example.com" not in detail.text
    assert "Kurgusal" not in detail.text


def test_genel_randevular_kvkk_guvenli(env):
    client, _, ids, booking_id = env
    login(client, 2)

    resp = client.get(
        "/api/yonetim/randevular",
        params={"durum": "bekliyor", "uzman_id": ids[0]},
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["ozet"]["toplam"] == 1
    assert payload["ozet"]["bekliyor"] == 1
    assert payload["toplam_kayit"] == 1
    assert len(payload["kayitlar"]) == 1
    row = payload["kayitlar"][0]
    assert row["id"] == booking_id
    assert row["uzman"]["id"] == ids[0]
    assert row["durum"] == "bekliyor"
    assert "danisan_sifreli" not in resp.text
    assert "Kurgusal" not in resp.text
    assert "05000000000" not in resp.text


def test_kurucu_programi_uye_ekle_ve_cikar(env):
    client, factory, ids, _ = env
    with factory() as db:
        pending_user = Kullanici(
            email="bekleyen@example.com",
            parola_ozeti=parolalar.hash(PAROLA),
            rol="uzman",
        )
        db.add(pending_user)
        db.flush()
        pending_profile = Uzman(
            kullanici_id=pending_user.id,
            ad="Onaysız Uzman",
            sehir="Ankara",
            ilce="Çankaya",
            biyografi="Test için bekleyen terapist profili.",
            ucret=1200,
            formatlar=["Çevrim içi"],
            onayli=False,
        )
        db.add(pending_profile)
        db.flush()
        pending_id = pending_profile.id
        db.commit()

    login(client, 2)
    initial = client.get("/api/yonetim/kurucu-programi/uyeler")
    assert initial.status_code == 200
    assert initial.json()["uyeler"] == []
    assert len(initial.json()["adaylar"]) == 2

    cap = client.patch("/api/yonetim/kurucu-programi", json={"azami_uye": 1})
    assert cap.status_code == 200
    assert cap.json()["atanmis_uye"] == 1

    after_cap = client.get("/api/yonetim/kurucu-programi/uyeler").json()
    first_member_id = after_cap["uyeler"][0]["uzman_id"]
    remaining_candidate_id = after_cap["adaylar"][0]["uzman_id"]

    # Kapasite doluyken ikinci kişi eklenememeli (409)
    full_resp = client.post(
        "/api/yonetim/kurucu-programi/uyeler",
        json={"uzman_id": remaining_candidate_id},
    )
    assert full_resp.status_code == 409

    # Çıkarıp yeniden manuel eklemeyi doğrula
    json_hdr = {"Content-Type": "application/json"}
    removed = client.delete(
        f"/api/yonetim/kurucu-programi/uyeler/{first_member_id}",
        headers=json_hdr,
    )
    assert removed.status_code == 200
    assert removed.json()["cikarilan_uzman_id"] == first_member_id

    # Kapasiteyi 2 yapıp önce tüm üyeleri temizleyip manuel eklemeyi test et
    client.patch("/api/yonetim/kurucu-programi", json={"azami_uye": 2})
    current_members = client.get("/api/yonetim/kurucu-programi/uyeler").json()[
        "uyeler"
    ]
    for member in current_members:
        client.delete(
            f"/api/yonetim/kurucu-programi/uyeler/{member['uzman_id']}",
            headers=json_hdr,
        )

    added = client.post(
        "/api/yonetim/kurucu-programi/uyeler",
        json={"uzman_id": first_member_id},
    )
    assert added.status_code == 201
    assert added.json()["eklenen"]["uzman_id"] == first_member_id

    duplicate = client.post(
        "/api/yonetim/kurucu-programi/uyeler",
        json={"uzman_id": first_member_id},
    )
    assert duplicate.status_code == 409

    unverified = client.post(
        "/api/yonetim/kurucu-programi/uyeler", json={"uzman_id": pending_id}
    )
    assert unverified.status_code == 422

    with factory() as db:
        actions = list(
            db.scalars(
                select(Denetim.islem).where(
                    Denetim.islem.in_(
                        [
                            "kurucu_programi.uye_ekle",
                            "kurucu_programi.uye_cikar",
                        ]
                    )
                )
            )
        )
        assert "kurucu_programi.uye_ekle" in actions
        assert "kurucu_programi.uye_cikar" in actions


def test_yonlendirmeler_ve_referans_yonetimi(env):
    client, factory, ids, _ = env
    now = int(time.time())
    with factory() as db:
        u3 = Kullanici(
            email="uzman_hedef@example.com",
            parola_ozeti=parolalar.hash(PAROLA),
            rol="uzman",
        )
        db.add(u3)
        db.flush()
        p3 = Uzman(
            kullanici_id=u3.id,
            ad="Üçüncü Uzman",
            sehir="İzmir",
            ilce="Konak",
            biyografi="Test için hazırlanmış üçüncü terapist profili.",
            ucret=1800,
            formatlar=["Yüz yüze"],
            onayli=True,
        )
        db.add(p3)
        db.flush()
        db.add(
            TerapistDogrulama(
                uzman_id=p3.id,
                durum="verified",
                gonderilme=now,
                incelenme=now,
            )
        )

        ref1 = DanisanYonlendirme(
            yonlendiren_uzman_id=ids[0],
            token_ozeti="hash-ref-1",
            neden="schedule_full",
            durum="active",
            olusturma=now,
            sure_bitimi=now + 86400,
            goruntulenme_sayisi=4,
        )
        ref2 = DanisanYonlendirme(
            yonlendiren_uzman_id=ids[0],
            token_ozeti="hash-ref-2",
            neden="location",
            durum="active",
            olusturma=now - 10,
            sure_bitimi=now + 86400,
            goruntulenme_sayisi=2,
        )
        db.add_all([ref1, ref2])
        db.flush()
        db.add_all(
            [
                YonlendirmeHedefi(
                    yonlendirme_id=ref1.id, uzman_id=ids[1], sira=0
                ),
                YonlendirmeHedefi(
                    yonlendirme_id=ref1.id, uzman_id=p3.id, sira=1
                ),
                YonlendirmeHedefi(
                    yonlendirme_id=ref2.id, uzman_id=ids[1], sira=0
                ),
                YonlendirmeOlayi(
                    yonlendirme_id=ref1.id,
                    olay="profile_clicked_from_referral",
                    hedef_uzman_id=ids[1],
                    zaman=now,
                ),
            ]
        )
        invite = Davet(
            davet_eden_uzman_id=ids[0],
            email="davetli@example.com",
            ad="Davetli Uzman",
            token_ozeti="hash-davet-1",
            olusturma=now,
            sure_bitimi=now + 86400,
            durum="pending",
            onerilen_uzmanlik="EMDR",
        )
        db.add(invite)
        db.commit()
        p3_id = p3.id
        invite_id = invite.id

    login(client, 2)
    refs_resp = client.get("/api/yonetim/yonlendirmeler")
    assert refs_resp.status_code == 200, refs_resp.text
    r = refs_resp.json()
    assert r["ozet"]["toplam_link"] == 2
    assert r["ozet"]["aktif_link"] == 2
    assert r["ozet"]["yonlendiren_uzman_sayisi"] == 1
    assert r["ozet"]["toplam_yonlendirilen_hedef"] == 3
    assert r["ozet"]["toplam_goruntulenme"] == 6
    assert r["ozet"]["toplam_profil_tiklamasi"] == 1
    assert len(r["uzman_ozetleri"]) == 1
    creator = r["uzman_ozetleri"][0]
    assert creator["uzman"]["id"] == ids[0]
    assert creator["link_sayisi"] == 2
    assert creator["toplam_hedef_gosterimi"] == 3
    target_counts = {t["uzman_id"]: t["sayi"] for t in creator["hedefler"]}
    assert target_counts == {ids[1]: 2, p3_id: 1}
    assert r["alan_uzman_ozetleri"][0]["uzman"]["id"] == ids[1]
    assert r["alan_uzman_ozetleri"][0]["alinan_yonlendirme_sayisi"] == 2
    assert "hash-ref-1" not in refs_resp.text

    inv_resp = client.get("/api/yonetim/referanslar")
    assert inv_resp.status_code == 200, inv_resp.text
    inv = inv_resp.json()
    assert inv["ozet"]["bekleyen_davet"] == 1
    assert inv["davet_ozetleri"][0]["uzman_id"] == ids[0]
    assert inv["davet_ozetleri"][0]["bekleyen"] == 1
    assert inv["davet_ozetleri"][0]["kalan_hak"] == 2

    json_hdr = {"Content-Type": "application/json"}
    revoke = client.delete(
        f"/api/yonetim/davetler/{invite_id}", headers=json_hdr
    )
    assert revoke.status_code == 204
    revoke_again = client.delete(
        f"/api/yonetim/davetler/{invite_id}", headers=json_hdr
    )
    assert revoke_again.status_code == 409


def test_yonetim_randevu_detay_bildirim_ve_eskalasyon(env):
    client, factory, _, booking_id = env
    now = int(time.time())
    with factory() as db:
        booking = db.get(Randevu, booking_id)
        booking.olusturma = now - 36 * 3600
        db.commit()

    login(client, 2)

    overdue_list = client.get(
        "/api/yonetim/randevular",
        params={"gecikmis": True, "yanit_suresi_saat": 24},
    )
    assert overdue_list.status_code == 200, overdue_list.text
    list_payload = overdue_list.json()
    assert list_payload["ozet"]["gecikmis_bekleyen"] == 1
    assert len(list_payload["kayitlar"]) == 1
    assert list_payload["kayitlar"][0]["yanit_gecikti"] is True
    assert list_payload["kayitlar"][0]["bekleme_suresi_saat"] >= 35

    detail_resp = client.get(f"/api/yonetim/randevular/{booking_id}")
    assert detail_resp.status_code == 200, detail_resp.text
    detail = detail_resp.json()
    assert detail["id"] == booking_id
    assert detail["yanit_gecikti"] is True
    assert "Kurgusal" not in detail_resp.text
    assert "05000000000" not in detail_resp.text
    assert detail["danisan_maskeli"]["telefon"].endswith("00")

    json_hdr = {"Content-Type": "application/json"}
    notif_resp = client.post(
        f"/api/yonetim/randevular/{booking_id}/bildirim",
        json={
            "mesaj": "Danışan 36 saattir yanıt bekliyor, lütfen inceleyin.",
            "tur": "hatirlatma",
        },
        headers=json_hdr,
    )
    assert notif_resp.status_code == 201, notif_resp.text
    notif_id = notif_resp.json()["id"]

    # Terapist giriş yapıp yönetici bildirimini görür ve okundu işaretler.
    login(client, 0)
    t_notifs = client.get("/api/uzman/bildirimler")
    assert t_notifs.status_code == 200, t_notifs.text
    t_payload = t_notifs.json()
    assert t_payload["okunmamis_sayisi"] == 1
    assert t_payload["kayitlar"][0]["id"] == notif_id

    mark_read = client.patch(
        f"/api/uzman/bildirimler/{notif_id}/okundu", headers=json_hdr
    )
    assert mark_read.status_code == 204
    assert client.get("/api/uzman/bildirimler").json()["okunmamis_sayisi"] == 0

    # Yönetici süresi dolan randevuyu terapist yerine tamamlar.
    login(client, 2)
    complete_resp = client.patch(
        f"/api/yonetim/randevular/{booking_id}/durum",
        json={
            "durum": "onaylandi",
            "not_metni": "36 saat yanıt gelmediği için yönetici onayladı.",
            "eskalasyon_tamamla": True,
            "terapiste_bildir": True,
        },
        headers=json_hdr,
    )
    assert complete_resp.status_code == 200, complete_resp.text
    assert complete_resp.json()["durum"] == "onaylandi"
    assert complete_resp.json()["bildirim_sayisi"] == 2

    updated_detail = client.get(f"/api/yonetim/randevular/{booking_id}").json()
    assert updated_detail["durum"] == "onaylandi"
    assert len(updated_detail["bildirimler"]) == 2
    assert any(
        log["islem"] == "randevu.yonetim_tamamla"
        for log in updated_detail["islem_gecmisi"]
    )
