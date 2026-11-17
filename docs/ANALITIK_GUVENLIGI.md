# Analitik ölçümünde özel bağlantıların korunması

`/davet/{token}` ve `/r/{token}` adreslerindeki değerler gizlidir. Bu
adresler, `/panel` ve `/yonetim` ile birlikte site içi trafik ölçümünün
dışındadır. Kontrol hem tarayıcıda hem API'de uygulanır.

## Veri akışı

1. `frontend/src/lib/analytics.ts` yolu çözümler. Yüzde kodlaması ve nokta
   parçaları denetimden kaçış sağlamaz. Mutlak adresler, bozuk veya çoklu
   kodlamalar ölçülmez. Sorgu ve fragment kaldırılır.
2. Geçerli bir sayfa için ölçüm ayarları alınır. Bu sırada kullanıcı başka
   sayfaya geçtiyse bekleyen olay iptal edilir. Ayarlar alınamazsa ölçüm
   yapılmaz.
3. Referans adresinin yalnızca kökeni tutulur; örneğin
   `https://example.com/path?secret=123` → `https://example.com`.
   Özel yol içeren referanslar tamamen atılır. Eski sessionStorage kayıtları
   okunurken de temizlenip yeniden yazılır.
4. Olay yalnızca aynı kaynakta bulunan `/api/analitik/olcum` adresine gider.
   API, `app.analytics_service.olcum_yolu` ile yolu yeniden doğrular.
   Özel/geçersiz olaylarda kayıt oluşturmadan 204 döner.
5. `strict-origin` referrer politikası, aynı kaynak isteklerinde de tam
   sayfa yolunun Referer başlığına taşınmasını önler. Nginx, API'nin
   oluşturduğu HTML ve Vite giriş HTML'i aynı politikayı kullanır.

Bu kurallar genel bir kişisel veri temizleyicisi değildir. Yeni olay
alanlarına danışan bilgisi veya gizli değerler eklenmemelidir.

## Google Analytics davranışı

Tarayıcıda `gtag.js` yüklenmez ve GA4 olayı gönderilmez. Ölçüm kimliği
kaydetmek bu davranışı değiştirmez. Üretim CSP'sindeki Google etiket ve
bağlantı izinleri de kaldırılmıştır. Site içi trafik raporları çalışmaya
devam eder. Sunucudaki Google hesabı/hizmet hesabı bağlantısı mevcut GA4
raporlarını okumak için korunur; yeni site içi olaylar GA4'e aktarılmaz.

Yalnızca `send_page_view: false` yeterli değildir: Google'ın gelişmiş
ölçümü tarayıcı geçmişi değişince bağımsız olay gönderebilir.
[Google'ın sayfa görüntüleme belgesi](https://developers.google.com/analytics/devguides/collection/ga4/views)
bu ayrımı açıklar. GA toplaması tekrar eklenirse otomatik olaylar, gizli
rotalar ve üçüncü taraflara gönderilen tüm alanlar birlikte değerlendirilmelidir.

## Doğrulama

Proje kökünden, Ubuntu terminalinde:

```bash
pnpm --dir frontend test
pnpm --dir frontend build
cd backend
.venv/bin/python -m pytest tests/test_analytics.py -q
```

Frontend testleri gerçek ağa çıkmadan `fetch`, konum ve sessionStorage'ı
taklit eder. Özel/şifrelenmiş yolları, yön değiştiren bekleyen istekleri,
bozuk/eski önbelleği ve GA kimliği bulunsa da etiket yüklenmemesini sınar.
Backend testleri doğrudan POST göndererek veritabanında kayıt oluşmadığını
ve açık sayfa ölçümünün çalışmaya devam ettiğini doğrular.

## Yayına alma

Frontend derlemesini ve API'yi birlikte güncelleyin; Docker kullanılıyorsa
imajları yeniden oluşturun. Daha önce açılmış sekmeler eski JavaScript'i
çalıştırabileceğinden tam sayfa yenilemesi gerekir. Bu değişiklik geçmişte
kaydedilmiş ölçümleri silmez. Gerçek davet tokenlarının daha önce ölçümlere
girdiği tespit edilirse ilgili kullanılmamış davetleri iptal edip yenileyin;
geçmiş kayıtları ayrıca inceleyin. Mevcut veritabanı bu düzeltmede silinmez.
