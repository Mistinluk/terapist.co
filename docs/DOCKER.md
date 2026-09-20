# Docker ile çalışma

Docker Desktop çalışırken proje kökünde `make baslat` komutunu kullanın.
WSL Ubuntu için Docker Desktop'ın **Settings → Resources → WSL Integration**
ayarındaki Ubuntu seçeneği açık olmalıdır.

| İşlem | Komut |
| --- | --- |
| Başlat veya yeni kodla yeniden oluştur | `make baslat` |
| Servisleri kontrol et | `make durum` |
| Kayıtları koruyarak durdur | `make durdur` |
| Boş veritabanına kurgusal uzmanlar ekle | `make docker-ornek` |
| Yönetici oluştur | `make docker-yonetici EPOSTA=adres@example.com` |

Uygulama adresi **http://localhost:8080**. `http://127.0.0.1:8080` adresi de
yerel geliştirme modunda desteklenir. Randevu talebi anonimdir; danışanın
hesap açması veya MFA kodu girmesi gerekmez.

## Ortam

Arayüz Nginx üzerinden sunulur. `/api` istekleri aynı Docker ağındaki FastAPI
servisine gider. PostgreSQL 17 ve Redis 7 yalnızca bu özel ağdan erişilir;
bilgisayara veritabanı portu açılmaz. Dışarıya yalnızca yerel `8080` portu açılır.

`make baslat`, yoksa `backend/.env` dosyasını Docker içindeki Python ile
oluşturur. Mevcut anahtarlar değişmez. Compose, API için `VERITABANI_URL`
değerini PostgreSQL adresiyle, `UYGULAMA_ADRESI` değerini `http://localhost:8080`
ile belirler. Eski yerel `.env` içinde SQLite yazması Docker'ın SQLite
kullandığı anlamına gelmez; Compose ortam değerleri önceliklidir.

`/api/hazir` gerçek veritabanı sorgusu yapar. Veritabanı erişilemezse veya uzman
tablosu yoksa `503` döner; bağlantı adreslerini ve kayıt içeriklerini açıklamaz.
Docker'ın API ve arayüz sağlık kontrolleri bu uç noktayı kullanır.

Yerel geliştirmede `localhost` ve `127.0.0.1`, yalnızca yapılandırılmış adresin
aynı protokol ve portunda kabul edilir. Üretimde tek ve tam eşleşen kaynak
zorunludur; oturum ve CSRF kontrolleri her iki modda korunur.

Veriler `terapist-docker_veriler` birimindedir. `make durdur` bu birimi silmez.
`.env` içindeki şifreleme anahtarının kaybolması şifreli kayıtların okunmasını
engeller; veritabanı yedeğiyle birlikte bu dosyayı da güvenle saklayın.

Bu Compose ortamı yerel geliştirme içindir. Üretim gereklilikleri
[işletim rehberinde](ISLETIM.md) açıklanır.
