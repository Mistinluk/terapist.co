# Veritabanı modeli

Bu ER diyagramı mevcut [SQLAlchemy modellerini](../backend/app/models.py) ve
[ilk Alembic geçişini](../backend/migrations/versions/9100372fb039_ilk_sema.py)
gösterir. Okunabilirlik için kullanıcı ve uzman tablolarında temel alanlar
seçilmiştir; diğer alanlar aşağıda açıklanır. Tablo adları kodla aynıdır.

[![Altı tabloyu, anahtarlarını ve aralarındaki ilişkileri gösteren ER diyagramı](diyagramlar/veritabani.svg)](diyagramlar/veritabani.svg)

Diyagrama tıklayarak tam boyutta açabilirsiniz. SVG yakınlaştırıldığında
netliğini korur. Düzenlenebilir kaynak: [veritabani.mmd](diyagramlar/veritabani.mmd).

## Diyagramı okuma

| Gösterim | Anlamı |
| --- | --- |
| `PK` | Birincil anahtar; satırı benzersiz tanımlar. |
| `FK` | Veritabanının denetlediği yabancı anahtar. |
| `UK` | Benzersizlik kısıtı. |
| `||` | Tam olarak bir kayıt. |
| `o|` | Sıfır veya bir kayıt. |
| `o{` | Sıfır veya daha fazla kayıt. |
| Kesik ilişki çizgisi | Yabancı anahtar, alt tablonun birincil anahtarının parçası değildir. |
| Düz ilişki çizgisi | Yabancı anahtar, alt tablonun birincil anahtarının parçasıdır. |

Kesik çizgi de gerçek bir yabancı anahtar ilişkisini gösterir. İlişkinin
isteğe bağlı olup olmadığını uçlardaki işaretler belirtir.

## İlişkiler ve kısıtlar

| İlişki | Veritabanındaki karşılığı |
| --- | --- |
| Kullanıcı → uzman | Bir kullanıcının en fazla bir uzman profili olabilir. Her uzman tam olarak bir kullanıcıya bağlıdır; `uzmanlar.kullanici_id` zorunlu ve benzersizdir. |
| Kullanıcı → oturum | Kullanıcının sıfır veya çok sayıda oturumu olabilir. Her oturum tam olarak bir kullanıcıya bağlıdır. |
| Uzman → randevu | Uzmanın sıfır veya çok sayıda randevusu olabilir. Her randevu tam olarak bir uzmana bağlıdır. |
| Uzman → tavsiye | Her tavsiyenin bir veren ve bir alan uzmanı vardır. İki FK de `uzmanlar.id` alanını gösterir. `(veren_id, alan_id)` birleşik birincil anahtardır; aynı yönlü çift tekrarlanamaz. |
| Denetim | `kullanici_id` ve `kaynak_id` isteğe bağlı metin referanslarıdır; FK kısıtları yoktur. Bu nedenle diyagramda başka bir tabloya ilişki çizilmez. |

`uq_aktif_randevu` kısmi benzersiz indeksi, aynı `(uzman_id, baslangic)` çifti
için `bekliyor` veya `onaylandi` durumunda en fazla bir randevuya izin verir.
Bu, bütün randevu durumlarına uygulanan genel bir benzersizlik kuralı değildir.

## Alanların kapsamı

| Tablo | Saklanan bilgiler |
| --- | --- |
| `kullanicilar` | Kimlik, benzersiz e-posta, parola özeti, rol, etkinlik ve şifreli MFA sırrı. Diyagramda gösterilmeyen `son_mfa_adimi`, aynı TOTP adımının tekrar kullanımını denetler. |
| `uzmanlar` | Kullanıcı bağlantısı, profil ve yayın durumu. Diyagramda gösterilmeyen metin/sayı alanları: `ilce`, `biyografi`, `deneyim_yili`, `adres`. Ek JSON alanları: `ekoller`, `kitle`, `formatlar`, `uzmanliklar`, `egitim`, `kurumlar`. |
| `oturumlar` | Ham oturum belirteci yerine özeti, kullanıcı bağlantısı, CSRF özeti ve zamanlar. |
| `randevular` | Uzman bağlantısı, başlangıç zamanı, şifreli danışan adı/telefonu, durum, oluşturma zamanı ve aydınlatma metninin sürümü. |
| `tavsiyeler` | Uzmanlar arasındaki yönlü tavsiye bağlantıları. |
| `denetim` | İşlem türü, zaman ve isteğe bağlı kullanıcı/kaynak referansları. |

`id` alanları UUID değerlerini metin olarak tutar; oturumların anahtarı
belirteç özetidir. JSON alanları ayrı ilişkisel tablolar değildir.
Zaman alanları Unix saniye olarak tutulur; randevu gösterimi Türkiye saatine göre yapılır.

Ayrı bir `danisanlar` tablosu yoktur: randevu formundaki ad ve telefon,
`randevular.danisan_sifreli` içinde şifreli olarak saklanır. Diyagramda veri
değerleri veya gerçek danışan bilgileri bulunmaz.

## Diyagramı güncelleme

Şema değiştiğinde Mermaid kaynağını ve bu açıklamaları birlikte güncelleyin.
Proje kökünde aşağıdaki komut SVG'yi yeniden üretir; ilk kullanımda çizim aracı
ve tarayıcı bileşenleri indirilir. Bu araç uygulamayı çalıştırmak için gerekmez.

```bash
npm exec --yes --package=@mermaid-js/mermaid-cli@11.17.0 -- mmdc -i docs/diyagramlar/veritabani.mmd -o docs/diyagramlar/veritabani.svg -b white
```
