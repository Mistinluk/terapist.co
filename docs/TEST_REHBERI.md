# Testleri okuma ve geliştirme

Her test dosyasının başında kapsamı, her Python senaryosunun docstring'inde
beklenen davranış açıklanır. Test adı hızlı taramak, açıklama ise hangi
regresyonun önlendiğini anlamak içindir. Kurulum ve komutlar
[geliştirici rehberinde](GELISTIRICI_REHBERI.md), tarihli sonuçlar
[doğrulama kaydında](DOGRULAMA.md) bulunur.

## Ortak ortam: `backend/tests/conftest.py`

`env` fixture'ı `(client, factory, ids, booking_id)` döndürür:

| Değer | Kullanım |
| --- | --- |
| `client` | Gerçek FastAPI uygulamasına bellek içinden HTTP isteği gönderir |
| `factory` | Yalıtılmış DB'ye erişir; önkoşul kurmak veya kalıcılığı denetlemek içindir |
| `ids` | İki kurgusal uzmanın profil kimlikleri |
| `booking_id` | Birinci uzmana ait kurgusal başlangıç talebi |

İki uzman ve bir yönetici her test için yeniden oluşturulur. `login(client, 0)`
birinci uzman, `1` ikinci uzman, `2` yönetici ile giriş yapar ve CSRF başlığını
hazırlar. MFA özellikle sınanmadığı sürece bu fixture hesaplarında kurulu
değildir. Sabit `PAROLA` yalnızca test verisidir; demo veya uygulama parolası değildir.

Ortam değişkenleri **uygulama import edilmeden önce** ayarlanır. Böylece ayar
önbelleği gerçek anahtarları almadan test anahtarları yüklenir. `get_db`
dependency override ile geçici session'a bağlanır. SQLite bellek DB'si
`StaticPool` kullanır; TestClient'in farklı iş parçacıkları aynı veriyi görür.

`TEST_POSTGRES_URL` verilirse `env` kullanan senaryolar ikinci kez PostgreSQL'de
çalışır. Yalnızca `127.0.0.1:55439/terapist_test` hedefi kabul edilir. Test sonunda
tablolar kaldırılır: gerçek uygulama DB'si kullanılamaz. PostgreSQL için aynı
test DB'sinde `pytest-xdist` gibi paralel çalıştırma yapılmamalıdır; ayrı worker
veritabanı altyapısı henüz yoktur. `monkeypatch` geçici ayar/dependency değişimini
test sonunda geri alır; `tmp_path` kurgusal dosyaları gerçek yedeklerden ayırır.

## Hangi dosya hangi davranışı korur?

| Dosya | Korunan davranış |
| --- | --- |
| `test_security.py` | Kimliksiz erişim, roller, CSRF/Origin, oturum, TOTP tekrarı, hız sınırı, veri sızıntısı |
| `test_appointments.py` | Üyesiz talep, zaman doğrulama, DB benzersizliği, iptal sonrası saatin açılması |
| `test_integration.py` | Başvuru → MFA → yönetici onayı, Türkçe arama, PostgreSQL yarış koşulu, ortak Redis kotası |
| `test_local_origin.py` | Yerel adres istisnası, üretim kaynak sınırı, DB kopukluğunda hazırlık yanıtı |
| `test_matching.py` | Puan ağırlıkları, kesin filtreler, açıklamalar, global sayfalama, iki sorgu, kayıt oluşturmama |
| `test_eslestirme_verisi.py` | 1.000 profil çeşitliliği, tekrar üretme, test hesabı MFA'sı, sır dosyasını koruma |
| `test_ornek_adresler.py` | Kurgusal açık adresler, idempotans, mevcut adres/hesap koruması ve üretim engeli |
| `frontend/src/forms.test.ts` | Form verisi dönüşümü ve Türkiye saati gösterimi |
| `frontend/src/matching.test.ts` | Çoklu tercih JSON'u ve boş/sıfır bütçe ayrımı |
| `frontend/src/location.test.tsx` | Maps URL kodlaması, yalnızca açık adres/bölge aktarımı, yeni sekme güvenliği, uzun URL |
| `frontend/tests/dev-origin.test.ts` | Gerçek Vite proxy'sinde yönlendirme ve Origin başlığının korunması |

## Bir test senaryosu nasıl okunur?

Örneğin `test_es_zamanli_postgresql_talepleri`, boş saati API'den alır;
iki ayrı istemciyle aynı saate eşzamanlı talep gönderir; durum kodlarının
`201` ve `409` olmasını bekler. Bu, yalnızca kodun bir dalını çalıştırmak için
değil, aynı saatin iki danışana ayrılmasını önlemek için vardır. SQLite'ın
kilitleme davranışı PostgreSQL yerine geçmediğinden o parametrede atlanır.

Yeni senaryoda önce yalnızca gerekli veriyi hazırlayın, sonra kullanıcının
yaptığı işlemi uygulayın ve gözlenebilir sonucu doğrulayın. Başarı yanında
uygun bir sınır veya hata durumunu seçin. SQL sorgusu kullanılabilir ama test
uygulama kodunun aynısını kopyalayıp yine kendisiyle karşılaştırmamalıdır.
Eşleştirme puanları bu nedenle elle hesaplanabilen iki kontrollü profille sınanır.

## Atlanan testler ve sınırlar

Tam SQLite/PostgreSQL/Redis koşusunda SQLite parametresinde bir eşzamanlılık
testi atlanır. Redis adresi verilmediyse Redis
testi de atlanır. `pytest -ra` gerekçeleri gösterir; bütün testlerin geçtiğini
söylemeden önce hangi ortamların gerçekten çalıştığını kontrol edin.

HTTP TestClient testleri tarayıcı yerleşimini doğrulamaz. Maps testleri Google'a
bağlanmaz ve arama sonucunun doğru bina olduğunu kanıtlamaz; URL sözleşmesini
denetler. Gerçek profildeki iş adresinin doğruluğu uzman tarafından sağlanır.
Test verileri klinik eşleştirme kalitesinin doğrulandığı anlamına gelmez.

Python açıklamaları PEP 8 satır sınırında tutulur; `ruff check` ve
`ruff format --check` test dosyaları için de çalıştırılır. Ön yüzde Prettier
biçimi, TypeScript derlemesi ve Vitest birlikte kontrol edilir.
