# Railway geliştirme önizlemesi

Tek Railway projesinde `web`, `api`, `Postgres` ve `Redis` servisleri bulunur.
`web` ve `api` aynı GitHub deposunun `vibe-psych` dalını kullanır. Bilgisayarın
ve Docker Desktop'ın açık olması gerekmez; imajları Railway derler ve çalıştırır.

| Servis | Kök dizin | Port | Erişim |
| --- | --- | --- | --- |
| web | `/frontend` | 8080 | HTTPS genel alan adı |
| api | `/backend` | 8000 | Özel ağ |
| Postgres | Railway veritabanı | 5432 | Özel ağ |
| Redis | Railway veritabanı | 6379 | Özel ağ |

## API ayarları

- Başlatma komutu: `python scripts/railway_start.py`.
- Pre-deploy komutu: `python scripts/railway_release.py`.
- Sağlık yolu: `/api/hazir`; `PORT=8000`.
- Kalıcı veri birimi: `/app/uploads`; `MEDYA_DIZINI=/app/uploads`.
- `RAILWAY_RUN_UID=0`: yalnız başlangıçta birimin sahibi düzeltilir. Başlatma
  betiği Uvicorn'u UID/GID 10001 ile çalıştırır.
- `ORTAM=onizleme`, `ARAYUZ_SUNUMU=derleme`.
- `UYGULAMA_ADRESI`: web servisinin tam HTTPS adresi; sonunda `/` bulunmaz.
- `GUVENILIR_HOSTLAR`: web alan adı, API özel alan adı, `localhost`,
  `127.0.0.1` ve `healthcheck.railway.app` içeren JSON dizisi.
- `VERITABANI_URL`: özel PostgreSQL bağlantısı; uygulama sürücüsü için
  `postgresql+psycopg://` ile başlamalıdır.
- `REDIS_URL`: Redis servisindeki özel bağlantı değişkenine başvuru.
- `SIFRELEME_ANAHTARI`: Fernet anahtarı; `HIZ_SINIRI_ANAHTARI`: bağımsız,
  en az 32 karakter rastgele sır. Yalnız API Variables alanında tutulur.

Boş, kurgusal önizleme veritabanı için `SEED_DEMO=1` ilk dağıtımda 1006 profil
ekler. Bu hesaplarla giriş kapalıdır. Üretimde bu değişken kullanılmaz.
Kullanıcı kayıtları ve test hesapları sonradan ayrı yönetilir.

Sonraki dağıtımlarda aynı komut, eski demo üreticisinin eksik bıraktığı
`TerapistDogrulama` kayıtlarını tamamlar. Yalnız örnek e-posta VE kurgusal
biyografisi eşleşen, yayındaki ve doğrulama kaydı olmayan profiller seçilir.
Mevcut `pending/rejected` kararları, gerçek başvurular, parolalar ve randevular
değişmez. Bu işlem yalnız önizlemede `SEED_DEMO=1` ile çalışır.

## Yönetici hesabı

`api` servisinin Console ekranında, `/app` dizininden çalıştırın:

```bash
/app/.venv/bin/python -m app.cli yonetici --email adres@example.com
```

Parola iki kez etkileşimli sorulur; en az 14 karakterdir. Ardından gösterilen
gizli anahtarı Google Authenticator'a zaman tabanlı hesap olarak ekleyin.
Parola ve MFA anahtarı Git'e veya dağıtım günlüklerine yazılmamalıdır.
Giriş `/giris`, yönetim paneli `/yonetim` adresindedir. Mevcut hesabın
kurtarılması için `yonetici` yerine `kurtar` kullanılır. Console'un sistem
Python'u paketleri görmeyebilir; bu nedenle tam `.venv` yolu kullanılır.

## Web ayarları

- `PORT=8080`.
- `API_UPSTREAM=api.railway.internal:8000`; API servis adı farklıysa değişir.
- Sağlık yolu: `/healthz`.
- Genel alan adı yalnız web servisinde oluşturulur.

Nginx başlangıçta ortamdan yalnız API adresini ve DNS çözümleyicisini okur.
Nginx'in kendi `$host`, `$uri` değişkenleri korunur. DNS çalışma sırasında
yenilenir; API yeniden dağıtıldığında eski IP'ye bağlı kalınmaz. React `/api`
isteklerini aynı web alan adına gönderir; tarayıcı özel API adresini kullanmaz.

## Önizleme ve üretim farkı

Önizleme de HTTPS, Secure çerez, MFA, PostgreSQL, Redis ve açık Host listesi
ister. Arayüz kurgusal veri uyarısını gösterir. Gerçek danışan bilgisi girilmez.
`ORTAM=uretim` gerçek veri sorumlusu ve hazırlanmış aydınlatma metni olmadan
başlamaz. Google Takvim için ayrıca Google OAuth ayarları gerekir.

Fernet anahtarı dağıtımlar arasında değiştirilmez. Mevcut veritabanı taşınacaksa
aynı anahtar korunmalıdır; yeni bağımsız veritabanında yeni anahtar kullanılır.
Sırlar Git'e, React derlemesine veya dağıtım günlüklerine yazılmaz.

## Doğrulama

Web alan adında `/healthz` Nginx'i, `/api/saglik` API sürecini, `/api/hazir`
veritabanı ve şema erişimini kontrol eder. Ana sayfa, profil, randevu ve giriş
akışları ayrıca sınanır. İlk dağıtımdan sonra veri birimi ve veritabanı için
yedek planı belirlenir. IP sınırları bu sürümde özel proxy adresini paylaşır;
güvenilmeyen yönlendirme başlıkları kabul edilmez.
