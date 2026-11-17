/**
 * Ölçümün ağ sınırını sınar: özel yollar, eski önbellek ve bekleyen istekler.
 * Tarayıcı yüzeyi ve fetch sahtedir; Google'a veya gerçek API'ye bağlanılmaz.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const origin = "https://terapist.test";
const storageKey = "terapist_oturum_kaynagi";
let analytics: typeof import("./analytics");
let storage: Map<string, string>;
let fetchMock: ReturnType<typeof vi.fn>;
let createElement: ReturnType<typeof vi.fn>;
let gtag: ReturnType<typeof vi.fn>;

function navigate(path: string) {
  Object.assign(window, { location: new URL(path, origin) });
}

function recordedEvents(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/analitik/olcum")
    .map(([, options]) => JSON.parse(options.body));
}

beforeEach(async () => {
  vi.resetModules();
  storage = new Map();
  createElement = vi.fn();
  gtag = vi.fn();
  vi.stubGlobal("window", {
    location: new URL("/kesfet", origin),
    innerWidth: 1280,
    gtag,
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  vi.stubGlobal("document", { referrer: "", createElement });
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ olcum_etkin: true, ga_olcum_kimligi: "G-TEST1234" }),
  });
  vi.stubGlobal("fetch", fetchMock);
  analytics = await import("./analytics");
});

afterEach(() => vi.unstubAllGlobals());

describe("Özel bağlantıların ölçümden dışlanması", () => {
  it.each([
    "/davet",
    "/davet/SENTINEL",
    "/DAVET/SENTINEL",
    "/R/SENTINEL",
    "/r/SENTINEL",
    "/panel/onizleme",
    "/yonetim",
    "/%64avet/SENTINEL",
    "/r%2FSENTINEL",
    "/x/../davet/SENTINEL",
    "/davet?token=SENTINEL",
    "/davet#SENTINEL",
    "/%2564avet/SENTINEL",
    "/%invalid",
    "https://other.test/davet/SENTINEL",
    "//other.test/SENTINEL",
  ])("%s olayını API'ye göndermez", async (path) => {
    await analytics.sayfaGoruntulemeBildir(path);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("özel sayfadaki profil ve özel olayları da engeller", async () => {
    navigate("/davet/SENTINEL");
    storage.set(
      storageKey,
      JSON.stringify({ referans_url: origin + "/r/SENTINEL" }),
    );
    await analytics.profilGoruntulemeBildir({
      id: "test",
      ad: "Örnek",
      kullanici_adi: "ornek",
    });
    await analytics.olayBildir("resource_click", { sayfa_yolu: "/ornek" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(storage.has(storageKey)).toBe(false);
  });

  it("ayarlar beklenirken özel sayfaya geçilirse eski olayı iptal eder", async () => {
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = analytics.sayfaGoruntulemeBildir("/kesfet");
    navigate("/davet/SENTINEL");
    finish({ ok: true, json: async () => ({ olcum_etkin: true }) });
    await pending;
    expect(recordedEvents()).toEqual([]);
    navigate("/ornek");
    expect(analytics.oturumKaynaginiAl().referans_url).toBe("");
  });

  it("özel sayfadan herkese açık sayfaya dönünce ölçümü sürdürür", async () => {
    navigate("/r/SENTINEL");
    await analytics.sayfaGoruntulemeBildir("/r/SENTINEL");
    navigate("/kesfet");
    await analytics.sayfaGoruntulemeBildir("/kesfet");
    expect(recordedEvents()).toHaveLength(1);
    expect(JSON.stringify(recordedEvents())).not.toContain("SENTINEL");
  });

  it("kamuya açık yolların sorgu ve fragment değerlerini göndermez", async () => {
    await analytics.sayfaGoruntulemeBildir("/davetci?token=SENTINEL#SENTINEL");
    expect(recordedEvents()[0].sayfa_yolu).toBe("/davetci");
    expect(JSON.stringify(recordedEvents())).not.toContain("SENTINEL");
  });
});

describe("Kaynak temizliği ve bağımsız GA toplamasının engellenmesi", () => {
  it.each([
    ["https://source.test/page?token=SENTINEL#SENTINEL", "https://source.test"],
    ["https://source.test/davet/SENTINEL", ""],
    ["https://source.test/%72/SENTINEL", ""],
    ["javascript:SENTINEL", ""],
  ])("%s önbelleğini temizler", async (referrer, expected) => {
    storage.set(
      storageKey,
      JSON.stringify({ referans_url: referrer, utm_kaynak: "" }),
    );
    await analytics.sayfaGoruntulemeBildir("/kesfet");
    expect(recordedEvents()[0].referans_url).toBe(expected);
    expect(storage.get(storageKey)).not.toContain("SENTINEL");
  });

  it("document.referrer değerinden yalnızca kökeni tutar", async () => {
    Object.assign(document, {
      referrer: "https://source.test/path?token=SENTINEL",
    });
    await analytics.sayfaGoruntulemeBildir("/kesfet");
    expect(recordedEvents()[0].referans_url).toBe("https://source.test");
    expect(storage.get(storageKey)).not.toContain("SENTINEL");
  });

  it("bozuk önbelleği temizler ve dahili referansı yalnızca köken olarak tutar", () => {
    storage.set(storageKey, "broken-SENTINEL");
    analytics.sonIcerikYolunuAyarla("/kesfet?token=SENTINEL");
    expect(analytics.oturumKaynaginiAl().referans_url).toBe(origin);
    expect(storage.get(storageKey)).not.toContain("SENTINEL");
  });

  it("GA kimliği olsa da etiket yüklemez ve mevcut gtag fonksiyonunu çağırmaz", async () => {
    await analytics.sayfaGoruntulemeBildir("/kesfet");
    navigate("/davet/SENTINEL");
    await analytics.sayfaGoruntulemeBildir("/davet/SENTINEL");
    expect(createElement).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.every(([url]) => url.startsWith("/api/"))).toBe(
      true,
    );
  });

  it.each(["disabled", "failed", "rejected"])(
    "%s yapılandırmasında ölçüm yapmaz",
    async (mode) => {
      if (mode === "rejected")
        fetchMock.mockRejectedValueOnce(new Error("offline"));
      else
        fetchMock.mockResolvedValueOnce({
          ok: mode !== "failed",
          json: async () => ({ olcum_etkin: false }),
        });
      await analytics.sayfaGoruntulemeBildir("/kesfet");
      expect(recordedEvents()).toEqual([]);
    },
  );
});
