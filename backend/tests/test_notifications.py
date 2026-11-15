"""Birleşik site içi bildirim sistemi ve sistem hatırlatmaları testleri."""

import time

from app.models import Bildirim, Randevu
from tests.conftest import login


def test_yeni_randevu_ve_sistem_hatirlatmalari(env):
    client, factory, ids, booking_id = env
    now = int(time.time())

    # Onaylı yaklaşan randevu (3 saat) + geciken talep (30 saat)
    with factory() as db:
        waiting = db.get(Randevu, booking_id)
        waiting.olusturma = now - 30 * 3600
        upcoming = Randevu(
            uzman_id=ids[0],
            baslangic=now + 3 * 3600,
            danisan_sifreli=waiting.danisan_sifreli,
            durum="onaylandi",
            olusturma=now - 3600,
            aydinlatma_surumu=waiting.aydinlatma_surumu,
        )
        db.add(upcoming)
        db.commit()
        upcoming_id = upcoming.id

    # Terapist: yaklaşan randevu ve geciken talep hatırlatmaları
    login(client, 0)
    resp = client.get("/api/bildirimler")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["okunmamis_sayisi"] == 2
    titles = {item["baslik"] for item in payload["kayitlar"]}
    assert "Yaklaşan randevu hatırlatması" in titles
    assert "Yanıt bekleyen randevu" in titles
    assert all(
        item["hedef_yol"] == "/panel?sekme=randevular"
        for item in payload["kayitlar"]
    )

    # İkinci çağrı aynı sistem hatırlatmalarını çoğaltmaz
    resp2 = client.get("/api/bildirimler")
    assert resp2.status_code == 200
    assert resp2.json()["okunmamis_sayisi"] == 2

    # Tekil ve toplu okundu işaretleme
    first_id = payload["kayitlar"][0]["id"]
    json_hdr = {"Content-Type": "application/json"}
    assert (
        client.patch(
            f"/api/bildirimler/{first_id}/okundu", headers=json_hdr
        ).status_code
        == 204
    )
    assert client.get("/api/bildirimler").json()["okunmamis_sayisi"] == 1
    assert (
        client.post(
            "/api/bildirimler/tumunu-okundu", headers=json_hdr
        ).status_code
        == 204
    )
    assert client.get("/api/bildirimler").json()["okunmamis_sayisi"] == 0

    # Yönetici bildirimleri: geciken talep uyarısı görünür (KVKK güvenli)
    login(client, 2)
    admin_resp = client.get("/api/bildirimler")
    assert admin_resp.status_code == 200
    admin_data = admin_resp.json()
    assert admin_data["okunmamis_sayisi"] >= 1
    assert any(
        item["baslik"] == "Yanıtsız randevu uyarısı"
        for item in admin_data["kayitlar"]
    )
    assert "Kurgusal" not in admin_resp.text
    assert upcoming_id


def test_yonetim_mesaj_ve_hatirlatma_gonderimi(env):
    client, factory, ids, _ = env
    json_hdr = {"Content-Type": "application/json"}

    # Terapist yönetici uçlarını çağıramaz
    login(client, 0)
    forbidden = client.post(
        "/api/yonetim/bildirimler",
        json={
            "hedef_uzman_id": ids[0],
            "tur": "admin_notu",
            "baslik": "Yetkisiz",
            "mesaj": "Bu istek engellenmelidir.",
        },
        headers=json_hdr,
    )
    assert forbidden.status_code == 403

    # Yönetici tek terapiste randevu hatırlatması gönderir
    login(client, 2)
    targets = client.get("/api/yonetim/bildirim-hedefleri")
    assert targets.status_code == 200
    assert len(targets.json()) >= 2

    single = client.post(
        "/api/yonetim/bildirimler",
        json={
            "hedef_uzman_id": ids[0],
            "tur": "randevu_hatirlatma",
            "baslik": "Takvim kontrolü",
            "mesaj": "Yarınki randevunuz için takviminizi kontrol edin.",
        },
        headers=json_hdr,
    )
    assert single.status_code == 201, single.text
    assert single.json()["gonderilen"] == 1

    # Yönetici tüm terapistlere duyuru / not gönderir
    broadcast = client.post(
        "/api/yonetim/bildirimler",
        json={
            "hedef_uzman_id": "tumu",
            "tur": "admin_notu",
            "baslik": "Sistem duyurusu",
            "mesaj": "Haftalık çalışma saatlerinizi güncel tutunuz.",
        },
        headers=json_hdr,
    )
    assert broadcast.status_code == 201, broadcast.text
    assert broadcast.json()["gonderilen"] >= 2

    # İkinci terapist de toplu duyuruyu alır
    login(client, 1)
    u1_notifs = client.get("/api/bildirimler").json()
    assert any(
        item["baslik"] == "Sistem duyurusu"
        and item["gonderen_ad"] == "Yönetim Ekibi"
        and item["gonderen_rol"] == "yonetici"
        for item in u1_notifs["kayitlar"]
    )
    with factory() as db:
        total = db.query(Bildirim).count()
        assert total >= 3


def test_kullanicilar_arasi_ve_yonetici_mesajlasma_protokolu(env):
    client, _, ids, _ = env
    json_hdr = {"Content-Type": "application/json"}

    # 1. Terapist 0 kişileri listeler (Yönetim Ekibi + diğer aktif terapist)
    login(client, 0)
    contacts_resp = client.get("/api/mesajlar/kisiler")
    assert contacts_resp.status_code == 200
    contacts = contacts_resp.json()
    assert any(c["id"] == "yonetim" for c in contacts)
    peer_contact = next(c for c in contacts if c["uzman_id"] == ids[1])

    # 2. Terapist 0 -> Terapist 1'e yeni mesaj gönderir
    create_resp = client.post(
        "/api/mesajlar/konular",
        json={
            "alici_id": peer_contact["id"],
            "baslik": "Vaka konsültasyonu",
            "mesaj": (
                "Merhaba meslektaşım, uygun olduğunuzda görüşebilir miyiz?"
            ),
        },
        headers=json_hdr,
    )
    assert create_resp.status_code == 201, create_resp.text
    thread_id = create_resp.json()["konu_id"]
    assert thread_id

    # 3. Terapist 1 bildirimlerde kimden geldiğini görür ve mesajı yanıtlar
    login(client, 1)
    notif_resp = client.get("/api/bildirimler")
    assert notif_resp.status_code == 200
    notif_items = notif_resp.json()["kayitlar"]
    msg_notif = next(n for n in notif_items if n["konu_id"] == thread_id)
    assert msg_notif["gonderen_rol"] == "uzman"
    assert msg_notif["gonderen_ad"] != "Sistem"
    assert msg_notif["okundu"] is False

    threads_resp = client.get("/api/mesajlar/konular")
    assert threads_resp.status_code == 200
    threads_data = threads_resp.json()
    assert threads_data["toplam_okunmamis"] >= 1
    assert any(k["id"] == thread_id for k in threads_data["konular"])

    detail_resp = client.get(f"/api/mesajlar/konular/{thread_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["baslik"] == "Vaka konsültasyonu"
    assert len(detail["mesajlar"]) == 1
    assert detail["mesajlar"][0]["benden_mi"] is False

    # Konu açılınca okunmamış sayısı düşer ve bağlı bildirim okundu olur
    after_threads = client.get("/api/mesajlar/konular").json()
    opened_summary = next(
        k for k in after_threads["konular"] if k["id"] == thread_id
    )
    assert opened_summary["okunmamis_sayisi"] == 0

    reply_resp = client.post(
        f"/api/mesajlar/konular/{thread_id}/yanit",
        json={"mesaj": "Tabii, yarın öğleden sonra uygunum."},
        headers=json_hdr,
    )
    assert reply_resp.status_code == 201, reply_resp.text
    assert reply_resp.json()["benden_mi"] is True

    # 4. Yönetici -> Terapist 0'a mesaj gönderir, Terapist 0 yanıt verir
    login(client, 2)
    admin_send = client.post(
        "/api/yonetim/bildirimler",
        json={
            "hedef_uzman_id": ids[0],
            "tur": "admin_notu",
            "baslik": "Profil doğrulama bilgisi",
            "mesaj": (
                "Belgeniz incelendi, ek sorunuz varsa buradan yazabilirsiniz."
            ),
        },
        headers=json_hdr,
    )
    assert admin_send.status_code == 201

    login(client, 0)
    t0_threads = client.get("/api/mesajlar/konular").json()["konular"]
    admin_thread = next(
        k for k in t0_threads if k["baslik"] == "Profil doğrulama bilgisi"
    )
    assert admin_thread["karsi_taraf"]["ad"] == "Yönetim Ekibi"

    t0_reply = client.post(
        f"/api/mesajlar/konular/{admin_thread['id']}/yanit",
        json={"mesaj": "Teşekkürler, bilgi için sağ olun."},
        headers=json_hdr,
    )
    assert t0_reply.status_code == 201

    # Yönetici terapistin yanıtını ve bildirimini görür
    login(client, 2)
    admin_notifs = client.get("/api/bildirimler").json()["kayitlar"]
    assert any(
        n["konu_id"] == admin_thread["id"] and n["gonderen_rol"] == "uzman"
        for n in admin_notifs
    )
    admin_thread_detail = client.get(
        f"/api/mesajlar/konular/{admin_thread['id']}"
    ).json()
    assert len(admin_thread_detail["mesajlar"]) == 2
    assert (
        admin_thread_detail["mesajlar"][1]["icerik"]
        == "Teşekkürler, bilgi için sağ olun."
    )


def test_baglanti_ve_profil_onay_bildirimleri(env):
    client, _, ids, _ = env
    json_hdr = {"Content-Type": "application/json"}

    # 1. Terapist 0 -> Terapist 1'e mesleki bağlantı isteği gönderir
    login(client, 0)
    req_resp = client.post(
        f"/api/uzmanlar/{ids[1]}/baglanti",
        json={"iliski_turu": "colleague"},
        headers=json_hdr,
    )
    assert req_resp.status_code == 201, req_resp.text
    conn_id = req_resp.json()["id"]

    # 2. Terapist 1 bağlantı isteği bildirimini görür ve kabul eder
    login(client, 1)
    t1_notifs = client.get("/api/bildirimler").json()["kayitlar"]
    assert any(
        n["baslik"] == "Yeni mesleki bağlantı isteği"
        and n["hedef_yol"] == "/panel?sekme=baglantilar"
        for n in t1_notifs
    )
    accept_resp = client.patch(
        f"/api/uzman/baglanti-istekleri/{conn_id}",
        json={"durum": "accepted"},
        headers=json_hdr,
    )
    assert accept_resp.status_code == 200, accept_resp.text

    # 3. Terapist 0 bağlantı kabul bildirimini görür
    login(client, 0)
    t0_notifs = client.get("/api/bildirimler").json()["kayitlar"]
    assert any(
        n["baslik"] == "Mesleki bağlantı isteğiniz kabul edildi"
        and n["hedef_yol"] == "/panel?sekme=baglantilar"
        for n in t0_notifs
    )

    # 4. Yönetici onayı kaldırdığında bildirim üretmez, tekrar onaylarsa üretir
    login(client, 2)
    assert (
        client.patch(
            f"/api/yonetim/uzmanlar/{ids[0]}",
            json={"onayli": False},
            headers=json_hdr,
        ).status_code
        == 204
    )
    assert (
        client.patch(
            f"/api/yonetim/uzmanlar/{ids[0]}",
            json={"onayli": True},
            headers=json_hdr,
        ).status_code
        == 204
    )
    login(client, 0)
    t0_after = client.get("/api/bildirimler").json()["kayitlar"]
    assert any(
        n["baslik"] == "Profiliniz onaylandı ve yayına alındı"
        for n in t0_after
    )
