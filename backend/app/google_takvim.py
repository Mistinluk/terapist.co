"""Google Takvim OAuth istemcisi ve dolu/müsait zaman eşitlemesi.

Bağlantı yalnız iki kapsam ister: FreeBusy (zaman aralıkları) ve takvim
listesi (uzmanın hangi takvimlerin kontrol edileceğini seçebilmesi). Etkinlik
başlığı, açıklaması, konumu veya katılımcıları okunmaz; Google bu kapsamlarla
bu alanları zaten döndürmez. HTTP için standart kütüphane kullanılır; testler
`google_istemcisi` nesnesini taklit eder.

Herkese açık saat listesi her istekte Google'a gitmez: son deneme verilen
tazelik süresinden eskiyse eşitlenir, aksi hâlde veritabanındaki son aralıklar
kullanılır. Geçici hatalarda son bilinen aralıklar korunur; Google yetkiyi
geri aldığında bağlantı 'koptu' durumuna geçer ve panelde yeniden bağlanma
istenir.
"""

import base64
import hashlib
import json
import secrets
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import GoogleTakvimBaglantisi, GoogleTakvimKanali, Uzman
from app.security import coz, ozet, sifrele

YETKI_ADRESI = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ADRESI = "https://oauth2.googleapis.com/token"
IPTAL_ADRESI = "https://oauth2.googleapis.com/revoke"
API = "https://www.googleapis.com/calendar/v3"
KAPSAM_DOLULUK = "https://www.googleapis.com/auth/calendar.freebusy"
KAPSAM_ETKINLIK_DOLULUK = (
    "https://www.googleapis.com/auth/calendar.events.freebusy"
)
KAPSAM_LISTE = "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
KAPSAMLAR = ("openid", "email", KAPSAM_ETKINLIK_DOLULUK, KAPSAM_LISTE)
# Herkese açık saat listesi bugün dahil 15 günü kapsar.
ESITLEME_GUNU = 16
AZAMI_TAKVIM = 20
ZAMAN_ASIMI = 6
# Kanal bitimine 24 saatten az kaldığında yenilenir (Google sınırı ~7 gün).
KANAL_YENILEME_SURESI = 86400
KANAL_VARSAYILAN_SURESI = 7 * 86400
# Ardışık webhook bildirimlerinde freeBusy kotasını korumak için bekleme.
WEBHOOK_ESITLEME_ARALIGI = 15

HATA_MESAJLARI = {
    "yetki_kaldirildi": (
        "Google Takvim izni kaldırılmış. Bağlantıyı yeniden kurun."
    ),
    "izin_eksik": (
        "Takvim izinleri verilmedi. Bağlarken iki takvim iznini de onaylayın."
    ),
    "baglanti": "Google Takvim'e şu anda ulaşılamıyor. Biraz sonra deneyin.",
    "gecersiz_yanit": "Google Takvim yanıtı okunamadı. Biraz sonra deneyin.",
    "takvim_erisimi": (
        "Seçili takvimlerden biri okunamadı. Takvim seçiminizi kontrol edin."
    ),
}


class GoogleHatasi(Exception):
    """Kullanıcıya gösterilebilir hata kodu; ham Google yanıtı taşımaz."""

    def __init__(self, kod: str):
        super().__init__(kod)
        self.kod = kod


def _zaman(value: str) -> int:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return int(parsed.timestamp())


def _rfc3339(value: int) -> str:
    return (
        datetime.fromtimestamp(value, UTC).isoformat().replace("+00:00", "Z")
    )


def birlestir(araliklar: list[list[int]]) -> list[list[int]]:
    """Çakışan veya bitişik aralıkları sıralı tek listede birleştirir."""
    result: list[list[int]] = []
    for start, end in sorted(
        [int(a), int(b)] for a, b in araliklar if int(b) > int(a)
    ):
        if result and start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])
    return result


def pkce_cifti() -> tuple[str, str]:
    """RFC 7636 S256 doğrulayıcı ve meydan okuma değerini üretir."""
    verifier = secrets.token_urlsafe(64)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


def _ssl_baglami() -> ssl.SSLContext:
    """macOS gibi sistem sertifikası eksik ortamlarda certifi kullanır."""
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


class GoogleIstemcisi:
    """Google OAuth ve Calendar REST uçları için küçük, senkron istemci."""

    def _istek(
        self,
        url: str,
        *,
        form: dict | None = None,
        govde: dict | None = None,
        erisim: str | None = None,
    ) -> dict:
        headers = {"Accept": "application/json"}
        data = None
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        elif govde is not None:
            data = json.dumps(govde).encode()
            headers["Content-Type"] = "application/json"
        if erisim:
            headers["Authorization"] = f"Bearer {erisim}"
        request = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(
                request, timeout=ZAMAN_ASIMI, context=_ssl_baglami()
            ) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as exc:
            try:
                body = json.loads(exc.read() or b"{}")
            except ValueError:
                body = {}
            error = body.get("error")
            if isinstance(error, dict):
                reason = str(error.get("status", ""))
            else:
                reason = str(error or "")
            if reason in {"invalid_grant", "unauthorized_client"}:
                raise GoogleHatasi("yetki_kaldirildi") from None
            if exc.code == 403:
                raise GoogleHatasi("izin_eksik") from None
            raise GoogleHatasi("baglanti") from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise GoogleHatasi("baglanti") from None
        try:
            return json.loads(raw or b"{}")
        except ValueError:
            raise GoogleHatasi("gecersiz_yanit") from None

    def yetki_adresi(self, state: str, challenge: str) -> str:
        settings = get_settings()
        query = urllib.parse.urlencode(
            {
                "client_id": settings.google_istemci_kimligi,
                "redirect_uri": settings.google_geri_donus_adresi,
                "response_type": "code",
                "scope": " ".join(KAPSAMLAR),
                "access_type": "offline",
                "include_granted_scopes": "true",
                "prompt": "consent select_account",
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{YETKI_ADRESI}?{query}"

    def kod_degistir(self, code: str, verifier: str) -> dict:
        settings = get_settings()
        return self._istek(
            TOKEN_ADRESI,
            form={
                "code": code,
                "client_id": settings.google_istemci_kimligi,
                "client_secret": (
                    settings.google_istemci_sirri.get_secret_value()
                ),
                "redirect_uri": settings.google_geri_donus_adresi,
                "grant_type": "authorization_code",
                "code_verifier": verifier,
            },
        )

    def erisim_yenile(self, refresh_token: str) -> dict:
        settings = get_settings()
        return self._istek(
            TOKEN_ADRESI,
            form={
                "refresh_token": refresh_token,
                "client_id": settings.google_istemci_kimligi,
                "client_secret": (
                    settings.google_istemci_sirri.get_secret_value()
                ),
                "grant_type": "refresh_token",
            },
        )

    def iptal_et(self, token: str) -> None:
        try:
            self._istek(IPTAL_ADRESI, form={"token": token})
        except GoogleHatasi:
            # Yerel kayıt yine silinir; kullanıcı Google hesabından da
            # erişimi kaldırabilir.
            pass

    def takvimler(self, erisim: str) -> list[dict]:
        query = urllib.parse.urlencode(
            {
                "minAccessRole": "freeBusyReader",
                "maxResults": 250,
                "fields": "items(id,summary,summaryOverride,primary)",
            }
        )
        body = self._istek(
            f"{API}/users/me/calendarList?{query}", erisim=erisim
        )
        result = []
        for item in body.get("items", [])[:250]:
            calendar_id = str(item.get("id", ""))[:300]
            if not calendar_id:
                continue
            name = item.get("summaryOverride") or item.get("summary") or ""
            result.append(
                {
                    "id": calendar_id,
                    "ad": str(name)[:120] or calendar_id,
                    "birincil": bool(item.get("primary")),
                }
            )
        result.sort(key=lambda c: (not c["birincil"], c["ad"].casefold()))
        return result

    def dolu_zamanlar(
        self, erisim: str, takvim_idleri: list[str], bas: int, bit: int
    ) -> dict[str, list[list[int]]]:
        if not takvim_idleri:
            return {}
        body = self._istek(
            f"{API}/freeBusy",
            erisim=erisim,
            govde={
                "timeMin": _rfc3339(bas),
                "timeMax": _rfc3339(bit),
                "timeZone": "UTC",
                "items": [{"id": value} for value in takvim_idleri],
            },
        )
        calendars = body.get("calendars")
        if not isinstance(calendars, dict):
            raise GoogleHatasi("gecersiz_yanit")
        result = {}
        for calendar_id in takvim_idleri:
            item = calendars.get(calendar_id) or {}
            if item.get("errors"):
                raise GoogleHatasi("takvim_erisimi")
            try:
                result[calendar_id] = birlestir(
                    [
                        [_zaman(b["start"]), _zaman(b["end"])]
                        for b in item.get("busy", [])
                    ]
                )
            except (KeyError, TypeError, ValueError):
                raise GoogleHatasi("gecersiz_yanit") from None
        return result

    def izle(
        self,
        erisim: str,
        takvim_id: str,
        kanal_id: str,
        adres: str,
        token: str,
    ) -> dict:
        """Belirtilen takvim için Google push notification (watch) kurar."""
        encoded = urllib.parse.quote(takvim_id, safe="")
        return self._istek(
            f"{API}/calendars/{encoded}/events/watch",
            erisim=erisim,
            govde={
                "id": kanal_id,
                "type": "web_hook",
                "address": adres,
                "token": token,
            },
        )

    def izlemeyi_durdur(
        self, erisim: str, kanal_id: str, kaynak_id: str
    ) -> None:
        """Etkin Google push notification kanalını sonlandırır."""
        if not kaynak_id:
            return
        try:
            self._istek(
                f"{API}/channels/stop",
                erisim=erisim,
                govde={"id": kanal_id, "resourceId": kaynak_id},
            )
        except GoogleHatasi:
            # Kanal süresi dolmuş veya zaten durdurulmuş olabilir.
            pass


google_istemcisi = GoogleIstemcisi()


def id_token_email(id_token: str) -> str:
    """Token ucundan TLS ile doğrudan gelen kimlik belirtecindeki e-posta.

    OpenID Connect Core 3.1.3.7 uyarınca token ucundan doğrudan alınan
    belirteç için imza doğrulaması zorunlu değildir; yine de hedef kitle
    ve yayıncı denetlenir.
    """
    try:
        payload = id_token.split(".")[1]
        claims = json.loads(
            base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))
        )
    except (IndexError, ValueError):
        raise GoogleHatasi("gecersiz_yanit") from None
    if claims.get("aud") != get_settings().google_istemci_kimligi or (
        claims.get("iss")
        not in {"https://accounts.google.com", "accounts.google.com"}
    ):
        raise GoogleHatasi("gecersiz_yanit")
    return str(claims.get("email", ""))[:254]


def kapsamlar_tamam(scope: str) -> bool:
    granted = set(scope.split())
    has_busy = bool({KAPSAM_DOLULUK, KAPSAM_ETKINLIK_DOLULUK} & granted)
    return has_busy and KAPSAM_LISTE in granted


def baglanti_bul(db: Session, uzman_id: str) -> GoogleTakvimBaglantisi | None:
    return db.scalar(
        select(GoogleTakvimBaglantisi).where(
            GoogleTakvimBaglantisi.uzman_id == uzman_id
        )
    )


def hesap(baglanti: GoogleTakvimBaglantisi) -> dict:
    return coz(baglanti.hesap_sifreli)


def erisim_anahtari(baglanti: GoogleTakvimBaglantisi, now: int) -> str:
    """Süresi dolmak üzereyse erişim anahtarını yenileyip döndürür."""
    tokens = coz(baglanti.token_sifreli)
    if tokens.get("access_token") and tokens.get("bitis", 0) > now + 60:
        return tokens["access_token"]
    fresh = google_istemcisi.erisim_yenile(tokens["refresh_token"])
    if not fresh.get("access_token"):
        raise GoogleHatasi("gecersiz_yanit")
    tokens.update(
        access_token=fresh["access_token"],
        bitis=now + int(fresh.get("expires_in", 3600)),
    )
    if fresh.get("refresh_token"):
        tokens["refresh_token"] = fresh["refresh_token"]
    baglanti.token_sifreli = sifrele(tokens)
    return tokens["access_token"]


def esitle(
    baglanti: GoogleTakvimBaglantisi,
    now: int | None = None,
    takvim_listesi: bool = False,
) -> None:
    """Seçili takvimlerin dolu ve müsaitlik aralıklarını Google'dan alır.

    Hata yükseltmez; sonucu son_hata/durum alanlarına yazar. Çağıran
    veritabanı işlemini tamamlamalıdır.
    """
    now = now or int(time.time())
    baglanti.son_deneme = now
    baglanti.guncelleme = now
    try:
        access = erisim_anahtari(baglanti, now)
        account = hesap(baglanti)
        if takvim_listesi:
            account["takvimler"] = google_istemcisi.takvimler(access)
            known = {c["id"] for c in account["takvimler"]}
            account["dolu_takvimleri"] = [
                value for value in account["dolu_takvimleri"] if value in known
            ]
            if account.get("musaitlik_takvimi") not in known:
                account["musaitlik_takvimi"] = None
            baglanti.hesap_sifreli = sifrele(account)
        busy_ids = list(account.get("dolu_takvimleri", []))
        availability_id = account.get("musaitlik_takvimi")
        ids = busy_ids + ([availability_id] if availability_id else [])
        periods = google_istemcisi.dolu_zamanlar(
            access, ids, now, now + ESITLEME_GUNU * 86400
        )
    except GoogleHatasi as exc:
        baglanti.son_hata = exc.kod
        if exc.kod == "yetki_kaldirildi":
            baglanti.durum = "koptu"
        else:
            # Olası süresi dolmuş/geri alınmış erişim anahtarı bir sonraki
            # denemede yenilenir; yenileme anahtarı korunur.
            tokens = coz(baglanti.token_sifreli)
            if tokens.pop("access_token", None):
                baglanti.token_sifreli = sifrele(tokens)
        return
    baglanti.dolu_araliklar = birlestir(
        [period for value in busy_ids for period in periods.get(value, [])]
    )
    baglanti.musait_araliklar = (
        periods.get(availability_id, []) if availability_id else None
    )
    baglanti.son_senkron = now
    baglanti.son_hata = None
    baglanti.durum = "aktif"


def _secili_takvim_idleri(baglanti: GoogleTakvimBaglantisi) -> list[str]:
    account = hesap(baglanti)
    busy_ids = list(account.get("dolu_takvimleri", []))
    availability_id = account.get("musaitlik_takvimi")
    if availability_id and availability_id not in busy_ids:
        busy_ids.append(availability_id)
    return busy_ids


def aktif_kanallar(
    db: Session, baglanti_id: str, now: int | None = None
) -> list[GoogleTakvimKanali]:
    now = now or int(time.time())
    return list(
        db.scalars(
            select(GoogleTakvimKanali).where(
                GoogleTakvimKanali.baglanti_id == baglanti_id,
                GoogleTakvimKanali.bitis > now,
            )
        )
    )


def webhook_kanallarini_kapat(
    db: Session, baglanti: GoogleTakvimBaglantisi
) -> None:
    """Bağlantıya ait tüm izleme kanallarını Google'da durdurup siler."""
    channels = list(
        db.scalars(
            select(GoogleTakvimKanali).where(
                GoogleTakvimKanali.baglanti_id == baglanti.id
            )
        )
    )
    if not channels:
        return
    access = None
    if get_settings().google_takvim_etkin and baglanti.durum == "aktif":
        try:
            access = erisim_anahtari(baglanti, int(time.time()))
        except GoogleHatasi:
            access = None
    for channel in channels:
        if access and channel.kaynak_id:
            google_istemcisi.izlemeyi_durdur(
                access, channel.id, channel.kaynak_id
            )
        db.delete(channel)


def webhook_kanallarini_yenile(
    db: Session, baglanti: GoogleTakvimBaglantisi, now: int | None = None
) -> None:
    """Seçili takvimler için Google push notification kanallarını eşler.

    HTTPS webhook adresi tanımlı değilse veya Google watch isteği başarısız
    olursa bağlantıyı bozmaz; saat listesi TTL önbelleğine geri döner.
    """
    now = now or int(time.time())
    settings = get_settings()
    webhook_url = settings.google_takvim_webhook_adresi
    if (
        not webhook_url
        or not settings.google_takvim_etkin
        or baglanti.durum != "aktif"
    ):
        return
    desired = _secili_takvim_idleri(baglanti)
    existing = list(
        db.scalars(
            select(GoogleTakvimKanali).where(
                GoogleTakvimKanali.baglanti_id == baglanti.id
            )
        )
    )
    by_calendar = {c.takvim_id: c for c in existing}
    try:
        access = erisim_anahtari(baglanti, now)
    except GoogleHatasi:
        return
    for calendar_id, channel in list(by_calendar.items()):
        needs_replace = (
            calendar_id not in desired
            or channel.bitis <= now + KANAL_YENILEME_SURESI
        )
        if needs_replace:
            if channel.kaynak_id:
                google_istemcisi.izlemeyi_durdur(
                    access, channel.id, channel.kaynak_id
                )
            db.delete(channel)
            del by_calendar[calendar_id]
    db.flush()
    for calendar_id in desired:
        if calendar_id in by_calendar:
            continue
        channel_id = str(uuid.uuid4())
        token = secrets.token_urlsafe(32)
        try:
            res = google_istemcisi.izle(
                access, calendar_id, channel_id, webhook_url, token
            )
        except GoogleHatasi:
            continue
        exp_ms = res.get("expiration")
        try:
            expires_at = (
                int(exp_ms) // 1000
                if exp_ms is not None
                else now + KANAL_VARSAYILAN_SURESI
            )
        except (TypeError, ValueError):
            expires_at = now + KANAL_VARSAYILAN_SURESI
        db.add(
            GoogleTakvimKanali(
                id=channel_id,
                baglanti_id=baglanti.id,
                uzman_id=baglanti.uzman_id,
                takvim_id=calendar_id,
                kaynak_id=str(res.get("resourceId", ""))[:300],
                dogrulama_ozeti=ozet(token),
                bitis=expires_at,
                olusturma=now,
            )
        )


def takvim_araliklari(
    db: Session, profile: Uzman, tazelik: int
) -> tuple[list[list[int]], list[list[int]] | None]:
    """(dolu, müsait) aralıklarını verir; gerekiyorsa önce eşitler.

    Bağlantı yoksa ([], None) döner ve yalnız haftalık saatler kullanılır.
    Etkin webhook izleme kanalı varsa Google API'ye ek istek atılmaz;
    değişiklikler webhook üzerinden gelir. Kanal yoksa `tazelik` süresi
    dolduğunda eşitlenir.
    """
    baglanti = baglanti_bul(db, profile.id)
    if not baglanti:
        return [], None
    now = int(time.time())
    if get_settings().google_takvim_etkin and baglanti.durum == "aktif":
        channels = aktif_kanallar(db, baglanti.id, now)
        if channels and baglanti.son_senkron is not None:
            if any(c.bitis <= now + KANAL_YENILEME_SURESI for c in channels):
                webhook_kanallarini_yenile(db, baglanti, now)
                db.flush()
            return (
                list(baglanti.dolu_araliklar or []),
                baglanti.musait_araliklar,
            )
        if baglanti.son_deneme is None or now - baglanti.son_deneme >= tazelik:
            esitle(baglanti, now)
            webhook_kanallarini_yenile(db, baglanti, now)
            db.flush()
    return list(baglanti.dolu_araliklar or []), baglanti.musait_araliklar
