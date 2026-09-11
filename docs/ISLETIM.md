# Kurulum, işletim ve üretim sınırları

Bu belge uygulamayı işletmek için gereken kararları açıklar. Yerel Compose
ayarları gerçek veriyle kullanılacak üretim konfigürasyonu değildir.

## Hedef mimari

```text
Tarayıcı — HTTPS → güvenilir giriş katmanı / Nginx
                         ├─ derlenmiş React dosyaları
                         └─ /api → FastAPI → PostgreSQL
                                         └→ Redis
```

React ve API aynı kökenden sunulur. CORS için tüm kaynaklara izin verilmez.
Özel API/DB/Redis portları internetten erişilemez. Gerçek sırlar Docker imajına
ve Git'e kopyalanmaz; imajlar yalnızca ilgili kaynak dizinlerinden derlenir.

## Üretim ayarları

`backend/.env.production.example` alanlarını gerçek sır yönetim sisteminde
tanımlayın. `ORTAM=uretim`; HTTPS uygulama adresi, tam Host listesi, PostgreSQL,
Redis, benzersiz şifreleme anahtarı, bağımsız hız sınırı anahtarı ve onaylı
aydınlatma metni zorunludur. MFA'sız hesaplar üretimde giriş yapamaz.

`VERITABANI_URL` ve `REDIS_URL` hassastır. Uzak bağlantılarda sertifika doğrulamalı
TLS kullanın. Veritabanı uygulama rolü süper kullanıcı, şema sahibi veya migration
rolü olmamalıdır. Migration için ayrı, geçici yetkili bir kullanıcı kullanın.
Uygulama rolüne `denetim` için yalnızca INSERT/SELECT; gerekli diğer uygulama
tablolarına gerekli CRUD yetkilerini verin. DB erişimi yalnızca API ağına açılmalıdır.

Dağıtımda sıralama: yedek → tek migration işi (`alembic upgrade head`) → API →
arayüz → sentetik uçtan uca kontrol. Migration her HTTP isteğinde veya her worker
açılışında otomatik çalıştırılmaz. Docker imajlarındaki süreçler root olarak çalışmaz.

## Proxy ve hız sınırı

Hazır Docker komutu `--no-proxy-headers` kullanır: istemci IP başlıkları körü
körüne kabul edilmez. Yerel Docker'da IP bazlı limit tüm proxy trafiğini aynı
istemci olarak sayabilir. Üretimde güvenilir giriş katmanının IP/ağını açıkça
belirleyerek Uvicorn `--proxy-headers --forwarded-allow-ips=...` ayarını yapın;
`*` kullanmayın. Nginx'in gerçek istemciyi yalnızca güvenilir üst proxy'den aldığı
doğrulanmalıdır. Gelen saldırgan `X-Forwarded-For` başlıkları temizlenmelidir.
Bu doğrulanmadan yatay ölçekli üretime geçilmemelidir.

Redis bütün worker'lar arasında ortak hız sayacı tutar. Redis erişilemiyorsa
sınırlanan işlemler 503 ile kapanır. Üretimde Redis kimlik doğrulaması, ağ izolasyonu,
bellek sınırı ve saldırı sırasında davranış testi gerekir. Genel DoS önlemleri,
bağlantı/zaman aşımları ve uç katman limitleri de kurulmalıdır.

## Anahtarlar ve yedekler

- Şifreleme anahtarı ile veritabanı yedeği aynı erişim alanında saklanmamalıdır.
- Disk, yedek ve bütün metaveriler ayrıca şifrelenmelidir. Fernet yalnızca seçilmiş
  alanları korur. Anahtarı kaybetmek bu alanları geri döndürülemez biçimde kaybettirir.
- Anahtar değişimi bu sürümde otomatik değildir. Bakım penceresinde yazmayı kapatın,
  geri yükleme provasını yapın, eski anahtarla çözerek yeni anahtarla bütün randevu
  ve MFA alanlarını yeniden şifreleyen denetlenmiş bir migration hazırlayın.
  Yeni anahtar yayılmadan yazmayı açmayın. Eski yedeklerin anahtar saklama gereğini
  ayrıca planlayın. Sadece `.env` anahtarını değiştirmeyin.
- Şifreli yedeklerin geri yüklenmesi düzenli test edilmelidir; RPO/RTO ve sorumlu
  kişi kuruluş tarafından belirlenmelidir.

## Denetim ve gözlem

Uygulama erişim günlüğü kapalıdır; sağlık ve iletişim bilgileri URL, hata yığını
ve JSON loglarına eklenmez. Denetim tablosunda zaman, işlem ve rastgele kimlikler
tutulur. Bu kimlikler yeniden ilişkilendirilebildiğinden yine korunmalıdır.

Tablo, ayrı yetkilere sahip dış bir değiştirilemez kayıt deposuna aktarılmalıdır.
Bu dış aktarım, SIEM, alarm kuralı ve olay müdahale otomasyonu bu sürümde yoktur.
Sistem hataları için içeriksiz sayaçlar ve uyarılar kurun; hata gövdelerini,
parolaları, MFA sırlarını veya danışan adlarını gözlem araçlarına göndermeyin.

## Saklama, erişim ve imha

Bir uzmanı arşivlemek danışan kayıtlarını silmez. Aktif randevu varsa arşivleme
engellenir. İmha süresi otomatik seçilmedi; sağlık hizmeti, mesleki yükümlülük ve
somut hukuki dayanağa göre kurum belirlemelidir. İlgili kişi erişim/düzeltme/silme
talebi kimlik doğrulama, yetki ve hukuki saklama incelemesinden geçmelidir.
Bu sürümde toplu dışa aktarma veya otomatik silme uç noktası bulunmaz.

Kullanıcı ayrıldığında yetkili operatör hesabı kapatmalı, oturumları iptal etmeli ve
devam eden randevuları kontrollü aktarmalıdır. Oturum tablosundaki süresi dolmuş
kayıtlar erişime kapalıdır; düzenli bakımda temizlenmesi gerekir. Kayıt silme
işlerini gerçek veriler üzerinde otomatik başlatan bir görev bu projede kurulmadı.

## Bakım

Bağımlılıkları kilit dosyalarıyla yükleyin, güncellemeleri ayrı dalda sınayın.
`pip-audit` ve `pnpm audit` düzenli çalıştırılmalı; konteyner taban imajları ayrıca
taranıp sürüm/digest bazında sabitlenmelidir. Taramanın temiz çıkması uygulamanın
bütün saldırılara karşı güvenli olduğunu göstermez. Dış sızma testi ve işletim
kontrolleri gerçek veriyle açılıştan önce tamamlanmalıdır.
