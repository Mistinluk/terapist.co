# terapist.co — React ve Python sürümü

Türkçe uzman dizini, uzman başvurusu, profil yönetimi ve randevu uygulaması.
React 19 + TypeScript arayüzü, FastAPI + Pydantic 2 sunucusu, SQLAlchemy ve
Alembic kullanır. Üretim için PostgreSQL ve Redis hedeflenmiştir; SQLite yalnızca
yerel geliştirme içindir. Python kodu 79 karakter sınırıyla Ruff / PEP 8 denetiminden geçer.

**Bu sürüm, KVKK uygunluğu belgesi veya HIPAA sertifikası değildir.** Kullanım
yalnızca Türkiye olarak belirlendi. Gerçek danışan verisine geçmeden önce
[uyum kapsamı](docs/KVKK_VE_GUVENLIK.md) ve [işletim gereklilikleri](docs/ISLETIM.md)
tamamlanmalıdır. Önizlemedeki kişiler kurgusaldır.

## Dal ve çalışma kopyası

Tüm yeni çalışma `dev` dalındaki ayrı `terapist-dev` worktree'sindedir.
İlk `terapist.co` kopyası kesinti anındaki `refactor/react-fastapi-tr` dalında
bırakılmıştır. `origin/main` ve uzak depo değiştirilmemiştir.

## Proje yapısı

Arayüz `frontend/`, Python sunucusu `backend/` altında bulunur. Aşağıdaki
ağaç, proje köküne göre temel dosyaları ve sorumluluklarını gösterir;
bağımlılık klasörleri, derleme çıktıları ve yerel veri dosyaları gösterilmemiştir.

```text
terapist.co/
├── README.md                      # Kurulum, çalıştırma ve proje rehberi
├── Makefile                       # Ortak kurulum, geliştirme ve kontrol komutları
├── .github/
│   └── workflows/
│       └── dogrulama.yml           # GitHub üzerinde otomatik doğrulama
│
├── frontend/                      # React + TypeScript arayüzü
│   ├── public/                    # Doğrudan sunulan statik dosyalar
│   ├── src/
│   │   ├── main.tsx               # React uygulamasının başlangıcı
│   │   ├── App.tsx                # Uygulama çatısı ve sayfa yönlendirmeleri
│   │   ├── styles.css             # Ortak görünüm ve duyarlı tasarım
│   │   ├── pages/                 # Kullanıcı akışlarını birleştiren sayfalar
│   │   │   ├── Directory.tsx      # Uzman dizini, arama ve filtreler
│   │   │   ├── Profile.tsx        # Uzman profili ve randevu talebi
│   │   │   ├── Apply.tsx          # Uzman başvurusu
│   │   │   ├── Login.tsx          # Giriş ve iki aşamalı doğrulama
│   │   │   ├── Dashboard.tsx      # Uzmanın profil ve randevu yönetimi
│   │   │   ├── Admin.tsx          # Yönetici işlemleri
│   │   │   └── Privacy.tsx        # Gizlilik bilgilendirmesi
│   │   ├── components/            # Sayfalar arasında paylaşılan bileşenler
│   │   │   ├── ProfileForm.tsx    # Ortak profil düzenleme formu
│   │   │   ├── Avatar.tsx         # Profil görseli
│   │   │   └── Status.tsx         # Yüklenme ve hata durumları
│   │   ├── lib/                   # Arayüzün ortak veri ve oturum yardımcıları
│   │   │   ├── api.ts             # API istemcisi, tipler ve biçimlendirme
│   │   │   ├── auth.tsx           # Oturum durumu ve erişim kontrolü
│   │   │   └── useApi.ts          # Veri yükleme ve yenileme kancası
│   │   └── forms.test.ts          # Form doğrulama testleri
│   ├── index.html                 # Tarayıcı giriş belgesi
│   ├── package.json               # JavaScript bağımlılıkları ve komutları
│   ├── pnpm-lock.yaml             # Sabitlenmiş bağımlılık sürümleri
│   ├── vite.config.ts             # Geliştirme sunucusu ve API vekili
│   ├── tsconfig.json              # TypeScript derleyici ayarları
│   ├── Dockerfile                 # Arayüz derleme ve sunum imajı
│   └── nginx.conf                 # Statik dosya sunumu ve API yönlendirmesi
│
├── backend/                       # FastAPI + Pydantic Python sunucusu
│   ├── app/
│   │   ├── main.py                # FastAPI uygulaması ve ara katmanlar
│   │   ├── api/                   # HTTP uç noktaları, iş alanına göre ayrılmış
│   │   │   ├── auth.py            # Başvuru, giriş, MFA ve oturum
│   │   │   ├── profiles.py        # Uzman arama ve profil işlemleri
│   │   │   ├── appointments.py    # Randevu talebi ve durum değişiklikleri
│   │   │   └── admin.py           # Yönetici onayı, arşivleme ve denetim
│   │   ├── schemas.py             # Pydantic istek/yanıt doğrulaması
│   │   ├── models.py              # SQLAlchemy veritabanı modelleri
│   │   ├── db.py                  # Veritabanı bağlantısı ve oturumları
│   │   ├── services.py            # Ortak profil ve randevu iş kuralları
│   │   ├── security.py            # Şifreleme, oturum, CSRF ve yetkilendirme
│   │   ├── config.py              # Doğrulanan ortam ayarları
│   │   └── cli.py                 # Yönetici, hesap kurtarma ve örnek veri komutları
│   ├── migrations/
│   │   ├── env.py                 # Alembic çalışma ortamı
│   │   └── versions/              # Sürümlenmiş veritabanı şema değişiklikleri
│   ├── scripts/
│   │   ├── yerel_ayarlar.py        # Yerel .env dosyasını güvenle oluşturma
│   │   └── eski_veri_aktar.py      # Eski verilerin kontrollü aktarımı
│   ├── tests/                     # Güvenlik, randevu, geçiş ve entegrasyon testleri
│   ├── .env.example               # Ortam değişkenleri için örnek şablon
│   ├── pyproject.toml             # Python bağımlılıkları, Ruff ve test ayarları
│   ├── uv.lock                    # Sabitlenmiş Python bağımlılık sürümleri
│   ├── alembic.ini                # Şema geçişi ayarları
│   └── Dockerfile                 # API sunucusu imajı
│
├── deploy/                        # Yerel konteyner ortamları
│   ├── compose.yml                # Arayüz, API, PostgreSQL ve Redis
│   └── compose.test.yml           # Ayrılmış PostgreSQL/Redis test ortamı
├── docs/                          # Teknik ve operasyonel belgeler
│   ├── KOD_INCELEMESI.md           # Eski kod bulguları ve mimari kararlar
│   ├── GECIS.md                    # Veri aktarımı ve geri alma adımları
│   ├── ISLETIM.md                  # Dağıtım ve işletim gereklilikleri
│   ├── KVKK_VE_GUVENLIK.md         # Uyum kapsamı ve güvenlik gereklilikleri
│   └── DOGRULAMA.md                # Test ve doğrulama sonuçları
└── legacy/                        # Referans için saklanan eski PHP kaynakları
```

**Nerede değişiklik yapmalıyım?** Sayfa akışları `frontend/src/pages/`, ortak
görsel parçalar `frontend/src/components/` altında geliştirilir. Sunucuda HTTP
işlemleri `backend/app/api/`, ortak iş kuralları `services.py`, veri doğrulaması
`schemas.py` içindedir. Veritabanı yapısı değiştiğinde `models.py` ile birlikte
`backend/migrations/versions/` altında bir Alembic geçişi hazırlanır.

`backend/.env` yerel kurulumda oluşturulur ve Git'e eklenmez. `legacy/` yeni
uygulama tarafından çalıştırılmaz; eski sistemden geçiş için başvuru kaynağıdır.

## Yerel çalıştırma

### Makefile ile

GNU Make, uv, Node.js ve pnpm komutları `PATH` üzerinde bulunmalıdır. Windows'ta
GNU Make ayrıca kurulmalıdır; PowerShell'in yerleşik komutu değildir. Araç yolu
gerekiyorsa örneğin `make kurulum UV="C:/araclar/uv.exe"` kullanabilirsiniz.

Proje kökünden ilk kurulum:

```powershell
make kurulum
```

Bu hedef kilitli bağımlılıkları kurar, yalnızca yoksa `backend/.env` dosyasını
oluşturur ve Alembic geçişlerini uygular. Mevcut anahtarları veya verileri ezmez.
Boş veritabanına örnek profiller eklemek için isteğe bağlı `make ornek` çalıştırın;
hazırlanmış çalışma kopyasında örnek veriler zaten vardır.

Birinci terminalde API:

```powershell
make api
```

Aynı proje kökünde ikinci terminalde arayüz:

```powershell
make arayuz
```

[Uygulamayı açın](http://localhost:5173). Her iki terminalde `Ctrl+C` ilgili
sunucuyu durdurur. `make yonetici EPOSTA=adres@example.com` yönetici hesabı
oluşturur; parola terminalde gizli sorulur. `make test`, `make kontrol` ve
`make derle` doğrulama komutlarıdır. Tüm hedefleri `make yardim` gösterir.

Docker alternatifi: `make docker-baslat`, ardından
[Docker önizlemesi](http://localhost:8080). Bu hedef de ilk `.env` oluşturulurken
uv/Python gerektirir. `make docker-ornek` yalnızca boş Docker veritabanına örnek
veri ekler; `make docker-durdur` veri birimini silmeden konteynerleri kapatır.

### Komutları doğrudan çalıştırma

Gereksinimler: Python 3.12+, Node.js 22+ ve pnpm 11.19.0; Python paketleri için
uv 0.12.13. `uv.lock` ve `pnpm-lock.yaml` sürümleri sabitler.

Sunucu terminali, proje kökünden:

```powershell
cd backend
uv sync --locked --extra dev
uv run python scripts/yerel_ayarlar.py
uv run alembic upgrade head
uv run python -m app.cli demo
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

`yerel_ayarlar.py` rastgele anahtarlarla `.env` oluşturur; mevcut dosyayı ezmez.
`demo` komutu yalnızca boş uzman tablosuna altı kurgusal profil ekler.
Bu örnek hesapların girişi kapalıdır. Çalışan önizlemede bu adımlar tamamlanmıştır.

İkinci terminal:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

[Yerel arayüz](http://localhost:5173) adresini kullanın. `127.0.0.1` ile
`localhost` farklı kaynaklardır; `.env` içindeki `UYGULAMA_ADRESI` tarayıcı adresiyle
aynı olmalıdır. API istekleri Vite üzerinden aynı kaynaktan iletilir.

Yeni uzman için **Uzman olarak katıl** ekranını doldurun, gösterilen TOTP anahtarını
doğrulama uygulamanıza ekleyin ve giriş yapın. Yönetici hesabı terminalden oluşturulur:

```powershell
cd backend
uv run python -m app.cli yonetici --email yonetici@example.com
```

Komut parolayı görünmeden iki kez sorar, MFA anahtarını bir kez gösterir.
Sabit veya varsayılan yönetici hesabı yoktur. Kaybedilen erişim için, kişinin kimliği
ayrı kanaldan doğrulandıktan sonra `kurtar --email ...` kullanılır; tüm oturumlar iptal edilir.

## İşlevler

- Uzman arama; şehir, destek alanı, ekol, danışan grubu, format ve deneyim filtreleri;
  ücret sıralaması ve sunucu tarafında sayfalama.
- Onaylı uzman profili, çalışma saatleri ve meslektaş tavsiyesi.
- Türkiye saatine göre 15 günlük takvim; bir saatlik randevu talepleri.
- Uzman başvurusu, Argon2id parola özeti, TOTP ve süreli çerez oturumu.
- Uzmanın kendi randevularını görmesi, onaylaması, reddetmesi ve iptal etmesi.
- Ortak form üzerinden profil, eğitim, ücret ve haftalık saatlerin düzenlenmesi.
  Ad veya eğitim değişince profil yeniden onaya gider.
- Yönetici onayı, profil düzenleme, kayıtları koruyarak arşivleme, sayısal özet ve denetim.
  Açık randevusu olan uzman arşivlenemez.

Yeni randevu formunda serbest sağlık/terapi notu toplanmaz. Eski Google yorumları
bağlantısı zaten anahtar yer tutucusuydu; yeni uygulamaya eklenmedi. Dış avatar,
font ve CDN istekleri kaldırıldı. Ayrıntılar [kod incelemesinde](docs/KOD_INCELEMESI.md).

## Test ve derleme

```powershell
cd backend
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
cd ../frontend
pnpm build
pnpm test
pnpm audit --prod
```

Gerçek PostgreSQL/Redis ile test:

```powershell
docker compose -p terapist-dev-tests -f deploy/compose.test.yml up -d --wait
cd backend
$env:TEST_POSTGRES_URL='postgresql+psycopg://tester:yalnizca-yerel-test@127.0.0.1:55439/terapist_test'
$env:TEST_REDIS_URL='redis://127.0.0.1:56379/0'
uv run pytest -q
cd ..
docker compose -p terapist-dev-tests -f deploy/compose.test.yml down
```

Bu komutlar ayrılmış, geçici test veritabanını kullanır. Testler bu veritabanının
tablolarını oluşturup kaldırır; gerçek veritabanı adresi verilmemelidir.

## Docker ile yerel çalışma

Önce `backend/.env` dosyasını yukarıdaki komutla oluşturun. Proje kökünden:

```powershell
docker compose -p terapist-dev-preview -f deploy/compose.yml build
docker compose -p terapist-dev-preview -f deploy/compose.yml up -d postgres redis
docker compose -p terapist-dev-preview -f deploy/compose.yml run --rm api alembic upgrade head
docker compose -p terapist-dev-preview -f deploy/compose.yml run --rm api python -m app.cli demo
docker compose -p terapist-dev-preview -f deploy/compose.yml up -d api web
```

[Docker önizlemesi](http://localhost:8080) yalnızca bu bilgisayardan erişilir.
Bu Compose dosyası geliştirme içindir; örnek parolalar ve HTTP içerir, üretime
taşınmamalıdır. `down` yerel konteynerleri durdurur; veri birimini korur.

Eski verileri otomatik taşımadım. Kaynak dosyada **106 uzman ve 2 randevu** bulundu;
ön kontrol, **uzman #6** için veri doğrulamasında durdu. [Geçiş kılavuzu](docs/GECIS.md)
doğrulama ve geri alma adımlarını açıklar.
