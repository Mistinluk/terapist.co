# Eski verilerden geçiş

İlk kaynak ve uzak depo değiştirilmedi. Yeni `dev` dalında eski PHP dosyaları
`legacy/` dizinindedir; yeni sunucu bunları çalıştırmaz. SQLite ve eski URL/yedek
notu yerel olarak korunur, yeni dalda yeniden izlenmez. Eski Git geçmişindeki
kopyalar silinmiş değildir.

## Mevcut veri sonucu

Salt okunur ön kontrol 106 uzman ve 2 randevu saptadı. Uzman #6 yeni Pydantic
sözleşmesine uymadığı için işlem durdu. Hiçbir eski kayıt yeni veritabanına
aktarılmadı; önizleme yalnızca ayrıca üretilen kurgusal verileri kullanır.
Hatalı satırın içeriği rapora yazılmadı.

## Aktarım aracı

Sunucu klasöründen, kaynak veritabanının yedeğiyle:

```powershell
uv run python scripts/eski_veri_aktar.py --kaynak ../legacy/terapist.sqlite
```

Varsayılan çalışma salt okunur ön kontroldür. Kaynak SQLite URI'si `mode=ro`
ile açılır. Geçersiz profil, e-posta, takvim ve tekrarlanan e-postalar sessizce
atlanmaz. Eksik bilgileri kaynağın ayrı bir düzeltme kopyasında doğrulayın.
Gerekirse yalnızca sorunlu alan adlarını gösterecek yerel denetimle inceleyin;
danışan içeriğini hata raporlarına kopyalamayın.

Yazma ancak açık `--uygula` bayrağıyla ve uzman/randevu tabloları boş hedefte yapılır.
Önce hedef bağlantısını `.env` içinde doğrulayın ve Alembic şemasını kurun:

```powershell
uv run alembic upgrade head
uv run python scripts/eski_veri_aktar.py --kaynak DUZELTILMIS_KOPYA.sqlite --uygula
```

Araç uzmanları, randevuları ve meslektaş tavsiyelerini tek işlemde taşır.
İlişki hatası, yinelenen aktif randevu veya başka hata olursa **tamamı geri alınır**.
Kaynak üzerinde güncelleme yapılmaz. Aktarım öncesi/sırasında yeni taleplerin
eski sisteme yazılması durdurulmalıdır; bu araç çevrim içi çift yazma yapmaz.

## Alan eşlemeleri ve güvenlik

- Eski `Online` → `Çevrim içi`, `Yüz Yüze` → `Yüz yüze`.
- Ücret TRY tam sayı olarak doğrulanır; belirsiz gösterimler elle düzeltilir.
- Eski yerel tarih/saat `Europe/Istanbul` olarak yorumlanır.
- Eski parola hashleri/düz metin parolalar taşınmaz. Rastgele, bilinmeyen bir parola
  atanır; yetkili operatör kimliği doğrulayıp `kurtar` komutuyla yeni parola ve MFA kurar.
- `danisan_ad`, `danisan_telefon` ve varsa `danisan_notu`, şifreli JSON'a yazılır.
  Eski not `eski_not` alanında korunur; normal randevu API'sinden geri verilmez.
  Yeni klinik not iş akışı eklenmeden erişime açılmamalıdır.
- Eski kayıtlarda aydınlatma kanıtı varsayılmaz; sürüm
  `eski-sistemde-dogrulanmamis` olarak işaretlenir.
- Oluşturma zamanı yeni sistemde aktarım anıdır. Özgün zaman için kaynak yedeği
  korunur; geçmiş denetim olayları uydurulmaz.
- Eski harici görsel adresleri, Google Place kimliği ve herkese açık telefon alanı
  taşınmaz. Kaynak yedek bu bilgileri korur; uzman bunları yeni veri minimizasyonu
  kararına göre yeniden düzenleyebilir.

## Geri dönüş

Önce sentetik/veri maskelenmiş bir kopyayla prova yapın. Kaynak dosya ve yeni
veritabanının şifreli yedeğini, uygulama şifreleme anahtarını ayrı erişimlerle koruyun.
Başarılı aktarımda satır sayıları, ilişkiler, saat dilimi, örnek kullanıcı erişimleri
ve çakışma kontrollerini doğrulayın. Kesinti sırasında geri dönüş gerekiyorsa
uygulama sürümüyle eşleşen veritabanı yedeğini geri yükleyin; iki uygulamayı aynı
anda yazmaya açmayın. Bu görevde canlı geçiş veya geçmiş temizliği yapılmadı.
