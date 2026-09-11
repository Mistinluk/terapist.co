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

## Dizinler

```text
frontend/
  src/pages/          Sayfa akışları
  src/components/     Ortak profil formu, avatar, yüklenme/hata bileşenleri
  src/lib/            API istemcisi, oturum, tipler ve Türkçe biçimlendirme
backend/
  app/api/            Oturum, uzman, randevu ve yönetim uç noktaları
  app/models.py       Veritabanı modelleri
  app/schemas.py      Pydantic istek/yanıt sözleşmeleri
  app/security.py     Şifreleme, oturum, CSRF, hız sınırı ve yetki bağımlılıkları
  app/services.py     Takvim ve ortak iş kuralları
  app/config.py       Doğrulanan ortam ayarları
  migrations/         Sürümlü Alembic şema geçişleri
  scripts/            Yerel ayarlar ve kontrollü eski veri aktarımı
  tests/              Güvenlik ve entegrasyon testleri
deploy/               Yerel Docker ve ayrılmış entegrasyon testi ortamları
docs/                 Kod incelemesi, geçiş, işletim ve uyum belgeleri
legacy/               Çalıştırılmayan eski PHP kaynakları
```

## Yerel çalıştırma

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
