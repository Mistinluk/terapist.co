# Türkiye kapsamı ve güvenlik

Kullanıcı uygulamanın yalnızca Türkiye'de kullanılacağını belirtti. Bu nedenle
tasarımın önceliği 6698 sayılı Kanun, özel nitelikli kişisel veriler ve Türkiye'deki
sağlık hizmetinin somut koşullarıdır. HIPAA'nın kapsama giren ABD kuruluşları ve iş
ortaklarına uygulanması ayrı bir konudur; yalnızca psikolog uygulaması olmak HIPAA
kapsamını tek başına belirlemez. [HHS kapsam açıklaması](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html)

## Kodda bulunan kontroller

| Alan | Uygulama |
|---|---|
| Veri minimizasyonu | Randevu için ad, telefon, uzman ve zaman; serbest sağlık notu yok. |
| Ayrı veri modelleri | Giriş e-postası/parola, kamu profili, şifreli randevu ve denetim ayrı tablolar. |
| Depolama | Danışan adı/telefonu ve MFA sırları Fernet ile doğrulamalı şifrelenir. Anahtar ortamdan gelir. |
| Kimlik | Argon2id parola özeti; yeni hesaplarda TOTP; üretimde MFA'sız giriş kapalı. |
| Oturum | Sunucuda yalnızca token özeti; HttpOnly + SameSite=Strict; üretimde Secure çerezi. |
| Süreler | 15 dakika hareketsizlik, 8 saat azami süre, çıkışta iptal; hareketsiz arayüz temizlenir. |
| Yetkilendirme | Her korumalı istekte aktif hesap/rol kontrolü; randevu sorgusu uzman kimliğine bağlı. |
| İstek güvenliği | Kesin Origin doğrulaması, CSRF, kısıtlı Host, 32 KiB istek sınırı ve Pydantic doğrulaması. |
| Kötüye kullanım | Giriş IP'si + hesap bazlı hız sınırı; başvuru ve randevu limiti; üretimde Redis zorunlu. |
| Denetim | Girişler, MFA hataları, profil işlemleri, danışan listesi erişimi ve durum değişiklikleri. |
| Hata/önbellek | Ham girdileri yansıtmayan Türkçe hatalar; SQL parametrelerini gizleme; API'de no-store. |
| Tarayıcı | Aynı kaynak API; localStorage/sessionStorage'a danışan veya token yazılmaz; reklam/analiz izleyicisi yok. |
| Yarış koşulları | Aktif uzman/zaman benzersizliği ve PostgreSQL satır kilitleri. |

Fernet alan şifrelemesi, tam disk/yedek şifrelemesinin yerine geçmez. Zaman, uzman
kimliği, durum ve giriş e-postası gibi metaveriler veritabanında okunabilir. Bunlar
da kişisel veri güvenliği kapsamındadır. Uygulama anahtarına ve veritabanına birlikte
erişebilen sistem yöneticisi şifreli alanları çözebilir.

## Üretim öncesinde tamamlanması gerekenler

1. Veri sorumlusunu ve veri işleyenleri belirleyin; işlenen her veri için amaç,
   hukuki şart, alıcılar, erişim rolleri ve saklama süresini kayda geçirin. Sağlık
   verileri için sıradan meşru menfaat varsayımıyla hareket edilmemelidir. 2024'te
   değişen 6. madde ve güncel rehber kullanılmalıdır.
   [KVKK özel nitelikli veri rehberi](https://www.kvkk.gov.tr/Icerik/8184/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber)
2. Aydınlatma metnini veri sorumlusu, amaçlar, yöntem/şart, aktarım, haklar ve
   başvuru kanalıyla tamamlayın. Formdaki “okudum” kaydı, açık rıza yerine geçmez.
   Gerekli hukuki şart somut hizmet ve mesleki yetkiye göre belirlenmelidir.
3. Türkiye'de barındırma tercihini sağlayıcının yedekleri, destek erişimi, günlükleri
   ve alt işleyenleriyle birlikte değerlendirin. Yalnızca sunucunun Türkiye'de
   bulunması tüm aktarımları çözmez. Yurt dışı aktarım varsa 9. madde kapsamındaki
   uygun mekanizma ve yükümlülükler ayrıca uygulanmalıdır.
   [KVKK yurt dışına aktarım](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim)
4. TLS, disk/yedek şifrelemesi, sır yönetimi, sınırlı veritabanı rolleri, değiştirilemez
   dış denetim deposu, geri yükleme testi ve olay müdahale sürecini kurun.
5. Uzmanların kimlik, diploma, mesleki yetki ve iletişim kanallarını onaylamadan
   profilleri yayınlamayın. Çocuk danışan, temsilci, saklama ve erişim taleplerinin
   süreçlerini ayrıca belirleyin.
6. Personel erişimi, eğitim, gizlilik yükümlülükleri, hesap kapatma, anahtar değişimi,
   ilgili kişi talepleri ve ihlal bildirimi sorumlularını atayın.

Bu maddeler kodun otomatik doğrulayabileceği gereklilikler değildir. Üretim
yapılandırmasındaki kontroller eksik ayarları engeller; hukuki uygunluğu doğrulamaz.
Denetim tablosu uygulamada değiştirilemez olsa da veritabanı yöneticisine karşı
kurcalamaya dayanıklı değildir. Dış, ayrı yetkili bir kayıt deposu kurulmalıdır.

## HIPAA hakkında

ABD kapsamı ileride oluşursa teknik kontrollerin yanında risk analizi, idari ve
fiziksel tedbirler, iş ortağı sözleşmeleri ve operasyonel kanıt gerekir. Bu uygulama
ve herhangi bir genel barındırma hizmeti kendiliğinden “HIPAA uyumlu” ilan edilmemelidir.
[HHS Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html),
[HHS bulut hizmetleri rehberi](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html).

Kaynak kontrol tarihi: 11 Eylül 2026. Hukuki kapsam ve üretime geçiş, Türkiye'deki
sağlık hizmeti ve veri koruma mevzuatına hâkim bir uzmanla doğrulanmalıdır.
