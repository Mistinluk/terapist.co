# GNU Make. Komutlar proje kökünden çalıştırılır.
# Araç yolları gerekirse değiştirilebilir: make kurulum UV=".../uv.exe"
.DEFAULT_GOAL := yardim
.DELETE_ON_ERROR:

UV ?= uv
PNPM ?= pnpm
DOCKER ?= docker

PY = $(UV) run --directory backend --locked --extra dev python
COMPOSE = $(DOCKER) compose -p terapist-docker -f deploy/compose.yml

.PHONY: yardim kurulum bagimliliklar ortam veritabani ornek api arayuz \
	yonetici test kontrol derle docker-baslat docker-ornek docker-durdur \
	baslat durdur durum docker-ortam docker-yonetici

yardim:
	@echo "make baslat          - Tum uygulamayi Docker ile baslat: http://localhost:8080"
	@echo "make durdur          - Docker uygulamasini durdur; verileri koru"
	@echo "make durum           - Docker servislerinin durumunu goster"
	@echo "make kurulum         - Bagimliliklar, yerel ayarlar ve veritabani"
	@echo "make api             - Python API: http://127.0.0.1:8000"
	@echo "make arayuz          - React: http://localhost:5173 (ikinci terminal)"
	@echo "make ornek           - Bos veritabanina kurgusal profiller ekle"
	@echo "make yonetici EPOSTA=adres@example.com - Yonetici hesabi olustur"
	@echo "make test            - Python ve React testlerini calistir"
	@echo "make kontrol         - Python ve React bicim denetimi"
	@echo "make derle           - TypeScript denetimi ve React derlemesi"
	@echo "make docker-baslat   - Yerel Docker uygulamasi: http://localhost:8080"
	@echo "make docker-ornek    - Bos Docker veritabanina kurgusal veri ekle"
	@echo "make docker-durdur   - Konteynerleri durdur; veri birimini koru"

# Bağımlılık kurulumu bitmeden ayarlar veya migration çalıştırılmaz.
# Bu sıra make -j ile çalıştırıldığında da korunur.
kurulum: bagimliliklar
	$(MAKE) veritabani

bagimliliklar:
	$(UV) sync --project backend --locked --extra dev
	$(PNPM) --dir frontend install --frozen-lockfile

# Mevcut .env dosyası hiçbir koşulda üzerine yazılarak yenilenmez.
ortam: backend/.env

backend/.env:
	$(PY) scripts/yerel_ayarlar.py

veritabani: ortam
	$(UV) run --directory backend --locked --extra dev alembic upgrade head

# Uygulamanın mevcut güvenlik kontrolü dolu tabloya örnek veri eklemez.
ornek: veritabani
	$(PY) -m app.cli demo

api: veritabani
	$(UV) run --directory backend --locked --extra dev uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log

arayuz:
	$(PNPM) --dir frontend dev --port 5173 --strictPort

yonetici: veritabani
	$(if $(strip $(EPOSTA)),,$(error EPOSTA gerekli: make yonetici EPOSTA=adres@example.com))
	$(PY) -m app.cli yonetici --email "$(EPOSTA)"

test:
	$(UV) run --directory backend --locked --extra dev pytest -q
	$(PNPM) --dir frontend test

kontrol:
	$(UV) run --directory backend --locked --extra dev ruff check .
	$(UV) run --directory backend --locked --extra dev ruff format --check .
	$(PNPM) --dir frontend format:check

derle:
	$(PNPM) --dir frontend build

baslat: docker-baslat

durdur: docker-durdur

durum:
	$(COMPOSE) ps

# Docker akisi bilgisayarda Python, uv, Node.js veya pnpm gerektirmez.
docker-ortam:
	$(DOCKER) run --rm --mount "type=bind,source=$(CURDIR)/backend,target=/calisma" -w /calisma python:3.12-slim python scripts/yerel_ayarlar.py

docker-baslat: docker-ortam
	$(COMPOSE) build
	$(COMPOSE) up -d --wait postgres redis
	$(COMPOSE) run --rm api alembic upgrade head
	$(COMPOSE) up -d --wait api web

docker-ornek:
	$(COMPOSE) run --rm api python -m app.cli demo

docker-durdur:
	$(COMPOSE) down

docker-yonetici:
	$(if $(strip $(EPOSTA)),,$(error EPOSTA gerekli: make docker-yonetici EPOSTA=adres@example.com))
	$(COMPOSE) exec api python -m app.cli yonetici --email "$(EPOSTA)"
