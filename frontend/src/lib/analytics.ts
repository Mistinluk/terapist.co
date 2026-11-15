/** Site geneli mahremiyet güvenli ölçüm ve GA4 entegrasyon yardımcısı. */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

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
const GA_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

let configPromise: Promise<AnalitikYapilandirma> | null = null;
let loadedGaId: string | null = null;
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

export function oturumKaynaginiAl(): OturumKaynagi {
  try {
    const search = new URLSearchParams(window.location.search);
    const utm = (search.get("utm_source") || "").trim().slice(0, 60);
    const rawRef = (document.referrer || "").trim();
    const externalRef = disAlanMi(rawRef) ? rawRef : "";
    const cachedRaw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE);
    const cached: OturumKaynagi | null = cachedRaw
      ? (JSON.parse(cachedRaw) as OturumKaynagi)
      : null;

    if (utm || externalRef) {
      const next: OturumKaynagi = {
        referans_url: externalRef || cached?.referans_url || "",
        utm_kaynak: utm || cached?.utm_kaynak || "",
      };
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE, JSON.stringify(next));
      return next;
    }

    if (cached && (cached.referans_url || cached.utm_kaynak)) {
      return cached;
    }

    if (internalReferrer) {
      return { referans_url: internalReferrer, utm_kaynak: "" };
    }
  } catch {
    // sessionStorage kısıtlı ortamlarda sessizce devam edilir.
  }
  return { referans_url: "", utm_kaynak: "" };
}

export function sonIcerikYolunuAyarla(yol: string) {
  if (yol && !yol.startsWith("/panel") && !yol.startsWith("/yonetim")) {
    internalReferrer = `${window.location.origin}${yol}`;
  }
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

function gtagYukle(gaId: string) {
  if (typeof document === "undefined" || !GA_ID_PATTERN.test(gaId)) return;
  if (loadedGaId === gaId) return;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  const scriptId = "terapist-ga4-script";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.append(script);
    window.gtag("js", new Date());
  }

  window.gtag("config", gaId, {
    send_page_view: false,
    anonymize_ip: true,
  });
  loadedGaId = gaId;
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
          : { olcum_etkin: true, ga_olcum_kimligi: null },
      )
      .then((cfg) => {
        if (cfg.olcum_etkin && cfg.ga_olcum_kimligi) {
          gtagYukle(cfg.ga_olcum_kimligi);
        }
        return cfg;
      })
      .catch(() => ({ olcum_etkin: true, ga_olcum_kimligi: null }));
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
    ga_parametre?: Record<string, unknown>;
  } = {},
) {
  if (typeof window === "undefined") return;
  const yol = detay.sayfa_yolu || window.location.pathname || "/";
  if (yol.startsWith("/panel") || yol.startsWith("/yonetim")) return;

  if (olay_turu === "page_view" || olay_turu === "profile_view") {
    const dedupKey = `${olay_turu}:${yol}:${detay.uzman_id || ""}`;
    const now = Date.now();
    const prev = recentEvents.get(dedupKey);
    if (prev && now - prev < 2000) return;
    recentEvents.set(dedupKey, now);
  }

  const cfg = await analitikYapilandirmaGetir();
  if (!cfg.olcum_etkin) return;

  if (cfg.ga_olcum_kimligi && typeof window.gtag === "function") {
    if (olay_turu === "page_view" || olay_turu === "profile_view") {
      window.gtag("event", "page_view", {
        page_path: yol,
        page_title: document.title,
        ...detay.ga_parametre,
      });
    }
    if (olay_turu !== "page_view") {
      window.gtag("event", olay_turu, {
        page_path: yol,
        ...detay.ga_parametre,
      });
    }
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
        referans_url: kaynak.referans_url.slice(0, 500),
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
  void olcumGonder("page_view", { sayfa_yolu: yol }).finally(() => {
    sonIcerikYolunuAyarla(yol);
  });
}

export function profilGoruntulemeBildir(uzman: {
  id: string;
  ad: string;
  kullanici_adi: string;
}) {
  const yol = `/${uzman.kullanici_adi}`;
  void olcumGonder("profile_view", {
    sayfa_yolu: yol,
    uzman_id: uzman.id,
    uzman_kullanici_adi: uzman.kullanici_adi,
    ga_parametre: {
      therapist_username: uzman.kullanici_adi,
      therapist_name: uzman.ad,
    },
  }).finally(() => {
    sonIcerikYolunuAyarla(yol);
  });
}

export function olayBildir(
  olay: Exclude<AnalitikOlayTuru, "page_view" | "profile_view">,
  detay: {
    sayfa_yolu?: string;
    uzman_id?: string;
    uzman_kullanici_adi?: string;
    hedef_kaynak_id?: string;
    ga_parametre?: Record<string, unknown>;
  } = {},
) {
  void olcumGonder(olay, detay);
}
