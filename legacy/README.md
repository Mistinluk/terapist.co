# Eski PHP uygulaması

Bu dizin yalnızca kaynak incelemesi ve geçiş referansıdır. HTTP sunucusunun
kök dizini olarak kullanılmamalıdır. Yeni Docker imajlarına dahil edilmez.

Buradaki güvenlik açıkları eski kaynakla karşılaştırma yapılabilmesi için
korunmuştur; yeni uygulama bu dosyaları çalıştırmaz. Sabit parolalar,
GET ile durum değiştirme ve eski giriş kontrolleri üretimde kullanılmamalıdır.

Eski SQLite dosyası yerel olarak korunur, yeni `dev` sürümüne eklenmez.
Git geçmişindeki bir dosya, yeni dalda kaldırılınca geçmişten silinmiş olmaz.
