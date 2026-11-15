import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

type Availability = { musait: boolean; oneriler: string[] };
const reservedNames = new Set([
  "api",
  "assets",
  "aydinlatma",
  "badge",
  "basvuru",
  "cozumler",
  "davet",
  "favicon",
  "giris",
  "karsilastirma",
  "kesfet",
  "panel",
  "passport",
  "passport-assets",
  "r",
  "rehber",
  "uzman",
  "yonetim",
  "admin",
]);

const EXAMPLE_SLUGS = [
  "ardaekintuncay",
  "elifkaya",
  "selinaksoy",
  "merveyilmaz",
];

export function slugifyTurkishName(input: string): string {
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    i: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    I: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  return input
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

export function UsernameField({
  value,
  onChange,
  onAvailabilityChange,
  inputId = "kullanici-adi",
}: {
  value: string;
  onChange: (value: string) => void;
  onAvailabilityChange?: (available: boolean) => void;
  inputId?: string;
}) {
  const [result, setResult] = useState<Availability>();
  const [checking, setChecking] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const validFormat = /^[a-z][a-z0-9]{1,38}[a-z0-9]$/.test(value);
  const reserved = reservedNames.has(value);
  const valid = validFormat && !reserved;

  useEffect(() => {
    if (value) return;
    const interval = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_SLUGS.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, [value]);

  useEffect(() => {
    setResult(undefined);
    onAvailabilityChange?.(false);
    if (!valid) {
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/oturum/kullanici-adi/${encodeURIComponent(value)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Müsaitlik kontrol edilemedi.");
        const data = (await response.json()) as Availability;
        setResult(data);
        onAvailabilityChange?.(data.musait);
      } catch {
        if (!controller.signal.aborted) {
          setResult(undefined);
          onAvailabilityChange?.(false);
        }
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, valid, onAvailabilityChange]);

  const statusTone = !value
    ? "neutral"
    : !validFormat || reserved
      ? "warning"
      : checking
        ? "checking"
        : result?.musait
          ? "available"
          : result
            ? "taken"
            : "neutral";

  return (
    <div className={`username-field tone-${statusTone}`}>
      <label className="field" htmlFor={inputId}>
        Profil adresiniz
        <span className={`username-input is-${statusTone}`}>
          <span className="username-prefix" aria-hidden="true">
            terapist.co/
          </span>
          <input
            ref={inputRef}
            id={inputId}
            name="kullanici_adi"
            value={value}
            onChange={(event) =>
              onChange(slugifyTurkishName(event.target.value))
            }
            autoComplete="off"
            minLength={3}
            maxLength={40}
            pattern="[a-z][a-z0-9]{1,38}[a-z0-9]"
            placeholder={EXAMPLE_SLUGS[placeholderIndex]}
            required
          />
          <span className="username-badge" aria-hidden="true">
            {checking ? (
              <span className="username-pill checking">
                <Loader2 size={14} className="spin-icon" /> Kontrol…
              </span>
            ) : result?.musait && valid ? (
              <span className="username-pill available">
                <CheckCircle2 size={14} /> Müsait
              </span>
            ) : value && (!valid || (result && !result.musait)) ? (
              <span className="username-pill taken">
                <AlertCircle size={14} /> Uygun değil
              </span>
            ) : (
              <span className="username-pill idle">
                <Sparkles size={13} /> Özel adres
              </span>
            )}
          </span>
        </span>
      </label>
      <p
        className={`username-status status-${statusTone}`}
        role="status"
        aria-live="polite"
      >
        {!value
          ? "Yalnızca küçük harf ve rakam kullanın (tire yok). Adınız başvuru kaydedilince kesinleşir."
          : !validFormat
            ? "3–40 karakter kullanın; harfle başlayın, harf veya rakamla bitirin."
            : reserved
              ? "Bu adres uygulama tarafından kullanılıyor. Başka bir ad seçin."
              : checking
                ? "Müsaitlik kontrol ediliyor…"
                : result?.musait
                  ? "Bu adres şu an müsait. Başvuru tamamlanana kadar ayrılmış sayılmaz."
                  : result
                    ? "Bu adres alınmış. Aşağıdaki seçeneklerden birini deneyin."
                    : "Müsaitlik kontrolü yapılamadı. Biraz sonra tekrar deneyin."}
      </p>
      {result && !result.musait && result.oneriler.length > 0 && (
        <div className="username-suggestions" aria-label="Alternatif adresler">
          {result.oneriler.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => {
                onChange(suggestion);
                inputRef.current?.focus();
              }}
            >
              terapist.co/{suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
