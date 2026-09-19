# Doğrulama sonucu

## Tercihe dayalı eşleştirme — 19 Eylül 2026

| Kontrol | Sonuç |
| --- | --- |
| Python, SQLite + PostgreSQL + Redis | **127 başarılı, 3 kasıtlı atlandı** |
| Atlananlar | SQLite için 2 PostgreSQL aktarım testi ve 1 eşzamanlılık testi; PostgreSQL karşılıkları geçti |
| Yeni eşleştirme senaryoları | İki veritabanında toplam 38 başarılı senaryo |
| Ruff / PEP 8 ve biçim | 32 Python dosyası; 79 karakter sınırı, başarılı |
| Vitest | 7 başarılı; JSON tercih gövdesi, 0 TL ve boş bütçe ayrımı dahil |
| TypeScript + Vite, Prettier | Derleme ve arayüz biçim kontrolü başarılı |
| Docker | PostgreSQL, Redis, API ve web sağlıklı; mevcut 1.006 profil korundu |
| Tarayıcı | Dar ekranda filtreleri açma/kapama, çoklu tercih ve bütçe girişi, puan/açıklama kartları doğrulandı |
| Örnek sonuç | Kaygı + Travma, BDT, en fazla 2.500 TL: 453 aday; Shaheen 70, Erdee 65 puanla ilk iki sırada |
| Bütün sonuçların HTTP kontrolü | 38 sayfada 453 benzersiz profil; her puan bağımsız yeniden hesaplandı, azalan sıra ve bütçe/onay/arşiv koşulları doğrulandı |

Testler puanlama ve filtre davranışını doğrular; klinik uygunluk kalitesini
ölçmez. Bu çalışmada bağımlılık güvenlik taraması veya yük testi tekrarlanmadı.
HTTP kontrolleri yerel geliştirme ortamındaki kurgusal veriler üzerinde yapıldı.

## Docker ve PostgreSQL geçişi — 12 Eylül 2026

| Kontrol | Sonuç |
|---|---|
| Python, SQLite + gerçek PostgreSQL + Redis | **82 başarılı, 3 kasıtlı atlandı** |
| Atlananlar | SQLite'da PostgreSQL'e özgü 2 aktarım testi ve 1 eşzamanlı yazma testi; PostgreSQL karşılıkları geçti. |
| Ruff / PEP 8 ve biçim | 27 Python dosyası başarılı |
| Vitest | 5 başarılı |
| Docker derlemesi | API ve React/Nginx imajları oluşturuldu |
| WSL'de `make baslat` | PostgreSQL, Redis, API ve arayüz sağlıklı başladı |
| Kayıt aktarımı | 6 kullanıcı, 6 uzman, 1 randevu ve 1 denetim kaydı korundu; SQLite ve `.env` yedeklendi |
| Gerçek tarayıcı, anonim randevu | `127.0.0.1:8080` üzerinde hesap açmadan başarı mesajı görüldü |
| Test temizliği | Yalnızca kurgusal tarayıcı test kaydı kaldırıldı; mevcut randevu korundu |
| Kaynak güvenliği | Geliştirmede aynı porttaki yerel adresler kabul edilir; yabancı kaynak, farklı port ve üretim kısıtları sınandı |
| Hazırlık kontrolü | Gerçek DB sorgusu başarılı; erişim hatasında hassas bilgi içermeyen 503 yanıtı sınandı |

## İlk sürüm — 11 Eylül 2026

11 Eylül 2026 tarihinde yerel Windows ortamında ve ayrılmış Linux konteynerlerinde:

| Kontrol | Sonuç |
|---|---|
| Python testleri, SQLite + PostgreSQL + Redis | **54 başarılı, 1 kasıtlı atlandı** |
| Atlanan test | SQLite'da eşzamanlı yazma testi; karşılığı gerçek PostgreSQL'de geçti. |
| Ruff / PEP 8, 79 karakter | Başarılı |
| Ruff biçim denetimi | 24 Python dosyası uygun |
| TypeScript + Vite üretim derlemesi | Başarılı |
| Vitest form ve Türkçe saat testleri | 2 başarılı |
| Python bağımlılık taraması | Bilinen açık bulunmadı; yerel proje paketi PyPI taramasının doğal olarak dışında. |
| React üretim bağımlılık taraması | Bilinen açık bulunmadı |
| Docker API + arayüz imajları | Linux üzerinde derlendi |
| PostgreSQL Alembic geçişi | Boş veritabanına uygulandı |
| Nginx → API → PostgreSQL | HTTP 200; altı kurgusal profil döndü |
| CSP ve önbellek başlıkları | Nginx/HTTP yanıtında doğrulandı |
| Tarayıcı | Dar ekran ve masaüstü yerleşimi, filtre açma, İstanbul filtresi ve profil geçişi doğrulandı. |
| Randevu uçtan uca | Kurgusal ad/telefonla gönderim başarı mesajına ulaştı. |
| Kaynak SQLite ön kontrolü | 106 uzman, 2 randevu; uzman #6 geçersiz alanlar nedeniyle durdu. Yazma yapılmadı. |

Testler kimliksiz erişim, rol ayrımı, başka uzmanın randevusuna erişim, CSRF,
Origin, oturum süresi/iptali, TOTP ve tekrar kullanımı, hız sınırı, şifreli depolama,
girdi sızıntısı, takvim doğrulaması, SQL benzersizliği, eşzamanlı talepler,
başvuru/MFA/yönetici onayı, Türkçe arama, JSON filtreleri ve veri aktarımının
geri alınmasını kapsar. Eski notların normal API yanıtına sızmadığı da sınandı.

Test çıktısında Starlette/httpx ve AnyIO için iki bağımlılık kaynaklı kullanımdan
kaldırma uyarısı vardır; test başarısızlığı değildir. Paket güncellemelerinde
test istemcisi geçişi izlenmelidir.

Bu sonuç bir dış sızma testi veya hukuki uygunluk denetimi değildir. Gerçek
sağlık verileri, gerçek kullanıcı hesapları ve canlı altyapı üzerinde test yapılmadı.
Hazırlanan GitHub Actions iş akışı henüz uzak depoya gönderilip çalıştırılmadı.
