"""Ortam değişkenlerinden doğrulanan uygulama ayarları."""

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from cryptography.fernet import Fernet
from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    ortam: Literal["gelistirme", "test", "onizleme", "uretim"] = "gelistirme"
    # Docker geliştirmede de derlenmiş React dosyalarını sunar.
    arayuz_sunumu: Literal["vite", "derleme"] = "vite"
    # Açıkça yapılandırılır; eksik ayar sessizce SQLite'a düşmez.
    veritabani_url: str
    sifreleme_anahtari: SecretStr
    hiz_siniri_anahtari: SecretStr
    redis_url: str | None = None
    uygulama_adresi: str = "http://localhost:5173"
    guvenilir_hostlar: list[str] = ["localhost", "127.0.0.1", "testserver"]
    aydinlatma_surumu: str = "taslak-1"
    aydinlatma_metni: str = (
        "Geliştirme ortamı: yalnızca kurgusal bilgi kullanın. "
        "Adınız ve telefonunuz randevu talebinizin değerlendirilmesi "
        "için seçtiğiniz uzmana sunulur. Üretimden önce veri sorumlusu, "
        "işleme şartı, saklama süresi ve başvuru kanalı "
        "burada belirtilmelidir."
    )
    veri_sorumlusu: str = ""
    oturum_bos_suresi: int = 900
    oturum_azami_suresi: int = 28800
    # Google Takvim bağlantısı isteğe bağlıdır; kimlik ve sır birlikte
    # verilmedikçe panelde bağlantı düğmesi devre dışı kalır.
    google_istemci_kimligi: str = ""
    google_istemci_sirri: SecretStr = SecretStr("")
    # Boşsa {uygulama_adresi}/api/google-takvim/geri-donus kullanılır.
    # Google Cloud Console'daki yetkili yönlendirme adresiyle aynı olmalıdır.
    google_yonlendirme_adresi: str = ""
    # Anlık bildirim (webhook) adresi; HTTPS olmalıdır. Boşsa ve
    # uygulama_adresi HTTPS ise {uygulama_adresi}/api/google-takvim/webhook
    # kullanılır; yerel HTTP ortamında kapalı kalır.
    google_webhook_adresi: str = ""
    # Site geneli ölçüm ve Google Analytics Data API ayarları (isteğe bağlı;
    # yönetim panelinden çalışma zamanında da güncellenebilir).
    ga_olcum_kimligi: str = ""
    ga4_mulk_kimligi: str = ""
    google_analitik_yonlendirme_adresi: str = ""
    medya_dizini: str = ""

    @property
    def guvenli_yayin(self) -> bool:
        """İnternete açık önizlemede de HTTPS ve MFA zorunludur.

        Önizleme kurgusal verilerle çalışır; üretimin aydınlatma metni
        yerine geliştirme uyarısını gösterir. Güvenlik sınırları aynıdır.
        """
        return self.ortam in {"onizleme", "uretim"}

    @property
    def google_takvim_etkin(self) -> bool:
        return bool(
            self.google_istemci_kimligi.strip()
            and self.google_istemci_sirri.get_secret_value().strip()
        )

    @property
    def google_geri_donus_adresi(self) -> str:
        return (
            self.google_yonlendirme_adresi.strip()
            or self.uygulama_adresi.rstrip("/")
            + "/api/google-takvim/geri-donus"
        )

    @property
    def google_analitik_geri_donus_adresi(self) -> str:
        return (
            self.google_analitik_yonlendirme_adresi.strip()
            or self.uygulama_adresi.rstrip("/")
            + "/api/google-analitik/geri-donus"
        )

    @property
    def google_takvim_webhook_adresi(self) -> str | None:
        explicit = self.google_webhook_adresi.strip()
        if explicit:
            return explicit
        if self.uygulama_adresi.startswith("https://"):
            return (
                self.uygulama_adresi.rstrip("/") + "/api/google-takvim/webhook"
            )
        return None

    def kaynak_izinli(self, origin: str | None) -> bool:
        """Geliştirmede yalnızca aynı porttaki yerel adresleri eşleştirir."""
        if origin == self.uygulama_adresi:
            return True
        if self.ortam != "gelistirme" or not origin:
            return False
        try:
            address = urlsplit(self.uygulama_adresi)
            port = f":{address.port}" if address.port else ""
        except ValueError:
            return False
        if (
            address.scheme not in {"http", "https"}
            or address.hostname not in {"localhost", "127.0.0.1", "::1"}
            or address.path not in {"", "/"}
            or address.query
            or address.fragment
            or address.username
            or address.password
        ):
            return False
        return origin in {
            f"{address.scheme}://{host}{port}"
            for host in ("localhost", "127.0.0.1", "[::1]")
        }

    @model_validator(mode="after")
    def guvenligi_dogrula(self):
        Fernet(self.sifreleme_anahtari.get_secret_value().encode())
        if len(self.hiz_siniri_anahtari.get_secret_value()) < 32:
            raise ValueError(
                "Hız sınırı anahtarı en az 32 karakter olmalıdır."
            )
        if self.guvenli_yayin:
            if not self.veritabani_url.startswith("postgresql+psycopg://"):
                raise ValueError("Üretimde PostgreSQL gereklidir.")
            if not self.redis_url or not self.uygulama_adresi.startswith(
                "https://"
            ):
                raise ValueError("Üretimde Redis ve HTTPS gereklidir.")
            if self.ortam == "uretim" and (
                not self.veri_sorumlusu.strip()
                or not self.aydinlatma_surumu.strip()
                or self.aydinlatma_surumu == "taslak-1"
                or len(self.aydinlatma_metni.strip()) < 100
                or self.aydinlatma_metni.startswith("Geliştirme ortamı:")
            ):
                raise ValueError("Üretim aydınlatma metni hazırlanmalıdır.")
            if "*" in self.guvenilir_hostlar:
                raise ValueError("İzin verilen sunucular açıkça yazılmalıdır.")
            if (
                self.google_takvim_etkin
                and not self.google_geri_donus_adresi.startswith("https://")
            ):
                raise ValueError(
                    "Google Takvim yönlendirme adresi HTTPS olmalıdır."
                )
        if (
            self.google_webhook_adresi.strip()
            and not self.google_webhook_adresi.strip().startswith("https://")
        ):
            raise ValueError("Google Takvim webhook adresi HTTPS olmalıdır.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
