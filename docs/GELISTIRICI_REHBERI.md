# Geliştirici rehberi

Projeyi çalıştırmak için kök klasörde `make baslat` yeterlidir. Docker Desktop
açık olmalıdır. [localhost:8080](http://localhost:8080) arayüzünü açın;
`make durum` servisleri gösterir, `make durdur` verileri koruyarak durdurur.
Kod değişikliğinden sonra `make baslat` imajları yeniden derler. Docker imajında
çalışırken bilgisayardaki `.venv` kullanılmaz. `uv`, imajın Python
bağımlılıklarını kilit dosyasından kurar; Make bu adımlara kısa adlar verir.

## Bir isteğin izlediği yol

```text
React sayfası → lib/api.ts → /api/... → Nginx → FastAPI ara katmanları
  → Pydantic girdi doğrulaması → api/ uç noktası → iş kuralı → SQLAlchemy
  → PostgreSQL → Pydantic çıktı modeli → React
```

Docker dışında geliştirmede Nginx yerine Vite aynı kaynaklı API vekilini
sağlar. Tarayıcı doğrudan PostgreSQL veya Redis'e bağlanmaz. Ortam ayarları
`backend/app/config.py` tarafından doğrulanır; `.env` değerlerini kodun
her yerine dağıtmak yerine bu merkezi ayarlar kullanılır.

## Dosya sorumlulukları

| Dosya/klasör | Buraya ne eklenir? |
| --- | --- |
| `frontend/src/pages/` | Ekran akışları, form durumu ve sayfa bileşenleri |
| `frontend/src/components/` | Birden çok sayfanın kullandığı görsel parçalar |
| `frontend/src/lib/api.ts` | Ortak fetch davranışı, API tipleri ve biçimlendirme |
| `frontend/src/lib/useApi.ts` | Yükleniyor/hata/yenileme durumu; eski istek yanıtlarını eleme |
| `backend/app/main.py` | Uygulama kurulumu, router kaydı, kaynak/gövde/güvenlik ara katmanları |
| `backend/app/api/` | HTTP sözleşmesi, bağımlılıklar, yetki ve uç noktaya özgü işlemler |
| `backend/app/schemas.py` | Pydantic girdi/çıktı modelleri ve doğrulama sınırları |
| `backend/app/eslestirme.py` | Tercih puanı, kesin filtreler ve eşleşme açıklamaları |
| `backend/app/services.py` | Ortak profil görünürlüğü ve randevu zamanı kuralları |
| `backend/app/models.py` | SQLAlchemy tabloları, ilişkiler, indeksler ve kısıtlar |
| `backend/app/db.py` | Bağlantı havuzu, istek başına session ve commit/rollback |
| `backend/app/security.py` | Oturum, parola, TOTP, şifreleme ve hız sınırlaması |
| `backend/migrations/versions/` | Alembic şema değişiklikleri |
| `backend/tests/` | Yalıtılmış işlev, güvenlik ve entegrasyon senaryoları |

`legacy/` yalnızca eski PHP sürümünün başvuru kaynağıdır. Yeni uygulamadan
yüklenmez. [ER diyagramı ve tablo açıklamaları](VERITABANI.md) veri modelini gösterir.

## Örnek akışlar

**Eşleştirme:** `Directory.tsx` tercihleri React belleğinde tutar.
`matchingRequest` bunları JSON gövdesine dönüştürür; `useApi` anonim POST gönderir.
`api/matching.py` hız sınırını kontrol eder ve `uzman_eslestir` çağırır. Hizmet
zorunlu filtreleri uygular, bütün adayları SQL içinde puanlar ve sayfalar.
`EslesenProfil` yalnızca açık profil bilgilerini ve eşleşme açıklamasını döndürür.
Algoritmanın matematiği ve sınırları [ayrı belgede](ESLESTIRME.md) açıklanır.

**Randevu talebi:** danışan giriş yapmadan profilin müsait saatlerinden birini
seçer. `api/appointments.py` içindeki yazma işlemi profili kilitler, zamanı
yeniden denetler ve kişisel alanları şifreleyerek kaydeder. Müsait saat listesini
önceden görmek, o saati ayırmış olmak değildir. Eşzamanlı taleplere karşı hem
işlem/satır kilidi hem veritabanı kısıtları önemlidir. Danışan iletişim bilgilerini
açık profil yanıtına veya hata günlüklerine eklemeyin.

**Uzman hesabı:** başvuru, giriş ve TOTP akışı `api/auth.py` içindedir. Açık profil
ile hesabın oturumu farklı şeylerdir. Yönetim uçları sunucuda yetki kontrolü
yapar; arayüzde düğme gizlemek yetkilendirme değildir. Profil onayı ve arşiv
durumu, dizin ve randevu görünürlüğünü etkiler.

## Yeni bir davranış ekleme sırası

Önce HTTP girdisini ve beklenen çıktıyı tanımlayın. Pydantic modellerinde
uzunluk/aralık sınırlarını belirtin; model sözlüğünü doğrudan ORM alanlarına
kopyalamak yerine izin verilen alanları kullanın. Ortak iş kuralını ayrı bir
işlevde tutun, sonra router ve React akışına bağlayın. Hataları kullanıcıya Türkçe
anlatın; istisna metinleri veya gizli SQL parametrelerini yanıta koymayın.

Yeni eşleştirme ölçütü için önce şu ayrımı yapın: kesin eleme mi, puan tercihi mi?
Bir filtreyi sessizce puan uğruna gevşetmeyin. Girdi sınırını, SQL koşulunu,
kart açıklamasını ve boş/kenar durum testlerini birlikte değiştirin. Yeni tablo
veya kolon gerekiyorsa ORM değişikliği yanında Alembic geçişi hazırlayın;
uygulama açılırken üretim şemasını `create_all` ile yönetmeyin.

## Python stili ve açıklamalar

PEP 8 için Ruff ayarı 79 karakter sınırı, Python 3.12 hedefi ve
`E, F, I, UP, B` denetimlerini kullanır. Dört boşluk girinti, `snake_case`
işlev adları, ayrılmış import grupları ve yeni ortak işlevlerde tür ipuçları
kullanın. Açıklamalar Türkçe yazılır. Docstring'de işlevin amacı, yan etkisi,
önkoşulu ve önemli sınırı belirtilir; satırın zaten söylediğini tekrar eden
yorumlar eklenmez. Örneğin satır kilidinin neden gerekli olduğu açıklanmalıdır.

`ruff format` biçimi düzenler; `ruff check` ayrı çalışır. Ruff tek başına iş
kuralının doğruluğunu ispatlamaz: filtreyi aşan yüksek puan, sayfalama sınırı,
eşzamanlı randevu veya yetkisiz erişim gibi gözlenebilir davranışları test edin.

## Testleri çalıştırma

Bilgisayarınızda uv, Node.js ve pnpm varsa ilk kurulum `make kurulum`, normal
doğrulama ise aşağıdaki üç komuttur. Bu akışın ayrıntıları ve macOS kurulumu
[README](../README.md) içindedir:

```bash
make test
make kontrol
make derle
```

Eşleştirmeyi tek başına denetlemek için proje kökünde:

```bash
uv run --directory backend --extra dev pytest -q -p no:cacheprovider tests/test_matching.py
```

PostgreSQL JSON sorguları SQLite'tan farklı yürütüldüğü için, bu alandaki
değişiklikleri gerçek PostgreSQL üzerinde de çalıştırın. **Aşağıdaki adres
yalnızca geçici test veritabanıdır.** Testler tablolarını oluşturup kaldırır;
uygulama veritabanını burada kullanmayın. WSL Ubuntu veya macOS terminalinde,
proje kökünden:

```bash
docker compose -p terapist-dev-tests -f deploy/compose.test.yml up -d --wait
TEST_POSTGRES_URL='postgresql+psycopg://tester:yalnizca-yerel-test@127.0.0.1:55439/terapist_test' \
TEST_REDIS_URL='redis://127.0.0.1:56379/0' \
uv run --directory backend --extra dev pytest -q -p no:cacheprovider
docker compose -p terapist-dev-tests -f deploy/compose.test.yml down
```

PowerShell karşılığı README'nin test bölümündedir. WSL'de port erişimi ağ
ayarlarına bağlıdır. Yerel Docker profili ve test profili ayrı ad/port kullanır;
`down` komutunda hangi projeyi hedeflediğinizi koruyun.

`.env`, `.venv`, yedekler, test hesabı parolaları ve TOTP anahtarları Git'e
eklenmez. Kurgusal veriyi üretmek için `make docker-eslestirme` kullanılır;
hesap dosyalarının davranışı [veri seti rehberinde](ESLESTIRME_VERISI.md) anlatılır.
