import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { api, GoogleTakvimDurumu, tarih } from "../lib/api";

const GERI_DONUS_MESAJLARI: Record<string, { metin: string; hata?: boolean }> =
  {
    baglandi: {
      metin:
        "Google Takvim bağlandı. Dolu zamanlarınız randevu saatlerinizden otomatik çıkarılır.",
    },
    eksik: {
      metin:
        "Google Takvim bağlandı ancak ilk eşitleme tamamlanamadı. Şimdi eşitle düğmesiyle tekrar deneyin.",
      hata: true,
    },
    iptal: {
      metin: "Google Takvim bağlantısı tamamlanmadı.",
    },
    izin: {
      metin:
        "Takvim izinleri verilmediği için bağlantı kurulmadı. Bağlarken iki takvim iznini de onaylayın.",
      hata: true,
    },
    gecersiz: {
      metin:
        "Bağlantı isteğinin süresi doldu veya doğrulanamadı. Lütfen yeniden deneyin.",
      hata: true,
    },
    hata: {
      metin: "Google Takvim bağlantısı sırasında bir sorun oluştu.",
      hata: true,
    },
  };

export function GoogleCalendarCardContent({
  data,
  busy = false,
  notice = "",
  error = "",
  selectedAvailability = "",
  selectedBusy = [],
  onAvailabilityChange,
  onToggleBusy,
  onConnect,
  onSaveSettings,
  onSync,
  onDisconnect,
}: {
  data?: GoogleTakvimDurumu;
  busy?: boolean;
  notice?: string;
  error?: string;
  selectedAvailability?: string;
  selectedBusy?: string[];
  onAvailabilityChange?: (calendarId: string) => void;
  onToggleBusy?: (calendarId: string) => void;
  onConnect?: () => void;
  onSaveSettings?: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
}) {
  const connected = Boolean(data?.bagli);
  const active = connected && data?.durum === "aktif";
  const disconnected = connected && data?.durum === "koptu";
  const configured = Boolean(data?.yapilandirildi);
  const usingAvailabilityCalendar = Boolean(active && data?.musaitlik_takvimi);
  const settingsChanged =
    Boolean(data?.bagli) &&
    ((selectedAvailability || null) !== (data?.musaitlik_takvimi ?? null) ||
      selectedBusy.length !== (data?.dolu_takvimleri.length ?? 0) ||
      selectedBusy.some((id) => !data?.dolu_takvimleri.includes(id)));

  return (
    <div
      className="calendar-source-card"
      aria-labelledby="calendar-source-title"
    >
      <div className="calendar-source-icon" aria-hidden="true">
        <CalendarDays size={22} />
      </div>
      <div className="calendar-source-copy">
        <div className="calendar-source-heading">
          <strong id="calendar-source-title">Takvim kaynağı</strong>
          <span className={disconnected ? "is-warning" : undefined}>
            {disconnected ? (
              <>
                <AlertCircle size={14} aria-hidden="true" /> Yeniden bağlayın
              </>
            ) : (
              <>
                <ShieldCheck size={14} aria-hidden="true" />{" "}
                {active ? "Google Takvim bağlı" : "Etkin"}
              </>
            )}
          </span>
        </div>

        <p>
          {usingAvailabilityCalendar
            ? "Müsait saatleriniz seçtiğiniz Google takviminden alınıyor ve dolu zamanlarınız otomatik düşülüyor."
            : active
              ? "Aşağıdaki haftalık Terapist.co saatleriniz, bağlı Google Takvim'inizdeki dolu zamanlara göre kontrol ediliyor."
              : "Şu anda profilinizde aşağıda belirlediğiniz Terapist.co saatleri kullanılıyor."}
        </p>

        <div className="calendar-source-future">
          {!connected ? (
            <>
              <strong>
                {configured
                  ? "Google Takvim bağlantısı"
                  : "Google Takvim bağlantısı · yakında"}
              </strong>
              <p>
                {configured
                  ? "Dolu/müsait zamanlar kontrol edilir; kişisel etkinlik başlıkları veya katılımcılar profilinizde gösterilmez. Randevular birincil Google takviminize özel etkinlik olarak yazılır; danışan adı ve telefonu gönderilmez."
                  : "Planlanan bağlantıda yalnız dolu zamanlar eşleştirilecek; kişisel etkinlik ayrıntıları profilinizde gösterilmeyecek."}
              </p>
              <button
                className="button secondary"
                type="button"
                disabled={!configured || busy}
                onClick={onConnect}
              >
                {busy ? "Yönlendiriliyor…" : "Takvimini ekle (Google Takvim)"}
              </button>
            </>
          ) : (
            <>
              <strong>
                Google Takvim
                {data?.email ? ` · ${data.email}` : ""}
              </strong>
              <p>
                {data?.son_senkron
                  ? `Son kontrol: ${tarih(new Date(data.son_senkron * 1000).toISOString())} · 15 gün içinde ${data.dolu_aralik_sayisi} dolu zaman aralığı dikkate alınıyor.`
                  : "Yalnız dolu ve müsait zaman aralıkları okunur; kişisel etkinlik başlıkları alınmaz."}
                {data?.webhook_etkin
                  ? ` · Anlık bildirim (webhook) etkin (${data.webhook_kanal_sayisi ?? 1} takvim izleniyor).`
                  : ""}
              </p>

              {data?.hata && (
                <p className="notice error" role="alert">
                  {data.hata}
                </p>
              )}
              {active && !data?.randevu_yazma_izni && (
                <div className="notice">
                  Randevuları Google'a aktarmak için yeni takvim yazma izni
                  gerekiyor. Bağlantıyı yeniden kurun.
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={onConnect}
                  >
                    Randevu aktarımını etkinleştir
                  </button>
                </div>
              )}
              {active && data?.randevu_yazma_izni && (
                <p>
                  Randevular birincil Google takviminize aktarılır. Bekleyen:{" "}
                  {data.bekleyen_aktarim ?? 0} · Yeniden denenecek hata:{" "}
                  {data.hatali_aktarim ?? 0}
                </p>
              )}

              {active && data && data.takvimler.length > 0 && (
                <div className="calendar-source-settings">
                  <label className="field">
                    Randevu müsaitlik kaynağı
                    <select
                      value={selectedAvailability}
                      disabled={busy}
                      onChange={(e) => onAvailabilityChange?.(e.target.value)}
                    >
                      <option value="">
                        Aşağıdaki haftalık Terapist.co saatlerimi kullan
                      </option>
                      {data.takvimler.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          Google takvimindeki etkinlik saatleri: {cal.ad}
                          {cal.birincil ? " (Birincil)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <fieldset className="calendar-source-list">
                    <legend>Dolu zamanları düşülecek Google takvimleri</legend>
                    <div className="inline-fields">
                      {data.takvimler
                        .filter((cal) => cal.id !== selectedAvailability)
                        .map((cal) => (
                          <label className="radio" key={cal.id}>
                            <input
                              type="checkbox"
                              checked={selectedBusy.includes(cal.id)}
                              disabled={busy}
                              onChange={() => onToggleBusy?.(cal.id)}
                            />
                            {cal.ad}
                            {cal.birincil ? " (Birincil)" : ""}
                          </label>
                        ))}
                    </div>
                  </fieldset>
                </div>
              )}

              <div className="actions calendar-source-actions">
                {disconnected ? (
                  <button
                    className="button"
                    type="button"
                    disabled={!configured || busy}
                    onClick={onConnect}
                  >
                    {busy
                      ? "Yönlendiriliyor…"
                      : "Google Takvim'i yeniden bağla"}
                  </button>
                ) : (
                  <>
                    {settingsChanged && (
                      <button
                        className="button"
                        type="button"
                        disabled={busy}
                        onClick={onSaveSettings}
                      >
                        {busy ? "Kaydediliyor…" : "Takvim seçimini kaydet"}
                      </button>
                    )}
                    <button
                      className="button secondary"
                      type="button"
                      disabled={busy}
                      onClick={onSync}
                    >
                      <RefreshCw size={15} aria-hidden="true" /> Şimdi eşitle
                    </button>
                  </>
                )}
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={onDisconnect}
                >
                  <Unlink size={15} aria-hidden="true" /> Bağlantıyı kaldır
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoogleCalendarCard({
  enabled = false,
  callbackOutcome,
  onClearCallback,
}: {
  enabled?: boolean;
  callbackOutcome?: string | null;
  onClearCallback?: () => void;
}) {
  const [data, setData] = useState<GoogleTakvimDurumu>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [selectedBusy, setSelectedBusy] = useState<string[]>([]);

  function applyStatus(next: GoogleTakvimDurumu) {
    setData(next);
    setSelectedAvailability(next.musaitlik_takvimi ?? "");
    setSelectedBusy(next.dolu_takvimleri);
  }

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api<GoogleTakvimDurumu>("/uzman/google-takvim")
      .then((result) => {
        if (active) applyStatus(result);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!callbackOutcome) return;
    const info = GERI_DONUS_MESAJLARI[callbackOutcome];
    if (info) {
      if (info.hata) {
        setError(info.metin);
        setNotice("");
      } else {
        setNotice(info.metin);
        setError("");
      }
    }
    onClearCallback?.();
  }, [callbackOutcome, onClearCallback]);

  async function connect() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ yonlendirme_url: string }>(
        "/uzman/google-takvim/baglanti",
        { method: "POST", body: "{}" },
      );
      window.location.assign(result.yonlendirme_url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<GoogleTakvimDurumu>(
        "/uzman/google-takvim/ayarlar",
        {
          method: "PUT",
          body: JSON.stringify({
            musaitlik_takvimi: selectedAvailability || null,
            dolu_takvimleri: selectedBusy.filter(
              (id) => id !== selectedAvailability,
            ),
          }),
        },
      );
      applyStatus(result);
      setNotice("Google Takvim seçiminiz kaydedildi ve saatleriniz eşitlendi.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<GoogleTakvimDurumu>(
        "/uzman/google-takvim/esitle",
        { method: "POST", body: "{}" },
      );
      applyStatus(result);
      if (!result.hata) {
        setNotice("Google Takvim verileriniz güncellendi.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (
      !window.confirm(
        "Google Takvim bağlantısı kaldırılsın mı? Mevcut Google etkinlikleri kalır ve sonraki değişiklikler aktarılmaz. Profilinizde haftalık Terapist.co saatleriniz kullanılacak.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/uzman/google-takvim", { method: "DELETE" });
      applyStatus({
        yapilandirildi: data?.yapilandirildi ?? true,
        bagli: false,
        email: null,
        durum: null,
        son_senkron: null,
        hata: null,
        takvimler: [],
        musaitlik_takvimi: null,
        dolu_takvimleri: [],
        dolu_aralik_sayisi: 0,
        musait_aralik_sayisi: null,
      });
      setNotice("Google Takvim bağlantısı kaldırıldı.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GoogleCalendarCardContent
      data={data}
      busy={busy}
      notice={notice}
      error={error}
      selectedAvailability={selectedAvailability}
      selectedBusy={selectedBusy}
      onAvailabilityChange={(calendarId) => {
        setSelectedAvailability(calendarId);
        if (calendarId) {
          setSelectedBusy((prev) => prev.filter((id) => id !== calendarId));
        }
      }}
      onToggleBusy={(calendarId) => {
        setSelectedBusy((prev) =>
          prev.includes(calendarId)
            ? prev.filter((id) => id !== calendarId)
            : [...prev, calendarId],
        );
      }}
      onConnect={connect}
      onSaveSettings={saveSettings}
      onSync={syncNow}
      onDisconnect={disconnect}
    />
  );
}
