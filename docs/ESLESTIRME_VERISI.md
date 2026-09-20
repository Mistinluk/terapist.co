# Kurgusal eşleştirme verisi

Proje kökünde WSL veya macOS terminalinden:

```bash
make docker-eslestirme
```

Komut Docker uygulamasını başlatır ve mevcut kayıtlara ek olarak 1.000
kurgusal uzman oluşturur. Aynı komut tekrar çalıştırıldığında mevcut
eşleştirme hesapları atlanır; profilleri, parolaları ve randevuları değiştirmez.
Üretim ortamında çalışmaz.

Veri seti 20 şehir ve beş unvan türü içerir: psikolog, klinik psikolog,
doktoralı psikolog, psikiyatri uzmanı ve psikiyatri öğretim üyesi. İsimler,
eğitimler, unvanlar ve biyografiler test verisidir; gerçek kişi ve yeterlilik
bilgisi değildir. Her biyografide kurgusal veri etiketi bulunur.

Filtreleme ve eşleştirme deneyleri için değişen alanlar:

- Şehir ve ilçe; çevrim içi, yüz yüze veya iki görüşme şekli birden.
- Çocuk, ergen, yetişkin, ileri yaş, çift ve aile danışan grupları.
- Kaygı, travma, yas, ilişki sorunları, uyku, tükenmişlik gibi odak alanları.
- BDT, ACT, EMDR, Şema Terapi ve diğer örnek yaklaşımlar.
- 800–5.000 TL örnek ücretler, farklı deneyim yılları.
- Hafta içi, hafta sonu ve akşam saatlerini kapsayan haftalık müsaitlik.

Bu veri setinde hasta kaydı, tanı, tedavi önerisi veya doğrulanmış
“doğru terapist” eşleştirme etiketi yoktur. Filtreleri ve algoritmanın
davranışını test etmeye yarar; klinik uygunluğu ölçen bir referans değildir.
Meslek türü şimdilik unvan ve biyografide yer alır; ayrı bir veritabanı
alanı değildir. Mevcut `rol=uzman` değeri erişim yetkisini belirtir.

## Test hesapları

İlk beş hesap girişe açıktır: `eslestirme0001@example.com` ile
`eslestirme0005@example.com`. Her biri farklı bir unvan türünü temsil eder.
Her hesabın rastgele parolası ve ayrı TOTP doğrulama anahtarı vardır.
Diğer 995 hesabın girişi kapalıdır; profilleri dizinde görünür.

Parolalar ve doğrulama kurulum bilgileri yalnızca şu yerel dosyaya yazılır:

```text
backend/backups/eslestirme-test-hesaplari.json
```

Bu klasör Git ve Docker imajlarından dışlanır. Dosya yalnızca yeni giriş
hesapları oluşturulurken yazılır; mevcut dosyanın üstüne yazılmaz. Dosya
yazılamazsa veritabanı işlemi geri alınır. Sonraki çalıştırmalar parolaları
yeniden üretmez. Kaybolan giriş bilgileri için hesap kurtarma gerekir.

Google Authenticator'a `mfa_anahtari` değerini zaman tabanlı hesap olarak
ekleyin. Hesap adı olarak aynı kaydın `email` değerini kullanın. Ardından
`http://localhost:8080/giris` ekranında e-posta, parola ve güncel 6 haneli
kodla giriş yapın. `mfa_uri`, aynı kurulumu QR olarak sunmak içindir.

Normal başlangıç komutu `make baslat` olarak kalır; her başlatmada test
verisi eklenmez.

## Açık örnek adresler

Yüz yüze görüşme sunan yeni örnekler mahalle, sokak, bina, kat ve daire içeren
adreslerle oluşturulur. Bunlar kurgusal test adresleridir; Google Maps araması
gerçek bir kliniğin konumunu doğrulamaz. Şehir ve ilçe profilden bağlantıya eklenir.
Yalnızca çevrim içi profillere fiziksel ofis adresi eklenmez.

Önceki sürümün boş/yer tutucu adreslerini tamamlamak için:

```bash
make baslat
make docker-adresler
```

Komut yalnızca geliştirmede çalışır ve bilinen örnek hesap kalıbı ile kurgusal
biyografiyi birlikte kontrol eder. Kullanıcının düzenlediği açık adresleri,
parolaları, MFA anahtarlarını ve randevuları değiştirmez. Tekrar çalıştırılabilir;
tamamlanmış adresleri yeniden yazmaz. Hesaplar yeniden üretilmez.
