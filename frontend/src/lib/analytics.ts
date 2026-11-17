/** Yalnızca aynı kaynak API'sine, özel bağlantıları dışlayarak ölçüm gönderir.
 * GA4 tarayıcı etiketi yüklenmez: otomatik olaylar bu filtreleri atlayabilir.
 */

export type AnalitikOlayTuru =
  | "page_view"
  | "profile_view"
  | "directory_search"
  | "booking_drawer_open"
  | "booking_submitted"
  | "resource_click"
  | "link_unlock"
  | "waitlist_submitted"
  | "embed_play"
  | "qr_scan";

type AnalitikYapilandirma = {
  olcum_etkin: boolean;
  ga_olcum_kimligi: string | null;
};

type OturumKaynagi = {
  referans_url: string;
  utm_kaynak: string;
};

const VISIT_KEY_STORAGE = "terapist_ziyaret_anahtari";
const ATTRIBUTION_STORAGE = "terapist_oturum_kaynagi";

let configPromise: Promise<AnalitikYapilandirma> | null = null;
let internalReferrer = "";
const recentEvents = new Map<string, number>();

function rastgeleAnahtar(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function ziyaretAnahtariAl(): string {
  try {
    const existing = window.sessionStorage.getItem(VISIT_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const created = rastgeleAnahtar();
    window.sessionStorage.setItem(VISIT_KEY_STORAGE, created);
    return created;
  } catch {
    return rastgeleAnahtar();
  }
}

function disAlanMi(url: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).host !== window.location.host;
  } catch {
    return true;
  }
}

/** Kodlanmış yolları da denetler; sorgu, parça ve özel yolları dışlar. */
function olcumYolu(adres: string): string | null {
  try {
    const decoded = decodeURIComponent(adres.split(/[?#]/)[0]);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("%") ||
      decoded.includes("\\")
    )
      return null;
    const url = new URL(decoded, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      /^\/(panel|yonetim|davet|r)(\/|$)/i.test(url.pathname)
    )
      return null;
    return url.pathname;
  } catch {
    return null;
  }
}

/** Referansın yalnızca kökenini tutar; eski önbellek değerlerine güvenmez. */
function referansUrlTemizle(adres: unknown): string {
  if (typeof adres !== "string") return "";
  try {
    const url = new URL(adres);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      olcumYolu(url.pathname) === null
    ) {
      return "";
    }

    return url.origin;
  } catch {
    return "";
  }
}

export function oturumKaynaginiAl(): OturumKaynagi {
  const empty = { referans_url: "", utm_kaynak: "" };
  try {
    if (olcumYolu(window.location.pathname) === null) {
      internalReferrer = "";
      window.sessionStorage.removeItem(ATTRIBUTION_STORAGE);
      return empty;
    }
    const search = new URLSearchParams(window.location.search);
    const utm = (search.get("utm_source") || "").trim().slice(0, 60);
    const rawRef = (document.referrer || "").trim();
    const externalRef = disAlanMi(rawRef) ? referansUrlTemizle(rawRef) : "";
    const cachedRaw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE);
    let cached: Partial<OturumKaynagi> | null = null;
    try {
      const parsed: unknown = cachedRaw ? JSON.parse(cachedRaw) : null;
      if (parsed && typeof parsed === "object") cached = parsed;
    } catch {
      // Bozuk eski kayıt güncel, temiz değerle değiştirilir.
    }
    const next: OturumKaynagi = {
      referans_url: externalRef || referansUrlTemizle(cached?.referans_url),
      utm_kaynak:
        utm ||
        (typeof cached?.utm_kaynak === "string"
          ? cached.utm_kaynak.trim().slice(0, 60)
          : ""),
    };
    // Önceki sürümün sakladığı tam URL'leri de temizle.
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE, JSON.stringify(next));

    if (next.referans_url || next.utm_kaynak) return next;

    if (internalReferrer) {
      return {
        referans_url: referansUrlTemizle(internalReferrer),
        utm_kaynak: "",
      };
    }
  } catch {
    // sessionStorage kısıtlı ortamlarda sessizce devam edilir.
  }
  return empty;
}

export function sonIcerikYolunuAyarla(yol: string) {
  // Gizli bağlantılar sonraki olaylara referans olarak taşınmaz.
  if (!yol || olcumYolu(yol) === null) {
    internalReferrer = "";
    return;
  }

  internalReferrer = window.location.origin;
}

function cihazTuru(): "masaustu" | "mobil" | "tablet" | "bilinmiyor" {
  if (typeof window === "undefined") return "bilinmiyor";
  const width = window.innerWidth;
  if (width <= 0) return "bilinmiyor";
  if (width < 768) return "mobil";
  if (width < 1024) return "tablet";
  return "masaustu";
}

function saatDilimi(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export function analitikYapilandirmaGetir(
  force = false,
): Promise<AnalitikYapilandirma> {
  if (!configPromise || force) {
    configPromise = fetch("/api/analitik/yapilandirma", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<AnalitikYapilandirma>)
          : { olcum_etkin: false, ga_olcum_kimligi: null },
      )
      .catch(() => ({ olcum_etkin: false, ga_olcum_kimligi: null }));
  }
  return configPromise;
}

async function olcumGonder(
  olay_turu: AnalitikOlayTuru,
  detay: {
    sayfa_yolu?: string;
    uzman_id?: string;
    uzman_kullanici_adi?: string;
    hedef_kaynak_id?: string;
  } = {},
) {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  const yol = olcumYolu(detay.sayfa_yolu || currentPath || "/");
  if (yol === null || olcumYolu(currentPath) === null) {
    oturumKaynaginiAl();
    return;
  }

  const cfg = await analitikYapilandirmaGetir();
  // Bekleyen olay başka sayfaya geçildikten sonra gönderilmez.
  if (!cfg.olcum_etkin || window.location.pathname !== currentPath) return;

  if (olay_turu === "page_view" || olay_turu === "profile_view") {
    const dedupKey = `${olay_turu}:${yol}:${detay.uzman_id || ""}`;
    const now = Date.now();
    const prev = recentEvents.get(dedupKey);
    if (prev && now - prev < 2000) return;
    recentEvents.set(dedupKey, now);
  }

  const kaynak = oturumKaynaginiAl();
  try {
    await fetch("/api/analitik/olcum", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        olay_turu,
        sayfa_yolu: yol.slice(0, 200),
        uzman_id: detay.uzman_id,
        uzman_kullanici_adi: detay.uzman_kullanici_adi,
        referans_url: referansUrlTemizle(kaynak.referans_url),
        utm_kaynak: kaynak.utm_kaynak.slice(0, 60),
        ziyaret_anahtari: ziyaretAnahtariAl(),
        cihaz: cihazTuru(),
        saat_dilimi: saatDilimi(),
        hedef_kaynak_id: detay.hedef_kaynak_id,
      }),
    });
  } catch {
    // Ölçüm hatası kullanıcı deneyimini kesintiye uğratmaz.
  }
}

export function sayfaGoruntulemeBildir(yol: string) {
  return olcumGonder("page_view", { sayfa_yolu: yol }).finally(() => {
    sonIcerikYolunuAyarla(window.location.pathname);
  });
}

export function profilGoruntulemeBildir(uzman: {
  id: string;
  ad: string;
  kullanici_adi: string;
}) {
  const yol = `/${uzman.kullanici_adi}`;
  return olcumGonder("profile_view", {
    sayfa_yolu: yol,
    uzman_id: uzman.id,
    uzman_kullanici_adi: uzman.kullanici_adi,
  }).finally(() => {
    sonIcerikYolunuAyarla(window.location.pathname);
  });
}

export function olayBildir(
  olay: Exclude<AnalitikOlayTuru, "page_view" | "profile_view">,
  detay: {
    sayfa_yolu?: string;
    uzman_id?: string;
    uzman_kullanici_adi?: string;
    hedef_kaynak_id?: string;
  } = {},
) {
  return olcumGonder(olay, detay);
}
