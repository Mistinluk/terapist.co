"""Anonim randevu akışı ve veritabanı çakışma kısıtının testleri.

payload sabit tarihe bağlı kalmadan API'nin ilk müsait saatini seçer.
HTTP seviyesinde reddin yanında doğrudan SQL yazmasının da kısıtlandığı
sınanır; böylece yalnızca arayüz kontrolüne güvenilmez."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Randevu, Uzman
from tests.conftest import login


def payload(client, profile_id):
    """Geçerli boş saati API'den alıp yalnızca kurgusal iletişim
    bilgisi ekler.
    """
    slots = client.get(f"/api/uzmanlar/{profile_id}/saatler").json()["saatler"]
    return {
        "uzman_id": profile_id,
        "baslangic": slots[0],
        "ad": "Kurgusal Başvuru",
        "telefon": "05000000000",
        "aydinlatma_okundu": True,
        "aydinlatma_surumu": "taslak-1",
    }


def test_randevu_olustur_ve_cakisma(env):
    """İlk talep saati kapatır; aynı saatin ikinci talebi 409
    almalıdır.
    """
    client, _, ids, _ = env
    body = payload(client, ids[0])
    assert client.post("/api/randevular", json=body).status_code == 201
    assert client.post("/api/randevular", json=body).status_code == 409
    assert (
        body["baslangic"]
        not in client.get(f"/api/uzmanlar/{ids[0]}/saatler").json()["saatler"]
    )


def test_veritabani_cakismayi_dogrudan_engeller(env):
    """API atlanarak yazılsa bile aktif saat benzersizliği
    bozulmamalıdır.
    """
    _, factory, ids, _ = env
    with factory() as db:
        existing = db.scalar(select(Randevu))
        db.add(
            Randevu(
                uzman_id=ids[0],
                baslangic=existing.baslangic,
                danisan_sifreli=existing.danisan_sifreli,
                olusturma=existing.olusturma,
                aydinlatma_surumu="taslak-1",
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()


def test_iptal_saati_serbest_birakir(env):
    """İptal kaydı silinmeden aynı saat için yeni talep
    alınabilmelidir.
    """
    client, factory, ids, _ = env
    body = payload(client, ids[0])
    client.post("/api/randevular", json=body)
    login(client)
    with factory() as db:
        booking = db.scalar(
            select(Randevu).where(
                Randevu.baslangic
                == int(datetime.fromisoformat(body["baslangic"]).timestamp())
            )
        )
        booking_id = booking.id
    assert (
        client.patch(
            f"/api/uzman/randevular/{booking_id}", json={"durum": "iptal"}
        ).status_code
        == 204
    )
    assert client.post("/api/randevular", json=body).status_code == 201


@pytest.mark.parametrize("change", ["gecmis", "saat_dilimsiz", "kapali_saat"])
def test_gecersiz_randevu_saati(env, change):
    """Geçmiş, saat dilimsiz veya program dışı zaman rezervasyon
    yaratmamalıdır.
    """
    client, _, ids, _ = env
    body = payload(client, ids[0])
    if change == "gecmis":
        body["baslangic"] = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    elif change == "saat_dilimsiz":
        body["baslangic"] = body["baslangic"][:19]
    else:
        body["baslangic"] = body["baslangic"][:11] + "03:00:00+03:00"
    assert client.post("/api/randevular", json=body).status_code in (409, 422)


def test_onaysiz_profil_ve_eski_aydinlatma(env):
    """Eski metin sürümü reddedilir; onaysız profil görülemez ve
    rezerve edilemez.
    """
    client, factory, ids, _ = env
    body = payload(client, ids[0])
    body["aydinlatma_surumu"] = "eski"
    assert client.post("/api/randevular", json=body).status_code == 409
    body["aydinlatma_surumu"] = "taslak-1"
    with factory() as db:
        db.get(Uzman, ids[0]).onayli = False
        db.commit()
    assert client.get(f"/api/uzmanlar/{ids[0]}").status_code == 404
    assert client.post("/api/randevular", json=body).status_code == 404


def test_profil_ciktisi_parola_ve_email_icermez(env):
    """Açık dizin hesap bilgilerini sızdırmaz; şehir filtresi sonuçları
    sınırlar.
    """
    client, _, _, _ = env
    response = client.get("/api/uzmanlar")
    assert response.status_code == 200
    assert "email" not in response.text
    assert "parola" not in response.text
    assert "kullanici_id" not in response.text
    assert client.get("/api/uzmanlar?sehir=Ankara").json()["toplam"] == 0


def test_yetki_alanlarini_profil_girdisi_kabul_etmez(env):
    """Çıktıdaki id/onay alanlarını geri yollamak yetki değişimine
    dönüşmemelidir.
    """
    client, _, _, _ = env
    login(client)
    profile = client.get("/api/uzman/profil").json()
    response = client.put("/api/uzman/profil", json=profile)
    assert response.status_code == 422


@pytest.mark.parametrize("durum", ["bekliyor", "onaylandi"])
def test_yonetici_dolan_saate_eski_randevuyu_acamaz(env, durum):
    """İptal sonrası dolan saati geri açmak 500 değil, 409 döndürmelidir.

    Eski talep iptal olarak kalır; yeni danışanın talebi değişmez. Takvim
    kuyruğunun sorguları da otomatik SQL yazması yapabildiği için çatışma
    bütün durum güncellemesi boyunca ele alınmalıdır.
    """
    client, factory, ids, _ = env
    body = payload(client, ids[0])
    created = client.post("/api/randevular", json=body)
    assert created.status_code == 201
    cancelled_id = created.json()["randevu_id"]
    login(client, 2)
    path = f"/api/yonetim/randevular/{cancelled_id}/durum"
    assert client.patch(path, json={"durum": "iptal"}).status_code == 200
    replacement = client.post("/api/randevular", json=body)
    assert replacement.status_code == 201
    replacement_id = replacement.json()["randevu_id"]

    result = client.patch(path, json={"durum": durum})
    assert result.status_code == 409, result.text
    with factory() as db:
        assert db.get(Randevu, cancelled_id).durum == "iptal"
        assert db.get(Randevu, replacement_id).durum == "bekliyor"

    # Yeni talep de iptal edilirse eski kaydı açmak yeniden mümkün olur.
    replacement_path = f"/api/yonetim/randevular/{replacement_id}/durum"
    assert (
        client.patch(replacement_path, json={"durum": "iptal"}).status_code
        == 200
    )
    assert client.patch(path, json={"durum": durum}).status_code == 200
    with factory() as db:
        assert db.get(Randevu, cancelled_id).durum == durum
        assert db.get(Randevu, replacement_id).durum == "iptal"
