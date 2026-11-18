# Randevu takibi, istatistikler ve Google Takvim

## Kullanım

1. Danışan bir profilden randevu talebi gönderir; kayıt olması gerekmez.
2. Başarı kutusundaki **Randevularımı takip et** bağlantısı veya üst menüdeki
   **Randevularım**, `/randevularim` sayfasını açar.
3. Uzman `/panel?sekme=randevular` içinde aynı talebi görür ve onaylar,
   reddeder veya iptal eder. Ekranlar 30 saniyede bir ve sekmeye dönünce
   yenilenir. Yönetim paneli de bütün randevuları gösterir.
4. Onaylı görüşmenin bitiş zamanı geçince uzman veya yönetici
   **Tamamlandı işaretle** düğmesini kullanabilir. Sadece zamanın geçmesi,
   görüşmenin gerçekleştiği anlamına gelmez; otomatik tamamlanma yoktur.
5. Danışan gelecekteki bekleyen/onaylı talebini kendi sayfasından iptal
   edebilir. İptal hem uzman panelinde hem istatistiklerde görünür.

Danışan paneli bu sürümde **aynı tarayıcıya bağlıdır**. HttpOnly,
SameSite=Strict çerezi 90 gün geçerlidir; üretimde Secure niteliği de vardır.
Veritabanında yalnız erişim anahtarının SHA-256 özeti tutulur. Anahtar URL'ye,
localStorage'a veya JavaScript yanıtına konmaz. İsim, telefon veya randevu
kimliğini bilmek erişim sağlamaz. Yeni oturum öncesindeki eski kayıtlara
otomatik erişim verilmez; telefon eşleştirerek sahiplik tahmin edilmez.

Çerez silinirse veya başka cihaz/tarayıcı/adres kullanılırsa liste açılamaz.
Paylaşılan cihazda **Bu cihazdaki erişimi kapat** düğmesi erişimi temizler,
randevuları iptal etmez. Bu sürümde e-posta/SMS ile erişim kurtarma yoktur.
Danışan sayfası istemci ve sunucu analitiğinden dışlanır.

## İstatistiklerin anlamı

| Alan | Anlamı |
| --- | --- |
| Toplam talep | Bütün durumların toplamı; yalnız açık sayfadaki 50 kayıt değildir |
| Onay bekliyor | Uzmanın henüz yanıtlamadığı talepler |
| Onaylandı | Onaylı, henüz tamamlandı/iptal işaretlenmemiş görüşmeler |
| Tamamlandı | Süresi bitmiş, önceden onaylı ve açıkça tamamlandı işaretlenmiş görüşmeler |
| İptal edildi | Danışan, uzman veya yönetici tarafından iptal edilenler |
| Reddedildi | Uzman/yönetici tarafından reddedilen talepler |

Bunlar mevcut durum sayılarıdır; aynı randevu iki kategoride sayılmaz.
Danışan yalnız kendi tarayıcısının, uzman yalnız kendi randevularının,
yönetici bütün sistemin toplamlarını görür. Yönetimdeki 7/30 günlük talep
sayıları oluşturulma zamanına göredir. Onay oranında tamamlanmış görüşmeler
de onaylanmış sayılır. İstatistikler kişisel ziyaretçi analitiğinden bağımsız,
doğrudan randevu tablosundan hesaplanır.

## Google Takvim kurulumu

Google anahtarları Git'e konmaz. Docker kullanıyorsanız proje içindeki
`backend/.env` dosyasına kendi OAuth istemci değerlerinizi ekleyin:

```dotenv
GOOGLE_ISTEMCI_KIMLIGI=GOOGLE_CLOUD_ISTEMCI_KIMLIGINIZ
GOOGLE_ISTEMCI_SIRRI=GOOGLE_CLOUD_ISTEMCI_SIRRINIZ
GOOGLE_YONLENDIRME_ADRESI=http://localhost:8080/api/google-takvim/geri-donus
```

Google Cloud projesinde Calendar API etkin olmalıdır. OAuth istemci türü
**Web application** olmalı, izin ekranı ve test kullanıcısı yapılandırılmalı,
yukarıdaki geri dönüş adresi **Authorized redirect URIs** listesine aynen
eklenmelidir. `make api` + `make arayuz` kullanıyorsanız port `5173` olur.
Üretimde gerçek HTTPS alan adınızı kullanın. OAuth istemci sırrını sohbet,
ekran görüntüsü veya Git ile paylaşmayın.

```bash
make baslat
```

Uzman hesabıyla giriş yapın; profil düzenlemedeki **Google Takvim** bölümünde
bağlantıyı kurun. Daha önce bağlanan uzmanlar **Randevu aktarımını
etkinleştir** düğmesiyle ek yazma iznini vermelidir. Eski salt-okuma izniyle
müsaitlik kontrolü sürer; yazma izni varmış gibi davranılmaz.

İzinler: `openid`, `email`, `calendar.events.freebusy`,
`calendar.calendarlist.readonly` ve `calendar.events.owned`. Son kapsam,
kişinin sahip olduğu takvimlere etkinlik yazmaya izin verir. Kod yalnız
birincil takvimde kendi ürettiği etkinlik kimliklerine yazar; kişisel etkinlik
başlıklarını listelemez. Kapsamların tam açıklaması
[Google izin rehberinde](https://developers.google.com/workspace/calendar/api/auth),
etkinlik kimliği ve yazma sözleşmesi
[Google Events API'de](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
yer alır.

## Eşitleme davranışı

- Talep Google'da **Randevu talebi**, geçici onay (`tentative`) olarak oluşur.
- Onay aynı etkinliği **Randevu**, `confirmed` durumuna getirir.
- İptal veya ret Google etkinliğini kaldırır; tamamlanan görüşme geçmişte kalır.
- Başlık, başlangıç/bitiş ve özel görünürlük dışında danışan adı, telefon,
  klinik not, uzman adı veya takip bağlantısı gönderilmez. Katılımcı eklenmez.
- API randevu ve Google işini aynı DB işleminde kaydeder. Google hatası
  randevu kaydını geri almaz. FastAPI yaşam döngüsündeki çalışan, bekleyen
  işleri işler; hata durumunda 30 saniyeden başlayıp en fazla bir saate çıkan
  beklemeyle tekrar dener. Panelde aktarım durumu görünür; **Şimdi eşitle**
  hata alan işleri yeniden sıraya alır.
- Aynı Google etkinlik kimliği tekrar kullanılır. Yanıt kaybolduğunda ikinci
  etkinlik oluşturulmaz. PostgreSQL satır kilitleri birden çok API çalışanını
  ve eşzamanlı durum güncellemelerini koordine eder. Sunucu yeniden açıldığında
  işler PostgreSQL'den devam eder. Sunucu kapalı/uykudayken aktarım çalışmaz.

Google'da elle değiştirilen etkinlik, uygulamanın randevu durumunu değiştirmez;
durumun kaynağı uygulamadır. Google'daki diğer dolu zamanlar mevcut müsaitlik
kontrolüne katılmaya devam eder. Bağlantı kaldırılırsa mevcut Google kopyaları
silinmez ve güncellenmez; panel bunu söyler. Başka Google hesabına geçiş eski
hesaptaki kopyaları taşımaz. Gereken eski kopyalar Google'dan elle kaldırılır.

Danışanın **Google Takvim'e ekle** düğmesi farklıdır: kullanıcının Google
ekranında kaydettiği ayrı bir kopya açar. Kullanıcı tıklamadan istek gitmez;
Google OAuth bağlantısı istenmez. Bu kişisel kopya sonraki onay/iptallerde
otomatik güncellenmez; güncel durum için danışan sayfası kullanılır.

## Doğrulama ve sınırlar

`test_patient_appointments.py` iki tarafın görünürlüğünü, yetki ayrımını,
çerez süresini, iptali ve sayfalardan bağımsız istatistikleri sınar.
`test_appointment_calendar.py` talep/onay/iptali, Google yanıt kaybını ve
mükerrer etkinliği önlemeyi sahte Google istemcisiyle doğrular.
`appointments.test.tsx` kişisel takvim URL'sini ve ekran metinlerini sınar.
Gerçek Google hesabında OAuth onayı alınmadan canlı aktarım doğrulanmış sayılmaz.
