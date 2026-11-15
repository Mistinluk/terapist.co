# PRD uygulama durumu

Bu belge, kullanıcı tarafından sağlanan fazlandırma/PRD metninin mevcut üretim
koduyla karşılaştırmasını ve bu değişiklikte alınan kararları kaydeder.
Mevcut yığın **React + Vite, FastAPI, SQLAlchemy** olarak korunur. PRD'deki
Next.js/Tailwind önerisi bu kod tabanına taşınmaz.

| İstek | Durum | Kod karşılığı / sınır |
| --- | --- | --- |
| Terapist odaklı ana sayfa ve hero alanında tiresiz adres seçimi | Uygulandı | `frontend/src/pages/Home.tsx`, `frontend/src/App.tsx`; üst header sahiplenme bandı kaldırıldı, sabit boyutlu canlı hero kartı ve yalnızca terapistlere yönelik tek akışlı SSS eklendi |
| Keşfet dizini | Mevcut, ayrı yola taşındı | `/kesfet`; anonim tercih eşleştirme `POST /api/eslestirme` |
| Meslektaş bağlantıları, alan ilişkilendirmeleri ve önerileri | Mevcut, ana sayfada açıklandı | İlişki bağlamı ve çalışılmayan alan için doğrulanmış meslektaş önerisi; kalite puanı değildir |
| Profil adresi seçimi ve müsaitlik kontrolü | Uygulandı | Başvuruda tiresiz özel `/{kullanici_adi}` adresi (`^[a-z0-9]+$`), 300 ms gecikmeli kontrol, alternatif öneri, veritabanı benzersizlik kısıtı |
| 15 dakika kullanıcı adı rezervasyonu | Bekliyor | Anlık müsaitlik rezervasyon değildir; yarışta ikinci başvuru 409 alır |
| `terapist.co/{kullaniciadi}` kısa adresi | Uygulandı | FastAPI kanonik ve sosyal metaverisi içeren HTML kabuğu üretir; React tek etkileşimli profili açar. Eski `/passport/{kullanici_adi}` adresi 308 ile yeni adrese gider. Sitemap kısa adresi kullanır. |
| İki sütunlu profil, kaynaklar ve sahip görünümü | Uygulandı | Mobil öncelikli kartlar; gerçek randevu saatleri, meslektaş alan sayıları, eğitim, sosyal bağlantılar, isteğe bağlı kaynaklar ve sahibine düzenleme/sıralama kontrolleri. Boş kartlar ziyaretçide gizlenir. |
| Linktree Pro modülleri (Şifreli Link, Zamanlanmış Link, Vurgulu Link, Gömülü Medya) | Uygulandı | `backend/app/api/resources.py`, `frontend/src/components/ProfileResources.tsx`; PBKDF2-SHA256 parola korumalı linkler, başlangıç/bitiş zamanlı linkler, Spotify/YouTube gömülü oynatıcılar |
| Hızlı Onboarding & Bekleme Listesi (Waitlist) | Uygulandı | `backend/app/api/waitlist.py`, `frontend/src/components/WaitlistModal.tsx`; Fernet ile şifreli iletişim bilgisi ve uygunluk tercihi |
| Görünüm Stüdyosu (4 Tema Paketi, Buton Stilleri, Fontlar, White-Label) & Masa QR Kartı | Uygulandı | `backend/app/api/themes.py`, `frontend/src/components/ThemeCustomizer.tsx`; 4 tasarım stili (`klinik_modern`, `sicak_organik`, `editoryal_klasik`, `minimal_mono`), özel renk paleti, dinamik SVG/PNG QR kartı |
| Kompakt Bildirim Çanı & Çift Yönlü Mesajlaşma Merkezi | Uygulandı | `backend/app/api/notifications.py`, `frontend/src/components/NotificationBell.tsx`, `frontend/src/components/NotificationsAndMessages.tsx`; taşmasız kompakt bildirim özeti (`Yeni bildirim` + `Kimden`), terapistler arası ve yönetici ile çift yönlü mesajlaşma (`MesajKonusu`, `KonuMesaji`), bağlantı ve onay bildirimleri |
| Dönüşüm ve trafik analitiği (GA4 + site içi tıklama hunisi) | Uygulandı | `backend/app/api/growth_analytics.py`, `frontend/src/components/AnalyticsSection.tsx`; profil görüntüleme, kaynak/buton tıklama dönüşüm oranı ve günlük trafik serisi |
| Diploma belgesi yükleme ve belgeye özel onay rozeti | Bekliyor | Mevcut yönetici profil doğrulaması belge doğrulaması olarak sunulmaz; hassas belge saklama, erişim ve silme politikası gerekir |
| Ekol açıklama kartları | Bekliyor | Klinik içerik uzman incelemesi ve kaynaklandırma gerektirir |
| Google Takvim OAuth, iki yönlü senkronizasyon, Meet | Kısmen uygulandı | Dar kapsamlı (`calendar.freebusy` ve `calendar.calendarlist.readonly`) OAuth + PKCE bağlantısı, Fernet ile şifreli token/hesap saklama, seçili dolu takvimler ve isteğe bağlı müsaitlik takvimiyle randevu saatlerini süzme ve bağlantı kopma akışı uygulandı; iki yönlü etkinlik yazma ve Meet bağlantısı kapsam dışıdır |
| Ücretsiz 15 dakikalık ön görüşme / 50 dakikalık seans | Kısmen | Görüşme süresi 30, 45, 50 veya 60 dakika olarak profilden seçilir; ücretsiz ön görüşme teklifi tanımlı olmadığı için gösterilmez |
| Mini form ve e-posta/PDF toplama | Bekliyor | Açık rıza, saklama süresi ve veri minimizasyonu kararı gerekir; sağlık başvuru nedeni mevcut forma eklenmez |
| Dönüşüm analitiği | Kısmen mevcut | Mevcut `growth_analytics` yalnız gerçek kayıtları kullanır; PRD'deki tam huni ve açık profil rozeti yoktur |
| Bu hafta uygun saat filtresi | Bekliyor | Çoklu takvim sorgusu ve performans sınırı gerekir |
| En fazla beş meslektaş önerisi | Bekliyor | Mevcut kural farklıdır; veri geçişi ve mevcut kayıtlar incelenmeden düşürülmez |
| Ücretli planlar | Bekliyor | PRD'deki fiyatlar örnektir; ödeme/abonelik ve hukuki karar olmadan yayınlanmaz |

## Korunan güvenlik sınırları

- Danışan tercihleri hesap veya URL'ye yazılmadan `POST /api/eslestirme` ile işlenir.
- Başvuru ve diğer yazma istekleri Origin, JSON boyutu, hız sınırı ve ilgili
  yetki/CSRF kontrollerinden geçer.
- Profil adresi kontrolü yalnız genel müsaitlik durumunu döndürür. Son kararı
  veritabanının benzersiz alanı verir; çakışma genel 409 yanıtıyla sonuçlanır.
- Mevcut randevu formu tanı veya terapi notu toplamaz. Google takvimindeki özel
  etkinlik başlıklarını alacak bir entegrasyon eklenmemiştir.
- Meslektaş sinyalleri klinik uygunluk veya sonuç garantisi olarak kullanılmaz.
