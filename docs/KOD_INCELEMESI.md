# Eski kod incelemesi

İncelenen kaynak: `Mistinluk/terapist.co`, `30c5a23` (`main`).
Yeni çalışma: ayrı worktree içinde `dev`. Eski kaynaklar `legacy/` altında tutulur.
İnceleme sırasında SQLite satır içerikleri rapora veya önizlemeye taşınmadı.

## Güvenlik bulguları

| Önem | Eski kaynak | Bulgu | Yeni karşılık |
|---|---|---|---|
| Kritik | `admin-giris.php:15–20` | Yönetici kullanıcı adı ve tahmin edilebilir parola kodda sabit. | Terminalden hesap oluşturma; Argon2id; MFA; varsayılan parola yok. Eski canlı hesabın parolası ayrıca değiştirilmeli. |
| Yüksek | `uzman-giris.php:23` | Hash doğrulamasına ek olarak düz metin karşılaştırması kabul ediliyor. | Yalnızca Argon2id doğrulaması. Eski parolalar aktarılmıyor. |
| Yüksek | `admin.php:18–25`, `sil.php:13–18`, `uzman-randevular.php:20–27`, `profil.php:39–62` | GET istekleri onay, silme ve tavsiye durumunu değiştiriyor; CSRF belirteci yok. | POST/PUT/PATCH/DELETE; tam Origin eşleşmesi; korumalı isteklerde CSRF. |
| Yüksek | `profil.php:21–29` | Önce kontrol, sonra ekleme iki ayrı işlem; eşzamanlı talepler çakışabilir. | Aktif randevu için kısmi benzersiz indeks; PostgreSQL uzman satırı kilidi; 409 yanıtı. |
| Yüksek | `profil.php:13–28` | Gönderilen tarih/saat, uzman takvimine ve geçmiş zamana karşı sunucuda doğrulanmıyor. | Saat dilimi zorunlu Pydantic girdisi ve ortak takvim servisi. |
| Yüksek | `terapist.sqlite`, `db.php` | Veritabanı kaynak deposunda ve PHP dosyalarıyla aynı dizinde; danışan adı, telefon ve not düz metin sütunlarda. Web'den indirilebilirliği ayrıca sunucu ayarına bağlı. | Veritabanı web kökünden ayrı; danışan alanları Fernet ile şifreli; dosyalar ignore edilir. Eski Git geçmişi ayrıca ele alınmalı. |
| Yüksek | `admin.php:55–60` | Yönetici ekranı tüm danışan ayrıntılarını çekiyor. | Yöneticiye yalnızca toplamlar; danışan okuması kayıt sahibi uzmana ait. |
| Orta | `db.php:49–108` | Her istekte şema kontrolü ve ALTER TABLE; sürümlü geçiş/geri dönüş yok. | Alembic, isteklerden ayrı çalışır. |
| Orta | `db.php:109–111`, `sil.php:20–22` | Veritabanı hata ayrıntıları kullanıcıya dönebiliyor. | Türkçe genel hatalar; ham Pydantic girdileri ve SQL parametreleri gösterilmez. |
| Orta | `index.php:21–122` | Tüm profiller belleğe çekiliyor; arama ve sayfalama PHP'de yapılıyor. | Filtre, sıralama, sayım ve sayfalama veritabanında yapılır. |
| Orta | Giriş ve panel dosyaları | Açıkça tanımlanmış hareketsiz oturum süresi, MFA, hız sınırı ve denetim izi yok. | 15 dakika hareketsizlik, 8 saat mutlak süre, TOTP tekrar engeli, Redis ve denetim olayları. |
| Orta | `index.php`, `profil.php`, diğer şablonlar | Harici avatar, Google fontları ve çalışma anında CDN JavaScript istekleri. | Yerel paketler, sistem fontları ve tarayıcıda oluşturulan baş harf avatarları. |

PDO hazırlıklı sorguları kullanılan yerlerde genel bir SQL injection açığı varmış
gibi değerlendirilmedi. Eski dinamik LIMIT/OFFSET değerleri çoğunlukla sayıya
çevriliyor. Ana sorunlar yetkilendirme, CSRF, zaman doğrulaması ve dağıtık işlem güvenliğidir.

## Tekrarlar ve sorumluluklar

`ekle.php`, `duzenle.php`, `katil.php`, `uzman-panel.php` aynı profil alanlarını,
HTML ve JSON dönüştürmelerini tekrar ediyor. `ProfileForm` ve Pydantic `ProfilGirdi`
artık bu sözleşmenin ortak noktalarıdır. Şablon, sorgu, oturum ve iş kuralları ayrı
modüllere taşındı. Tek API istemcisi hata, çerez ve CSRF davranışını yönetir.
Türkçe para/tarih biçimlendirmesi tek yerde tutulur. Artık `data.php` ile veritabanı
arasında iki farklı aktif veri kaynağı yoktur.

## Bilinçli değişiklikler

- Uzman silmek yerine arşivlenir; hesabı kapatılır ve oturumları iptal edilir.
  Saklama ve imha kararı ayrı işletim sürecidir.
- Serbest danışan notu yeni formlardan çıkarıldı. Bu ürün klinik seans notu sistemi,
  görüntülü terapi altyapısı veya elektronik sağlık kayıt sistemi değildir.
- Eski harici fotoğraf URL'leri ve çalışmayan Google yorumları entegrasyonu taşınmadı.
  Yeni fotoğraf yükleme özelliği eklenmedi.
- Eski `olusturma_tarihi` biçimleri güvenilir kabul edilmediğinden aktarım aracı
  `olusturma` alanını aktarım anı olarak yazar. Kaynak yedek özgün zamanı korur.
- Yeni uzman profilini ekleme akışı uzman başvurusu üzerinden yürür; yönetici mevcut
  profili onaylar/düzenler. Yönetici tarafından parola atama web ekranı eklenmedi.

## Sınırlar

Bu inceleme kod ve yerel test ortamını kapsar. Mevcut canlı PHP sunucusunun erişim
ayarları, alan adı, TLS, sağlayıcı sözleşmeleri, gerçek kullanıcı yetkileri veya
eski depoya erişen kişiler denetlenmedi. Git geçmişini temizleme, eski anahtarları
iptal etme ve canlı sunucuyu değiştirme işlemleri yapılmadı.
