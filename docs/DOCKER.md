# Docker ile çalışma

Docker Desktop çalışırken proje kökünde `make baslat` komutunu kullanın.
WSL Ubuntu için Docker Desktop'ın **Settings → Resources → WSL Integration**
ayarındaki Ubuntu seçeneği açık olmalıdır.

| İşlem | Komut |
| --- | --- |
| Başlat veya yeni kodla yeniden oluştur | `make baslat` |
| Servisleri kontrol et | `make durum` |
| Nginx, API, PostgreSQL, profil ve yüklemeyi doğrula | `make docker-kontrol` |
| Kayıtları koruyarak durdur | `make durdur` |
| Boş veritabanına kurgusal uzmanlar ekle | `make docker-ornek` |
| Yönetici oluştur | `make docker-yonetici EPOSTA=adres@example.com` |

Uygulama adresi **http://localhost:8080**. `http://127.0.0.1:8080` adresi de
yerel geliştirme modunda desteklenir. Randevu talebi anonimdir; danışanın
hesap açması veya MFA kodu girmesi gerekmez.

## Ortam

Arayüz Nginx üzerinden sunulur. `/api` istekleri aynı Docker ağındaki FastAPI
servisine gider. PostgreSQL 17, Docker ağında ve yalnızca bilgisayarın
`127.0.0.1:55432` adresinde erişilebilir. Redis 7 yalnızca Docker ağındadır.
Web arayüzü `127.0.0.1:8080` üzerinden açılır; bu portlar yerel ağa açılmaz.

Tarayıcı → Nginx (`8080`) → FastAPI (`8000`) → PostgreSQL akışı kullanılır.
React tarayıcıda çalışır; Nginx derlenmiş JavaScript/CSS dosyalarını sunar.
PyCharm bu düzende editördür. `ARAYUZ_SUNUMU=derleme`, geliştirme modunda
bile doğrudan açılan profil sayfalarının `/assets/app.js` ve `/assets/app.css`
istemesini sağlar. `make api` + `make arayuz` ile çalışırken varsayılan `vite`
değeri kullanılır. Üretim modu her zaman derlenmiş dosyaları seçer.

Profil fotoğrafları `terapist-docker_medya` biriminde saklanır. API'nin
`MEDYA_DIZINI=/app/uploads` dizini yazılabilirdir; kalan dosya sistemi salt
okunur kalır. İmaj, bu dizinin sahipliğini uygulamanın ayrıcalıksız kullanıcısına
verir. Birim konteyner yeniden oluşturulunca korunur. Yalnızca fotoğraf yükleme
uç noktası Nginx'te 13 MiB istek kabul eder; API görseli ayrıca 12 MiB ile
sınırlar. Diğer isteklerin 32 KiB sınırı değişmez.

`make baslat`, yoksa `backend/.env` dosyasını Docker içindeki Python ile
oluşturur. Mevcut anahtarlar değişmez. Compose, API için `VERITABANI_URL`
değerini PostgreSQL adresiyle, `UYGULAMA_ADRESI` değerini `http://localhost:8080`
ile belirler. `backend/.env` de PostgreSQL kullanır: doğrudan Ubuntu/PyCharm
bağlantısı `127.0.0.1:55432`, Docker içindeki bağlantı `postgres:5432` adresine
gider. İkisi aynı `terapist` veritabanıdır. `make api`, PostgreSQL konteynerini
otomatik başlatır ve ardından Python sunucusunu çalıştırır. Docker Desktop
bu geliştirme biçiminde de açık olmalıdır. SQLite yalnızca yalıtılmış otomatik
testlerde kullanılır.

`/api/hazir` gerçek veritabanı sorgusu yapar. Veritabanı erişilemezse veya uzman
tablosu yoksa `503` döner; bağlantı adreslerini ve kayıt içeriklerini açıklamaz.
Docker'ın API ve arayüz sağlık kontrolleri bu uç noktayı kullanır.

Yerel geliştirmede `localhost` ve `127.0.0.1`, yalnızca yapılandırılmış adresin
aynı protokol ve portunda kabul edilir. Üretimde tek ve tam eşleşen kaynak
zorunludur; oturum ve CSRF kontrolleri her iki modda korunur.

Veriler `terapist-docker_veriler` birimindedir. `make durdur` bu birimi silmez.
`.env` içindeki şifreleme anahtarının kaybolması şifreli kayıtların okunmasını
engeller; veritabanı yedeğiyle birlikte bu dosyayı da güvenle saklayın.

Repo yeniden klonlandığında `.env` Git'ten gelmez. Eski Docker veritabanı
birimini kullanacaksanız ona ait `.env` dosyasını önce `backend/.env` olarak
geri yükleyin. `make baslat`, mevcut veritabanı birimi varken `.env` yoksa
durur; eski kayıtları okuyamayacak yeni anahtarlar üretmez.

Bu Compose ortamı yerel geliştirme içindir. Üretim gereklilikleri
[işletim rehberinde](ISLETIM.md) açıklanır.
