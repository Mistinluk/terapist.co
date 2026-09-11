let csrf = "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function setCsrf(value: string) {
  csrf = value;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith("/oturum/")) {
      window.dispatchEvent(new Event("oturum-bitti"));
    }
    throw new ApiError(
      body.detail || "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export type CalismaSaati = { gun: number; baslangic: number; bitis: number };
export type ProfilGirdi = {
  ad: string;
  sehir: string;
  ilce: string;
  biyografi: string;
  ucret: number;
  deneyim_yili: number;
  ekoller: string[];
  kitle: string[];
  formatlar: string[];
  uzmanliklar: string[];
  egitim: string[];
  kurumlar: string[];
  adres: string;
  calisma_saatleri: CalismaSaati[];
};
export type Profil = ProfilGirdi & {
  id: string;
  onayli: boolean;
  arsivli: boolean;
};
export type Aydinlatma = {
  surum: string;
  metin: string;
  veri_sorumlusu: string;
  gelistirme: boolean;
};
export type Randevu = {
  id: string;
  uzman_id: string;
  baslangic: string;
  ad: string;
  telefon: string;
  durum: string;
};
export const para = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
export const tarih = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
