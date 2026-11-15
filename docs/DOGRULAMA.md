# Doğrulama sonucu

## Professional Network Phase 15 — 3 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **117 başarılı, 2 kasıtlı atlandı**; 17 profil/pasaport senaryosunda doğrulanmış katkı sayımı, yaklaşım/alan görünürlüğü ve açıklama metni dahil |
| Ruff / PEP 8 ve biçim | **62 dosya**, başarılı |
| Veritabanı | Yeni tablo veya migration gerekmedi; Phase 14 `peer_specialty_associations` kayıtları kullanıldı |
| Vitest | **14 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 1440 px ve 390 px | Profil ve SSR pasaportta başlık/açıklama görünür; yatay taşma veya konsol hatası yok |

Profil ve SSR pasaport başlığı “Meslektaşlarının sizi ilişkilendirdiği alanlar”
olarak birleştirildi. Her alanın yanındaki sayı, yalnız ilgili alanı seçen
doğrulanmış ve yayındaki terapistleri sayar; aynı katkıda bulunan aynı alanda
benzersizlik kısıtı nedeniyle bir kez yer alır. Arayüz bunun rating olmadığını
ve sayının profesyonel ilişkilendirme adedini gösterdiğini açıkça belirtir.

## Professional Network Phase 14 — 3 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **117 başarılı, 2 kasıtlı atlandı**; altı bağlam, yaklaşım alanı, testimonial reddi, yetki, görünürlük ve moderasyon dahil |
| Ruff / PEP 8 ve biçim | **62 dosya**, başarılı |
| Alembic, eski bağlamlı SQLite kopyası | Phase 14'e yükseltme, Phase 13'e geri alma ve yeniden yükseltme başarılı; `training` kaydı kayıpsız dönüştü, yabancı anahtar ihlali yok |
| Vitest | **14 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 1440 px ve 390 px | Açık profil alan özeti taşmasız; puan/kalite karşıtı açıklama görünür ve konsol hatası yok |

İlişkilendirme yalnız doğrulanmış terapistler arasında yapılır. Katkıda bulunan
önce altı kontrollü profesyonel bağlamdan birini, ardından hedefin profilinde
yayımlanan çalışma alanı veya yaklaşımı seçer. İstek sözleşmesi serbest yorum
ve testimonial alanlarını reddeder. Aynı meslektaş aynı hedef/alan için bir kez
sayılır; bağlam değişikliği ikinci oy üretmez. Açık toplamlar arama sıralamasına
katılmaz ve kalite ya da reputation score olarak sunulmaz.

## Professional Network Phase 13 — 3 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **110 başarılı, 2 kasıtlı atlandı**; ilk değer, iki anonim açılış, dashboard geçmişi, süre aşımı ve veri minimizasyonu dahil |
| Ruff / PEP 8 ve biçim | **61 dosya**, başarılı |
| Alembic, dolu SQLite kopyası | Phase 13'e yükseltme, Phase 12'ye geri alma ve yeniden yükseltme başarılı; yabancı anahtar ihlali yok |
| Veritabanı kısıtı | `view_count >= 0`; eski kayıtlar için güvenli varsayılan `0` |
| Vitest | **14 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |

Mevcut referral modeli genişletildi; ikinci bir yönlendirme sistemi kurulmadı.
Ham token yerine SHA-256 özeti, kontrollü yönlendirme nedeni, 90 günlük süre ve
sıralı hedefler korunur. Geçerli anonim sayfa açılışı hem atomik `view_count`
artışı hem `referral_opened` olayı üretir; profil geçişi mevcut
`profile_clicked_from_referral` olayıyla izlenir. İletişim tıklaması ve randevu
talebi olayları henüz eklenmedi. Danışan kimliği, iletişimi, terapiye başlama
veya sağlık sonucu bilgisi için veri alanı bulunmaz.

## Professional Network Phase 11 — 2 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **106 başarılı, 2 kasıtlı atlandı**; yetkisiz erişim, hesap sahipliği, tüm metrikler ve süresi geçmiş kayıtların aksiyon sayılarına katılmaması dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Veritabanı | Yeni tablo veya migration gerekmedi; mevcut bağlantı, davet, yönlendirme olayı ve tavsiye kayıtları salt okunur toplulaştırıldı |
| Vitest | **14 başarılı**; beş metrik, ölçüm açıklaması ve aksiyon önceliği dahil |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 1440 px | Beş metrik ve sıradaki aksiyon görünür; aksiyon doğru dashboard sekmesini açıyor, taşma veya konsol hatası yok |
| Tarayıcı, 390 px | Metrikler tek sütuna iniyor; yatay taşma veya konsol hatası yok |

Dashboard artık `Özet` sekmesiyle açılır. Metrikler hesabın tüm dönemini kapsar;
trend veya başarı oranı iddiası üretmez. Yönlendirme profil geçişleri tekil
ziyaretçi olarak sunulmaz, çünkü olay modeli ziyaretçi kimliği tutmaz. Bekleyen
bağlantı ve davetler aksiyon önerisinde önceliklendirilir; süresi dolmuş kayıtlar
geçmiş toplamında korunurken bekleyen/aktif sayılardan çıkarılır.

## Professional Network Phase 10 — 2 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Veritabanı ve API | Yeni tablo veya uç nokta gerekmedi; mevcut, yalnız kabul edilmiş ve görünür bağlantıları döndüren public ağ çıktısı kullanıldı |
| Vitest | **12 başarılı**; merkez düğüm, ilişki türü, profil linkleri, klavye sırası, sekiz düğüm sınırı ve kalanların listelenmesi dahil |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 1440 px | Yedi bağlantılı SVG grafik, merkez terapist ve altı ilişki türü görünür; yatay taşma veya konsol hatası yok |
| Tarayıcı, 390 px | Grafik sade bağlantı listesine dönüşüyor; yedi bağlantının adı, ilişki türü ve profil eylemi görünür, yatay taşma yok |

Grafik yeni bir istemci bağımlılığı olmadan React ve SVG ile üretildi. Kararlı
yerleşim ve ilk çizim maliyeti için ad sırasındaki ilk sekiz bağlantı grafikte
gösterilir; kalanlar açılabilir listede erişilebilir kalır. Mobil görünüm ilk
20 bağlantıyı doğrudan listeler ve varsa kalanları yine açılabilir listede
sunar. Görsel yalnız ilişki bağlamını açıklar; puan, kalite göstergesi veya
arama sıralama sinyali üretmez.

## Professional Network Phase 9 — 2 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **104 başarılı, 2 kasıtlı atlandı**; toplu network sayımı, doğrulanmış katkıda bulunanlar, yedi meslektaş örneği ve sıralama bağımsızlığı dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Veritabanı | Yeni tablo veya migration gerekmedi; mevcut `peer_specialty_associations` verisi kullanıldı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 390 px | “7 meslektaşı…” bilgisi kartta görünür; yatay taşma veya konsol hatası yok |

Meslektaş alan sayıları sonuç sayfası başına tek toplu sorguyla getirilir; kart
başına sorgu yapılmaz. Sinyal eşleşme puanına, kesin filtrelere veya SQL
`ORDER BY` ifadesine eklenmedi. Specialty/yaklaşım uyumu ana puan olarak,
konum ve format seçimleri kesin filtre olarak korunur. Arayüz bu bilgiyi açıkça
değerlendirme, kalite puanı veya sonuç sıralaması olmadığını belirterek sunar.

## Professional Network Phase 8 — 2 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **103 başarılı, 2 kasıtlı atlandı**; yetki, doğrulama, tekil oluşturma, responsive embed, SVG, tıklama yönlendirmesi ve veri minimizasyonu dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, dolu SQLite | Phase 8'e yükseltme, Phase 7'ye geri alma ve yeniden yükseltme başarılı; yabancı anahtar ihlali yok |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 390 px ve 320 px | Rozet oluşturma, embed kodu, responsive SVG ve pasaporta tıklama başarılı; yatay taşma veya konsol hatası yok |

Her doğrulanmış terapist için yalnız bir rozet üretilir; aynı oluşturma isteği
ikinci `badge_created` olayı oluşturmaz. SVG dış sitelerde kullanılabilmesi için
script içermeyen bir public asset ve `Cross-Origin-Resource-Policy` başlığıyla
sunulur. Tıklama `badge_clicked` olayını kaydedip doğrulanmış pasaporta 303 ile
yönlendirir. Olay tablosunda ziyaretçi kimliği, IP, kullanıcı aracısı veya
sağlık verisi alanı bulunmaz. Doğrulaması kalkan profilin SVG ve tıklama uçları
yayından kalkar.

## Professional Network Phase 7 — 2 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **99 başarılı, 2 kasıtlı atlandı**; otomatik sıra, kapasite, limit artırma, yeniden doğrulama, yetki, profil çıktısı ve sıralama bağımsızlığı dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, dolu SQLite | Phase 7'ye yükseltme, Phase 6'ya geri alma ve yeniden yükseltme başarılı; iki profil ve kurucu numaraları korundu |
| Founder ID değişmezliği | Doğrudan SQL ile numara güncelleme ve üyelik silme trigger tarafından reddedildi |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 1440 px ve 390 px | Profil ve pasaport kurucu badge'i ile yönetici kapasite özeti doğrulandı; yatay taşma, kesilen içerik veya konsol hatası yok |

Kurucu programı varsayılan olarak 500 kapasiteyle başlar. İlk doğrulanan uygun
terapist `#0001` değerini alır; ayar satırı kilidi eşzamanlı tahsisleri
sıralaştırır. Kapasite dolunca doğrulama normal tamamlanır ancak yeni founder
kimliği üretilmez. Yönetici kapasiteyi artırdığında bekleyen doğrulanmış
profiller eski doğrulama zamanına göre otomatik tamamlanır. Founder alanı
eşleştirme puanına ve `ORDER BY` ifadelerine eklenmedi; ayrı regresyon testi
daha yüksek eşleşme puanının founder olmayan profili yine öne taşıdığını
doğruladı.

## Professional Network Phase 6 — 1 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **94 başarılı, 2 kasıtlı atlandı**; SSR bölümleri, doğrulama görünürlüğü, XSS kaçışı, sitemap/robots, kullanıcı adı çakışması ve önceki fazlar dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, dolu SQLite | Phase 6'ya yükseltme, Phase 5'e geri alma ve yeniden yükseltme başarılı; iki profil ve yabancı anahtarlar korundu, benzersiz kullanıcı adı indeksi doğrulandı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, 1440 px ve 390 px | Profil→pasaport geçişi, sekiz bölüm, canonical ve `Person` mikro verisi başarılı; yatay taşma, kesilen içerik veya konsol hatası yok |

`/passport/{kullanici_adi}` belgesi FastAPI tarafında JavaScript olmadan
üretilir. Yalnız yayında ve doğrulanmış profiller indekslenir. Canonical,
Open Graph, robots, sitemap ve Schema.org `Person`/`PostalAddress` mikro verisi
bulunur; bireysel profil klinik veya işletme olarak sunulmadığı için
`MedicalBusiness` kullanılmadı. Pasaport, stil, robots ve sitemap uçları GET
yanında HEAD isteklerini de destekler ve beş dakikalık açık önbellek başlığı
taşır.

## Professional Network Phase 5 — 1 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **89 başarılı, 2 kasıtlı atlandı**; oluşturma, tekil sayım, bağlam güncelleme, yetki, kendi profili, geçersiz alan/bağlam ve doğrulama görünürlüğü dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, boş SQLite | Phase 5'e yükseltme, Phase 4'e geri alma ve yeniden yükseltme başarılı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, masaüstü ve 390 px | Profesyonel bağlam, çalışma alanı seçimi, tekil meslektaş sayımı ve açık profil görünümü başarılı; yatay taşma veya konsol hatası yok |

İlişkilendirme yalnız doğrulanmış terapistler arasında ve hedef profilin
yayımladığı alanlarla yapılabilir. Aynı meslektaş aynı hedef/alan için yalnız
bir kez sayılır; yeniden gönderim bağlamı günceller. Açık profilde bağlam veya
meslektaş adı yayımlanmaz ve toplamlar kalite ya da puan olarak sunulmaz.

## Professional Network Phase 4 — 1 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **84 başarılı, 2 kasıtlı atlandı**; anonim açılış, hedef tıklaması, yetki, duplicate hedef, geçersiz neden/hedef ve süre aşımı dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, boş SQLite | Phase 4'e yükseltme, Phase 3'e geri alma ve yeniden yükseltme başarılı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, masaüstü ve 390 px | Üç adımlı wizard, tekil URL, anonim sayfa ve profil tıklaması başarılı; yatay taşma veya konsol hatası yok |

Bağlantı yalnız kontrollü yönlendirme nedeni ile bir ila üç doğrulanmış profil
taşır; danışan kimliği, iletişimi, serbest metni veya sağlık verisi için alan
yoktur. Ham token saklanmaz. `referral_created`, `referral_opened` ve
`profile_clicked_from_referral` olaylarının üçü de kurgusal tarayıcı akışında
oluştu; olaylarda ziyaretçi kimliği, IP veya kullanıcı aracısı tutulmaz.

## Professional Network Phase 3 — 1 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **79 başarılı, 2 kasıtlı atlandı**; alan/adaya göre listeleme, oluşturma, duplicate, kendi alanı/profili, yetki, hedef doğrulaması, public görünürlük ve kaldırma dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, boş SQLite | Phase 3'e yükseltme, Phase 2'ye geri alma ve yeniden yükseltme başarılı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |
| Tarayıcı, masaüstü ve 390 px | Alan seçimi, doğrulanmış terapist seçimi, oluşturma, dashboard listesi ve açık profil grubu başarılı; yatay taşma veya konsol hatası yok |

Öneri oluşturmak için hem profil sahibinin hem hedef terapistin doğrulanmış
olması gerekir. Profil sahibi kendi çalıştığı alan için veya kendisini hedef
göstererek öneri oluşturamaz. Hedef terapistin doğrulaması/yayını sonradan
kalkarsa kayıt yönetim panelinde kaldırılabilir halde korunur ancak açık
profilde gösterilmez. PostgreSQL ve Redis servisleri çalışmadığı için bu
servislere özgü entegrasyon senaryoları bu fazda tekrarlanmadı.

## Professional Network Phase 2 — 1 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **74 başarılı, 2 kasıtlı atlandı**; ilişki türleri, istek, kabul/red, iki profilde görünürlük, ters duplicate, yetki, doğrulama ve Phase 1 davet bağlantısı dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, boş SQLite | Phase 2'ye yükseltme, Phase 1'e geri alma ve yeniden yükseltme başarılı; yedi ilişki türü doğrulandı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |

Yalnız doğrulanmış terapistler bağlantı isteği oluşturabilir ve yalnız isteğin
alıcısı kabul veya red kararı verebilir. Kabul edilmemiş kayıtlar herkese açık
profil ağlarına girmez. Reddedilen uzman çifti kalıcı rıza kaydı olarak tutulur;
aynı çift için yön değiştirilerek yeni istek oluşturulamaz. PostgreSQL ve Redis
servisleri çalışmadığı için bu fazda bu servislere özgü entegrasyon testleri
tekrarlanmadı.

## Professional Network Phase 1 — 1 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| Python testleri, SQLite | **69 başarılı, 2 kasıtlı atlandı**; davet oluşturma/kabul, duplicate, süre aşımı, kota, yetki, doğrulama ve kurucu numarası dahil |
| Ruff / PEP 8 ve biçim | Başarılı |
| Alembic, boş SQLite | İlk şemadan Phase 1 şemasına yükseltme başarılı |
| Vitest | **10 başarılı** |
| TypeScript + Vite | Üretim derlemesi başarılı |
| Prettier | Başarılı |

PostgreSQL ve Redis bu makinede çalışmadığı için bu fazda PostgreSQL'e özgü
eşzamanlılık senaryoları tekrar edilmedi. Davet e-postası için bir gönderim
sağlayıcısı henüz yapılandırılmadığından panel güvenli paylaşım bağlantısını
yalnız oluşturma anında gösterir; ham davet anahtarı veritabanında tutulmaz.

## Açık örnek adresler ve geçiş dosyalarının temizliği — 20 Eylül 2026

Mevcut `dev` sürümü (`3f1f8ad`) değişikliklerden önce `main` dalına
birleştirilip gönderildi. Sonraki adres/temizlik çalışması `dev` dalındadır.

| Kontrol | Sonuç |
| --- | --- |
| Python: SQLite + PostgreSQL + Redis | Toplam 126 başarılı, SQLite eşzamanlılık senaryosu için 1 kasıtlı atlama |
| Geçici dosya testleri | İlk koşudaki Windows klasör erişim hatası temiz geçici klasörle giderildi; etkilenen iki test tekrar geçti |
| Ruff / PEP 8 ve biçim | 30 Python dosyası başarılı |
| Docker derlemesi | API ve React/Nginx derlendi; servisler sağlıklı |
| Örnek veri | 661 yüz yüze profilin boş/yer tutucu adresi tamamlandı |
| Tarayıcı | Erdee profilinde mahalle/sokak/bina/kat/daire ve tam adresli Maps bağlantısı doğrulandı |
| Temizlik | İki eski aktarım aracı, bunların iki test dosyası ve iki geçiş belgesi kaldırıldı; kırık referanslar temizlendi |
| Korunanlar | `legacy/`, güncel Alembic şeması, PostgreSQL verileri ve yerel test hesabı dosyaları |

Yeni adresler kurgusaldır; gerçek bir kliniğe ait oldukları veya Google Maps'te
doğru bir bina olarak bulunacakları iddia edilmez. Aşağıdaki sonuçlar önceki
sürümlerin tarihli kayıtlarıdır; kaldırılan aktarım testleri güncel pakette yoktur.

## Kod açıklamaları ve Google Maps — 20 Eylül 2026

| Kontrol | Sonuç |
| --- | --- |
| Python: SQLite + PostgreSQL + Redis | 127 başarılı, 3 kasıtlı atlandı; PostgreSQL'e özgü senaryoların SQLite parametreleri |
| Ruff / PEP 8 ve biçim | 32 dosya başarılı; test açıklamaları da 79 karakter sınırında |
| Vitest | 10 başarılı; adres kodlama, boş adres/çevrim içi profil ve uzun URL senaryoları dahil |
| TypeScript, Vite, Prettier | Başarılı |
| Docker | API, web, PostgreSQL ve Redis sağlıklı |
| Tarayıcı | Erdee profilinin bölge bağlantısı yeni sekmede gerçek Google Maps Kadıköy/İstanbul sonucunu açtı |

Models/CLI/main ile testlerin açıklamaları genişletildi. Harita kontrolünde
yalnızca kurgusal profilin ilçe/şehir bilgisi kullanıldı; gerçek danışan veya
randevu verisi gönderilmedi. Bir açık adresin doğru binayı bulması bu kontrolün
kapsamında değildir. Önceki bağımlılık uyarıları devam eder; test hatası yoktur.

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
