"""Linktree Pro ozellikleri: kilit, zamanlama, embed, bekleme, tema, QR."""

import time

from sqlalchemy import select

from app.models import (
    BeklemeListesiKaydi,
    ProfilKaynagi,
    Tavsiye,
    Uzman,
    UzmanEngeli,
)
from tests.conftest import login


def _kaynak_ekle(client, **overrides):
    payload = {
        "baslik": "Ornek Baglanti",
        "aciklama": "Danisanlar icin bilgilendirici kaynak.",
        "url": "https://example.com/form",
        "kategori": "yazi",
    }
    payload.update(overrides)
    return client.post("/api/uzman/kaynaklar", json=payload)


def test_kilitli_link_gizliligi_sifre_acilisi_ve_tiklama_sayaci(env):
    client, factory, ids, _ = env
    login(client, 0)
    res = _kaynak_ekle(
        client,
        baslik="BDT Degerlendirme Formu",
        url="https://example.com/bdt-formu",
        vurgulu=True,
        vurgu_etiketi="Ozel Form",
        erisim_kodu="4321",
    )
    assert res.status_code == 201, res.text
    res_data = res.json()
    res_id = res_data["id"]
    assert res_data["kilitli"] is True
    assert res_data["vurgulu"] is True
    assert res_data["vurgu_etiketi"] == "Ozel Form"
    assert res_data["url"] == "https://example.com/bdt-formu"
    assert "sifre_ozeti" not in res_data

    # Sahibi kendi kaynaginda gercek URL'yi gormeye devam eder.
    owner_list = client.get("/api/uzman/kaynaklar")
    assert owner_list.status_code == 200
    assert owner_list.json()[0]["url"] == "https://example.com/bdt-formu"

    # Acik profilde URL maskelenir ve dogrudan acma 403 doner.
    client.cookies.clear()
    public_list = client.get(f"/api/uzmanlar/{ids[0]}/kaynaklar")
    assert public_list.status_code == 200
    public_item = public_list.json()[0]
    assert public_item["kilitli"] is True
    assert public_item["url"] == ""
    assert "sifre_ozeti" not in public_item

    direct_open = client.get(
        f"/api/kaynaklar/{res_id}/ac",
        follow_redirects=False,
    )
    assert direct_open.status_code == 403

    # Yanlis sifre reddedilir; dogru sifre ile URL acilir ve sayac artar.
    wrong = client.post(
        f"/api/kaynaklar/{res_id}/ac",
        json={"kod": "9999"},
    )
    assert wrong.status_code == 403

    right = client.post(
        f"/api/kaynaklar/{res_id}/ac",
        json={"kod": "4321"},
    )
    assert right.status_code == 200, right.text
    assert right.json()["url"] == "https://example.com/bdt-formu"

    with factory() as db:
        row = db.get(ProfilKaynagi, res_id)
        assert row is not None
        assert row.tiklama_sayisi == 1

    # Sahibi sifreyi kaldirdiginda baglanti acik hale gelir.
    login(client, 0)
    cleared = client.patch(
        f"/api/uzman/kaynaklar/{res_id}",
        json={
            "baslik": "BDT Degerlendirme Formu",
            "url": "https://example.com/bdt-formu",
            "kategori": "yazi",
            "kilidi_kaldir": True,
        },
    )
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["kilitli"] is False
    client.cookies.clear()
    revealed = client.get(f"/api/uzmanlar/{ids[0]}/kaynaklar").json()[0]
    assert revealed["url"] == "https://example.com/bdt-formu"


def test_zamanlanmis_link_gizlenir_ve_acilamaz(env):
    client, _, ids, _ = env
    login(client, 0)
    now = int(time.time())

    future = _kaynak_ekle(
        client,
        baslik="Gelecek Atolye",
        url="https://example.com/gelecek",
        baslangic_zamani=now + 3600,
        bitis_zamani=now + 7200,
    )
    expired = _kaynak_ekle(
        client,
        baslik="Biten Etkinlik",
        url="https://example.com/eski",
        baslangic_zamani=now - 7200,
        bitis_zamani=now - 3600,
    )
    active = _kaynak_ekle(
        client,
        baslik="Aktif Grup Terapisi",
        url="https://example.com/aktif",
        baslangic_zamani=now - 600,
        bitis_zamani=now + 3600,
    )
    assert future.status_code == 201
    assert expired.status_code == 201
    assert active.status_code == 201

    owner_items = client.get("/api/uzman/kaynaklar").json()
    states = {row["id"]: row["zaman_durumu"] for row in owner_items}
    assert states[future.json()["id"]] == "planli"
    assert states[expired.json()["id"]] == "suresi_doldu"
    assert states[active.json()["id"]] == "aktif"

    client.cookies.clear()
    public_items = client.get(f"/api/uzmanlar/{ids[0]}/kaynaklar").json()
    assert [row["id"] for row in public_items] == [active.json()["id"]]

    assert (
        client.get(
            f"/api/kaynaklar/{future.json()['id']}/ac",
            follow_redirects=False,
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/kaynaklar/{expired.json()['id']}/ac",
            json={"kod": "0000"},
        ).status_code
        == 404
    )


def test_youtube_ve_spotify_embed_dogrulama_ve_kanoniklestirme(env):
    client, _, _, _ = env
    login(client, 0)

    yt = _kaynak_ekle(
        client,
        baslik="Nefes Egzersizi",
        url="https://youtu.be/dQw4w9WgXcQ?si=sharetoken",
        kategori="diger",
    )
    assert yt.status_code == 201, yt.text
    assert yt.json()["medya_turu"] == "youtube"
    assert (
        yt.json()["medya_embed_url"]
        == "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    )

    sp = _kaynak_ekle(
        client,
        baslik="Mindfulness Calm Listesi",
        url="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=123",
        kategori="podcast",
    )
    assert sp.status_code == 201, sp.text
    assert sp.json()["medya_turu"] == "spotify"
    assert (
        sp.json()["medya_embed_url"]
        == "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M"
    )

    plain = _kaynak_ekle(
        client,
        baslik="Duz Baglanti",
        url="https://example.com/makale",
    )
    assert plain.status_code == 201
    assert plain.json()["medya_turu"] == "none"
    assert not plain.json()["medya_embed_url"]


def test_bekleme_listesi_kayit_sifreleme_yonetim_ve_admin_siniri(env):
    client, factory, ids, _ = env
    legal = client.get("/api/aydinlatma").json()

    wrong_ver = client.post(
        "/api/bekleme-listesi",
        json={
            "uzman_id": ids[0],
            "ad": "Kurgusal Bekleyen",
            "telefon": "05551234567",
            "aydinlatma_okundu": True,
            "aydinlatma_surumu": "eski-surum",
        },
    )
    assert wrong_ver.status_code == 409

    ok = client.post(
        "/api/bekleme-listesi",
        json={
            "uzman_id": ids[0],
            "ad": "Kurgusal Bekleyen",
            "telefon": "05551234567",
            "email": "bekleyen@example.com",
            "tercih_format": "cevrim_ici",
            "tercih_zaman": "aksam",
            "aydinlatma_okundu": True,
            "aydinlatma_surumu": legal["surum"],
        },
    )
    assert ok.status_code == 201, ok.text

    # Veritabaninda veriler duz metin saklanmaz.
    with factory() as db:
        raw_row = db.scalar(
            select(BeklemeListesiKaydi).where(
                BeklemeListesiKaydi.uzman_id == ids[0]
            )
        )
        assert raw_row is not None
        assert "Kurgusal Bekleyen" not in raw_row.danisan_sifreli
        assert "05551234567" not in raw_row.danisan_sifreli
        entry_id = raw_row.id

    # Sahip cozulmus kaydi gorur ve gunceller.
    login(client, 0)
    listed = client.get("/api/uzman/bekleme-listesi")
    assert listed.status_code == 200
    items = listed.json()
    assert len(items) == 1
    assert items[0]["ad"] == "Kurgusal Bekleyen"
    assert items[0]["durum"] == "bekliyor"

    patched = client.patch(
        f"/api/uzman/bekleme-listesi/{entry_id}",
        json={"durum": "iletisime_gecildi"},
    )
    assert patched.status_code == 204

    # Baska uzman erisemez.
    login(client, 1)
    assert client.get("/api/uzman/bekleme-listesi").json() == []
    assert (
        client.patch(
            f"/api/uzman/bekleme-listesi/{entry_id}",
            json={"durum": "kapandi"},
        ).status_code
        == 404
    )

    # Admin ozetinde yalniz anonim sayilar yer alir, kisisel veri yoktur.
    login(client, 2)
    summary = client.get(f"/api/yonetim/uzmanlar/{ids[0]}/ozet")
    assert summary.status_code == 200, summary.text
    summary_text = summary.text
    assert "Kurgusal Bekleyen" not in summary_text
    assert "05551234567" not in summary_text
    assert summary.json()["bekleme_ozeti"] == {
        "toplam": 1,
        "bekliyor": 0,
        "iletisime_gecildi": 1,
    }

    # Sahip silebilir.
    login(client, 0)
    deleted = client.delete(
        f"/api/uzman/bekleme-listesi/{entry_id}",
        headers={"Content-Type": "application/json"},
    )
    assert deleted.status_code == 204
    assert client.get("/api/uzman/bekleme-listesi").json() == []


def test_alinan_tavsiyeler_engellenenleri_gizler_ve_onaysizi_saklar(env):
    client, factory, ids, _ = env
    with factory() as db:
        db.get(Uzman, ids[0]).uzmanliklar = ["Kaygı"]
        db.add(
            Tavsiye(
                veren_id=ids[1],
                alan_id=ids[0],
                uzmanlik="Kaygı",
                olusturma=int(time.time()),
            )
        )
        db.commit()

    resp = client.get(f"/api/uzmanlar/{ids[0]}/alinan-tavsiyeler")
    assert resp.status_code == 200
    assert resp.json()["toplam"] == 1
    assert resp.json()["oneriler"][0]["id"] == ids[1]

    # Engellenen meslektasin tavsiyesi gizlenir.
    with factory() as db:
        db.add(
            UzmanEngeli(
                engelleyen_uzman_id=ids[0],
                engellenen_uzman_id=ids[1],
                olusturma=int(time.time()),
            )
        )
        db.commit()

    after_block = client.get(f"/api/uzmanlar/{ids[0]}/alinan-tavsiyeler")
    assert after_block.status_code == 200
    assert after_block.json()["toplam"] == 0

    # Tavsiyeler kapatildiginda bos doner.
    with factory() as db:
        db.get(Uzman, ids[0]).tavsiyeleri_goster = False
        db.commit()
    hidden = client.get(f"/api/uzmanlar/{ids[0]}/alinan-tavsiyeler")
    assert hidden.status_code == 200
    assert hidden.json() == {"toplam": 0, "oneriler": []}


def test_ozel_tema_white_label_yetkisi_ve_css_olusturma(env):
    client, _, ids, _ = env
    login(client, 0)

    # Standart uzman hazir paletleri, tasarim tarzini ve fontlari kullanabilir.
    preset_ok = client.put(
        "/api/uzman/tema",
        json={
            "bekleme_listesi_acik": True,
            "tasarim_tarzi": "editoryal_serif",
            "tema_stili": "lavanta",
            "vurgu_rengi": "#6d28d9",
            "buton_stili": "cerceveli",
            "yazi_tipi": "editoryal_serif",
            "yuzey_stili": "krem",
            "terapistco_markasi_gizli": False,
        },
    )
    assert preset_ok.status_code == 200
    assert preset_ok.json()["tasarim_tarzi"] == "editoryal_serif"
    assert preset_ok.json()["tema_stili"] == "lavanta"
    assert preset_ok.json()["buton_stili"] == "cerceveli"
    assert preset_ok.json()["yazi_tipi"] == "editoryal_serif"
    assert preset_ok.json()["yuzey_stili"] == "krem"

    # Yetkisiz white-label / ozel hex girisi reddedilir.
    denied = client.put(
        "/api/uzman/tema",
        json={
            "bekleme_listesi_acik": True,
            "tema_stili": "ozel",
            "vurgu_rengi": "#123456",
            "buton_stili": "yastik",
            "terapistco_markasi_gizli": True,
        },
    )
    assert denied.status_code == 403

    # Yonetici yetki tanimlar.
    login(client, 2)
    grant = client.patch(
        f"/api/yonetim/uzmanlar/{ids[0]}/tema-yetkisi",
        json={"ozel_tema_yetkisi": True},
    )
    assert grant.status_code == 200, grant.text
    assert grant.json()["premium_etkin"] is True

    # Simdi uzman ozel hex, yumusak cam stili ve white-label kaydedebilir.
    login(client, 0)
    custom = client.put(
        "/api/uzman/tema",
        json={
            "bekleme_listesi_acik": False,
            "tasarim_tarzi": "yumusak_cam",
            "tema_stili": "ozel",
            "vurgu_rengi": "#123456",
            "buton_stili": "yastik",
            "yazi_tipi": "geometrik_net",
            "yuzey_stili": "buzlu",
            "terapistco_markasi_gizli": True,
        },
    )
    assert custom.status_code == 200, custom.text
    assert custom.json()["marka_gizleme_etkin"] is True
    assert custom.json()["tasarim_tarzi"] == "yumusak_cam"
    assert custom.json()["yazi_tipi"] == "geometrik_net"
    assert custom.json()["yuzey_stili"] == "buzlu"

    css_res = client.get(f"/api/uzmanlar/{ids[0]}/tema.css")
    assert css_res.status_code == 200
    assert "text/css" in css_res.headers["content-type"]
    assert f'.bento-profile[data-profile-id="{ids[0]}"]' in css_res.text
    assert "--bp-primary: #123456;" in css_res.text
    assert "--bp-btn-radius: 999px;" in css_res.text
    assert "--bp-font-heading:" in css_res.text
    assert "--bp-bg-soft:" in css_res.text

    # Acik kaynak / Unsplash arka plan gorseli eklenir, okunur ve temizlenir.
    unsplash_url = (
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
        "?auto=format&fit=crop&w=1600&q=80"
    )
    with_bg = client.put(
        "/api/uzman/tema",
        json={
            "bekleme_listesi_acik": False,
            "tasarim_tarzi": "yumusak_cam",
            "tema_stili": "ozel",
            "vurgu_rengi": "#123456",
            "buton_stili": "yastik",
            "yazi_tipi": "geometrik_net",
            "yuzey_stili": "buzlu",
            "arka_plan_gorseli_url": unsplash_url,
            "terapistco_markasi_gizli": True,
        },
    )
    assert with_bg.status_code == 200, with_bg.text
    assert with_bg.json()["arka_plan_gorseli_url"] == unsplash_url

    public_theme = client.get(f"/api/uzmanlar/{ids[0]}/tema")
    assert public_theme.status_code == 200
    assert public_theme.json()["arka_plan_gorseli_url"] == unsplash_url

    # Guvensiz (http:// veya javascript:) arka plan gorseli reddedilir.
    bad_bg = client.put(
        "/api/uzman/tema",
        json={
            "bekleme_listesi_acik": False,
            "tasarim_tarzi": "yumusak_cam",
            "tema_stili": "ozel",
            "vurgu_rengi": "#123456",
            "buton_stili": "yastik",
            "yazi_tipi": "geometrik_net",
            "yuzey_stili": "buzlu",
            "arka_plan_gorseli_url": "http://images.unsplash.com/photo-1",
            "terapistco_markasi_gizli": True,
        },
    )
    assert bad_bg.status_code == 422

    # Arka plan gorseli bos birakilarak zemin rengine donulebilir.
    cleared = client.put(
        "/api/uzman/tema",
        json={
            "bekleme_listesi_acik": False,
            "tasarim_tarzi": "yumusak_cam",
            "tema_stili": "ozel",
            "vurgu_rengi": "#123456",
            "buton_stili": "yastik",
            "yazi_tipi": "geometrik_net",
            "yuzey_stili": "buzlu",
            "arka_plan_gorseli_url": "",
            "terapistco_markasi_gizli": True,
        },
    )
    assert cleared.status_code == 200
    assert cleared.json()["arka_plan_gorseli_url"] == ""


def test_analitik_baglanti_performansi_to_ve_yeni_etkilesimler(env):
    client, _, ids, _ = env
    login(client, 0)
    res = _kaynak_ekle(
        client,
        baslik="Grup Terapisi Basvuru",
        url="https://example.com/grup",
        vurgulu=True,
    ).json()
    res_id = res["id"]

    client.cookies.clear()
    assert (
        client.get(
            f"/api/kaynaklar/{res_id}/ac",
            follow_redirects=False,
        ).status_code
        == 302
    )

    events = [
        {
            "olay_turu": "profile_view",
            "sayfa_yolu": "/ornek-uzman-0",
            "uzman_id": ids[0],
            "ziyaret_anahtari": "visit-123456",
        },
        {
            "olay_turu": "resource_click",
            "sayfa_yolu": "/ornek-uzman-0",
            "uzman_id": ids[0],
            "hedef_kaynak_id": res_id,
            "ziyaret_anahtari": "visit-123456",
        },
        {
            "olay_turu": "embed_play",
            "sayfa_yolu": "/ornek-uzman-0",
            "uzman_id": ids[0],
            "hedef_kaynak_id": res_id,
            "ziyaret_anahtari": "visit-123456",
        },
        {
            "olay_turu": "qr_scan",
            "sayfa_yolu": "/ornek-uzman-0",
            "uzman_id": ids[0],
            "ziyaret_anahtari": "visit-123456",
        },
        {
            "olay_turu": "waitlist_submitted",
            "sayfa_yolu": "/ornek-uzman-0",
            "uzman_id": ids[0],
            "ziyaret_anahtari": "visit-123456",
        },
    ]
    for ev in events:
        r = client.post("/api/analitik/olcum", json=ev)
        assert r.status_code == 204, r.text

    login(client, 0)
    report = client.get("/api/uzman/trafik-analitigi?gun=30")
    assert report.status_code == 200, report.text
    data = report.json()
    assert data["profil_etkilesimleri"]["medya_oynatma"] == 1
    assert data["profil_etkilesimleri"]["qr_ziyaret"] == 1
    assert data["profil_etkilesimleri"]["bekleme_listesi_basvurusu"] == 1
    perf = data["baglanti_performansi"]
    assert len(perf) == 1
    assert perf[0]["id"] == res_id
    assert perf[0]["tiklama_sayisi"] == 1
    assert perf[0]["tiklama_payi_yuzde"] == 100.0
    assert perf[0]["to_orani_yuzde"] == 100.0
