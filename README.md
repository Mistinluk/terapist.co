# terapist.co — React ve Python sürümü

Türkçe uzman dizini, uzman başvurusu, profil yönetimi ve randevu uygulaması.
React 19 + TypeScript arayüzü, FastAPI + Pydantic 2 sunucusu, SQLAlchemy ve
Alembic kullanır. Varsayılan Docker kurulumu PostgreSQL ve Redis kullanır.
Python kodu 79 karakter sınırıyla Ruff / PEP 8 denetiminden geçer.

**Bu sürüm, KVKK uygunluğu belgesi veya HIPAA sertifikası değildir.** Kullanım
yalnızca Türkiye olarak belirlendi. Gerçek danışan verisine geçmeden önce
[uyum kapsamı](docs/KVKK_VE_GUVENLIK.md) ve [işletim gereklilikleri](docs/ISLETIM.md)
tamamlanmalıdır. Önizlemedeki kişiler kurgusaldır.

## Tek komutla çalıştırma

Docker Desktop açık olmalı; WSL kullanıyorsanız Ubuntu için Docker entegrasyonu
etkin olmalıdır. Proje kökünde:

```bash
make baslat
```

[Uygulamayı açın: localhost:8080](http://localhost:8080).
**Randevu talebi için üyelik veya giriş gerekmez.** Uzman hesabı, profil ve
randevu yönetimi içindir.

Bu komut PostgreSQL, Redis, API ve arayüzü birlikte hazırlar. Veritabanı
geçişlerini uygular ve servisler sağlıklı duruma gelene kadar bekler.
Bilgisayarınızda Python, uv, Node.js veya pnpm kurmanız gerekmez.
`make api` ve `make arayuz` bu Docker akışında kullanılmaz.

```bash
make durum   # Servislerin sağlık durumu
make durdur  # Uygulamayı kapat; PostgreSQL kayıtlarını koru
```

Yeni kodu aldıktan sonra tekrar `make baslat` çalıştırın. Veriler
`terapist-docker_veriler` adlı Docker veri biriminde saklanır.
[Docker ve PostgreSQL rehberi](docs/DOCKER.md).

## Dal ve çalışma kopyası

Tüm yeni çalışma `dev` dalındaki ayrı `terapist-dev` worktree'sindedir.
İlk `terapist.co` kopyası kesinti anındaki `refactor/react-fastapi-tr` dalında
bırakılmıştır. Geliştirmeler GitHub'daki `dev` dalına gönderilir; `main` dalı
değiştirilmemiştir.

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
│   ├── DOCKER.md                  # Tek komutla çalışma ve PostgreSQL geçişi
│   ├── diyagramlar/               # ER diyagramı: SVG ve Mermaid kaynağı
│   ├── VERITABANI.md              # Tablo ilişkileri, anahtarlar ve kısıtlar
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

## Veritabanı ER diyagramı

[![Veritabanı tabloları, anahtarları ve ilişkileri](docs/diyagramlar/veritabani.svg)](docs/diyagramlar/veritabani.svg)

Tam boyutta görmek için diyagrama tıklayın. `PK` birincil anahtarı, `FK` yabancı
anahtarı, `UK` benzersizlik kısıtını belirtir. Okunabilirlik için temel alanlar
gösterilmiştir. [Veritabanı rehberi](docs/VERITABANI.md), ilişki çokluklarını,
diğer alanları, randevu benzersizlik kuralını ve bağımsız denetim tablosunu açıklar.

## Docker kullanmadan geliştirme (isteğe bağlı)

Aşağıdaki adımlar önceki Python/Node.js geliştirme akışı içindir; Docker ile
çalıştırırken uygulanmaz. SQLite yalnızca bu isteğe bağlı geliştirme ve test
akışında kullanılır.

### macOS kurulumu ve çalıştırma

Bu adımları macOS **Terminal** uygulamasında, varsayılan `zsh` kabuğunda
çalıştırın. Yol ayarları Apple Silicon ve Intel için Homebrew konumunu otomatik
kullanır. Yerel geliştirme SQLite kullanır; PostgreSQL veya Docker kurulumu gerekmez.

**1. Geliştirme araçlarını hazırlayın.** Command Line Tools kurulu değilse:

```bash
xcode-select --install
```

Açılan kurulum tamamlandıktan sonra devam edin. Homebrew kurulu değilse
[resmî kurulum yönergesini](https://docs.brew.sh/Installation) izleyin; kurulum
sonundaki **Next steps** bölümünde verilen `shellenv` komutlarını da uygulayın.
Ardından yeni bir Terminal penceresi açıp araçları kurun:

```bash
brew install git node@24 uv make
```

Node.js 24 ve Homebrew GNU Make komutlarını `PATH` üzerine almak için aşağıdaki
iki satırı **bir kez** çalıştırın. İlk satır ayarı sonraki `zsh` oturumları için
saklar; ikinci satır mevcut terminale uygular.

```bash
echo 'export PATH="$(brew --prefix node@24)/bin:$(brew --prefix make)/libexec/gnubin:$PATH"' >> ~/.zshrc
export PATH="$(brew --prefix node@24)/bin:$(brew --prefix make)/libexec/gnubin:$PATH"
```

Projenin kullandığı pnpm sürümünü ve Python 3.12'yi kurup araçları doğrulayın:

```bash
npm install --global pnpm@11.19.0
uv python install 3.12
node --version
pnpm --version
uv --version
make --version
```

`node` çıktısı `v24.x`, `pnpm` çıktısı `11.19.0`, `make` çıktısı GNU Make olmalıdır.
Python sanal ortamını elle etkinleştirmek gerekmez; Makefile komutları `uv` kullanır.
Kurulum kaynakları: [Node.js 24](https://formulae.brew.sh/formula/node@24),
[GNU Make](https://formulae.brew.sh/formula/make),
[pnpm](https://pnpm.io/installation),
[uv ve Python](https://docs.astral.sh/uv/guides/install-python/).

**2. `dev` dalını ayrı bir klasöre indirin ve kurun.** Aşağıdaki komutlar
`~/Projects/terapist-dev` adlı yeni bir çalışma kopyası oluşturur. Bu klasör
zaten varsa klonlama adımını atlayıp mevcut `dev` çalışma kopyanıza geçin.

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone --branch dev https://github.com/Mistinluk/terapist.co.git terapist-dev
cd terapist-dev
git branch --show-current
UV_PYTHON=3.12 make kurulum
```

Dal çıktısı `dev` olmalıdır. Kurulum bağımlılıkları yükler, `backend/.env`
dosyasını yalnızca yoksa oluşturur ve veritabanı geçişlerini uygular. Boş
veritabanına kurgusal uzmanlar eklemek için isteğe bağlı `make ornek` çalıştırın.

**3. Uygulamayı iki terminalde başlatın.** Birinci terminal:

```bash
cd ~/Projects/terapist-dev
make api
```

Yeni bir Terminal sekmesinde (`⌘T`):

```bash
cd ~/Projects/terapist-dev
make arayuz
```

Tarayıcıda [http://localhost:5173](http://localhost:5173) adresini açın.
Her terminalde `Control+C` ilgili sunucuyu durdurur. Sonraki çalıştırmalarda
yalnızca bu iki başlatma komutu yeterlidir.

**4. Yönetici hesabı ve kontroller.** Proje kökünde, ayrı bir terminalde:

```bash
make yonetici EPOSTA=adres@example.com
make test
make kontrol
make derle
```

`adres@example.com` yerine kendi e-posta adresinizi yazın. Yönetici oluşturulurken
parola gizli sorulur; gösterilen MFA anahtarını doğrulama uygulamanıza ekleyin.

`brew`, `node` veya `make` bulunamazsa Homebrew **Next steps** ve yukarıdaki `PATH`
ayarlarını kontrol edip yeni terminal açın. `8000` veya `5173` portu doluysa önce
uygulamanın önceki terminalini `Control+C` ile durdurun. Giriş için tarayıcıda
`localhost:5173` kullanın; `127.0.0.1` ile değiştirmeyin.

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

Docker ile çalıştırma: `make baslat`, ardından
[uygulama](http://localhost:8080). Bu akışta uv/Python bilgisayarınızda gerekmez.
`make docker-ornek` yalnızca boş Docker veritabanına örnek veri ekler;
`make durdur` veri birimini silmeden konteynerleri kapatır.

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
`demo` komutu yalnızca boş uzman tablosuna beş kurgusal profil ekler:
Dr. Erdee Hasbutchu, Uzm. Psk. Whehbee Tosun, Uzm. Psk. Shaheen Tosun,
Psk. Cebele Malone ve Uzm. Psk. Cubala O'Neal.
Yeni oluşturulan örnek hesapların girişi varsayılan olarak kapalıdır;
paylaşılan sabit bir demo parolası yoktur.

Uzman girişindeki 6 haneli kod, hesabın kurulum anahtarını zaman tabanlı
(TOTP) hesap olarak eklediğiniz doğrulama uygulamasından alınır. Kod
30 saniyede bir yenilenir; SMS veya e-posta gönderilmez. Başarılı girişte
kullanılan kod tekrar kullanılamaz; bir sonraki kodu bekleyin. Kurulum
anahtarı ve parola Git'e veya bu belgeye eklenmemelidir.

Yeni uzmanlar `/basvuru` ekranından kaydolur. Sunucu her hesap için ayrı,
rastgele bir doğrulama anahtarı oluşturur ve veritabanında şifreli saklar.
Başvurudan sonra kullanıcıya kendi QR kodu gösterilir; Google Authenticator
ile tarayıp giriş ekranında uygulamanın ürettiği kodu kullanır. QR kod
tarayıcı içinde oluşturulur; dışarıdaki bir QR servisine gönderilmez.
Tarama yapılamıyorsa aynı ekrandaki “QR kodu tarayamıyorum” bölümünde elle
kurulum anahtarı bulunur. QR kod ve anahtar yalnızca başvuru sonucunda
gösterilir; sayfa yenilendiğinde veya kapatıldığında tekrar gösterilmez.

İkinci terminal:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

[Yerel arayüz](http://localhost:5173) adresini kullanın. `127.0.0.1` ile
`localhost` farklı kaynaklardır; `.env` içindeki `UYGULAMA_ADRESI` tarayıcı adresiyle
aynı olmalıdır. API istekleri Vite üzerinden aynı kaynaktan iletilir.

Geliştirme sunucusu `localhost:5173` adresini kullanır; yerel IP ile açılan
sayfaları otomatik olarak bu adrese yönlendirir. Port doluysa başka bir porta
geçmek yerine durur. **İstek kaynağı doğrulanamadı** hatası görürseniz
sayfayı `http://localhost:5173` üzerinden açın. Özel bir adres kullanıyorsanız
`backend/.env` içindeki `UYGULAMA_ADRESI` değerini o adresle eşleştirip API'yi
yeniden başlatın.

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

Proje kökünden:

```powershell
make baslat
```

[Docker önizlemesi](http://localhost:8080) yalnızca bu bilgisayardan erişilir.
Bu Compose dosyası geliştirme içindir; örnek parolalar ve HTTP içerir, üretime
taşınmamalıdır. `make durdur` konteynerleri durdurur; veri birimini korur.

Eski verileri otomatik taşımadım. Kaynak dosyada **106 uzman ve 2 randevu** bulundu;
ön kontrol, **uzman #6** için veri doğrulamasında durdu. [Geçiş kılavuzu](docs/GECIS.md)
doğrulama ve geri alma adımlarını açıklar.
