import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Lock,
  Palette,
  Sparkles,
  Square,
  Type,
  X,
} from "lucide-react";
import {
  api,
  ButonYapisi,
  Profil,
  TasarimTarzi,
  TemaAyarlari,
  TemaRengi,
  YaziTipi,
  YuzeyStili,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";
import { ProfileQrCard } from "./ProfileQrCard";

export type DesignStyleOption = {
  id: TasarimTarzi;
  label: string;
  tagline: string;
  desc: string;
  defaults: {
    tema_stili: TemaRengi;
    vurgu_rengi: string;
    buton_stili: ButonYapisi;
    yazi_tipi: YaziTipi;
    yuzey_stili: YuzeyStili;
  };
};

export const DESIGN_STYLES: DesignStyleOption[] = [
  {
    id: "klinik_modern",
    label: "Klinik Modern",
    tagline: "Net · Güven Veren",
    desc: "Sade beyaz kartlar, dengeli Klinik Mavi vurgular ve temiz tipografi.",
    defaults: {
      tema_stili: "klasik",
      vurgu_rengi: "#3459d1",
      buton_stili: "yuvarlak",
      yazi_tipi: "modern_sans",
      yuzey_stili: "temiz",
    },
  },
  {
    id: "editoryal_serif",
    label: "Editoryal Klinik",
    tagline: "Akademik · Prestijli",
    desc: "Klasik serif başlıklar, sıcak fildişi kağıt zemini ve kontürlü butonlar.",
    defaults: {
      tema_stili: "gece",
      vurgu_rengi: "#1e293b",
      buton_stili: "cerceveli",
      yazi_tipi: "editoryal_serif",
      yuzey_stili: "krem",
    },
  },
  {
    id: "organik_sakin",
    label: "Organik Mindfulness",
    tagline: "Şefkatli · Doğal",
    desc: "Geniş kavisli kartlar, doğa tonları ve yumuşak hap formunda butonlar.",
    defaults: {
      tema_stili: "orman",
      vurgu_rengi: "#15803d",
      buton_stili: "yastik",
      yazi_tipi: "humanist_sakin",
      yuzey_stili: "pastel",
    },
  },
  {
    id: "yumusak_cam",
    label: "Yumuşak Cam Studio",
    tagline: "Çağdaş · Katmanlı",
    desc: "Yarı saydam buzlu cam yüzeyler, geometrik başlıklar ve derinlik hissi.",
    defaults: {
      tema_stili: "okyanus",
      vurgu_rengi: "#0e7490",
      buton_stili: "cam_efekti",
      yazi_tipi: "geometrik_net",
      yuzey_stili: "buzlu",
    },
  },
];

export const THEME_PRESETS: Array<{
  id: TemaRengi;
  label: string;
  color: string;
  desc: string;
}> = [
  {
    id: "klasik",
    label: "Klinik Mavi",
    color: "#3459d1",
    desc: "Güven veren klasik palet",
  },
  {
    id: "toprak",
    label: "Sıcak Toprak",
    color: "#b45309",
    desc: "Empatik ve davetkar ton",
  },
  {
    id: "orman",
    label: "Denge Orman",
    color: "#15803d",
    desc: "Mindfulness ve bütüncül denge",
  },
  {
    id: "okyanus",
    label: "Sakin Okyanus",
    color: "#0e7490",
    desc: "Berrak ve modern ofis kimliği",
  },
  {
    id: "gece",
    label: "Antrasit",
    color: "#1e293b",
    desc: "Yüksek kontrast ve akademik",
  },
  {
    id: "lavanta",
    label: "Sakin Lavanta",
    color: "#6d28d9",
    desc: "Yumuşak çağdaş klinik hissi",
  },
  {
    id: "kizilcik",
    label: "Sıcak Mürdüm",
    color: "#9f1239",
    desc: "Seçkin editoryal vurgu",
  },
  {
    id: "ada_cayi",
    label: "Zeytin & Adaçayı",
    color: "#3f6212",
    desc: "Dingin doğal tonlar",
  },
];

export const BUTTON_STYLES: Array<{
  id: ButonYapisi;
  label: string;
  desc: string;
}> = [
  { id: "yuvarlak", label: "Yumuşak (14px)", desc: "Dengeli modern kavis" },
  { id: "yastik", label: "Tam Hap (Pill)", desc: "Dostane kapsül form" },
  { id: "keskin", label: "Köşeli (6px)", desc: "Net mimari hatlar" },
  {
    id: "cerceveli",
    label: "Çerçeveli Kontür",
    desc: "Zarif 2px çizgili vurgu",
  },
  {
    id: "yumusak_golge",
    label: "Yükseltilmiş",
    desc: "Yumuşak derinlik gölgesi",
  },
  { id: "cam_efekti", label: "Buzlu Cam", desc: "Yarı saydam katman" },
];

export const FONT_PAIRINGS: Array<{
  id: YaziTipi;
  label: string;
  desc: string;
}> = [
  {
    id: "modern_sans",
    label: "Modern Klinik Sans",
    desc: "Inter · Dengeli, net okunabilirlik",
  },
  {
    id: "editoryal_serif",
    label: "Editoryal Serif",
    desc: "Georgia · Dergi ve akademik duruş",
  },
  {
    id: "humanist_sakin",
    label: "Humanist Sıcak",
    desc: "Avenir · Yumuşak ve empatik akış",
  },
  {
    id: "geometrik_net",
    label: "Geometrik Çağdaş",
    desc: "Modern başlık · Teknik etiketler",
  },
];

export const SURFACE_STYLES: Array<{
  id: YuzeyStili;
  label: string;
  desc: string;
}> = [
  { id: "temiz", label: "Sade Beyaz", desc: "Ferah klinik zemin" },
  { id: "krem", label: "Sıcak Fildişi", desc: "Doğal kağıt dokusu" },
  { id: "pastel", label: "Pastel Gradyan", desc: "Renk tonlu yumuşak zemin" },
  { id: "buzlu", label: "Buzlu Cam", desc: "Blur destekli katman" },
];

export type UnsplashBgPreset = {
  id: string;
  label: string;
  caption: string;
  url: string;
  thumbUrl: string;
};

export const UNSPLASH_BG_PRESETS: UnsplashBgPreset[] = [
  {
    id: "sahil",
    label: "Sakin Kıyı",
    caption: "Unsplash · Açık mavi & sıcak kum",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    thumbUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=420&q=70",
  },
  {
    id: "orman",
    label: "Orman Işığı",
    caption: "Unsplash · Doğal yeşil sükunet",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80",
    thumbUrl:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=420&q=70",
  },
  {
    id: "vadi",
    label: "Göl & Vadi",
    caption: "Unsplash · Yumuşak ufuk çizgisi",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    thumbUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=420&q=70",
  },
  {
    id: "botanik",
    label: "Botanik Yaprak",
    caption: "Unsplash · Adaçayı & huzur",
    url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1600&q=80",
    thumbUrl:
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=420&q=70",
  },
  {
    id: "icmekan",
    label: "Minimal Studio",
    caption: "Unsplash · Sıcak taş & sanat",
    url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80",
    thumbUrl:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=420&q=70",
  },
  {
    id: "sisli",
    label: "Sabah Sisi",
    caption: "Unsplash · Bulutlar & dinginlik",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
    thumbUrl:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=420&q=70",
  },
];

function isSafeHttpsUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ThemeCustomizer({
  profile,
  initialTheme,
}: {
  profile: Profil;
  initialTheme?: TemaAyarlari;
}) {
  const themeApi = useApi<TemaAyarlari>("/uzman/tema", undefined, initialTheme);
  const [tasarimTarzi, setTasarimTarzi] = useState<TasarimTarzi>(
    initialTheme?.tasarim_tarzi ?? "klinik_modern",
  );
  const [temaStili, setTemaStili] = useState<TemaRengi>(
    initialTheme?.tema_stili ?? "klasik",
  );
  const [vurguRengi, setVurguRengi] = useState(
    initialTheme?.vurgu_rengi ?? "#3459d1",
  );
  const [butonStili, setButonStili] = useState<ButonYapisi>(
    initialTheme?.buton_stili ?? "yuvarlak",
  );
  const [yaziTipi, setYaziTipi] = useState<YaziTipi>(
    initialTheme?.yazi_tipi ?? "modern_sans",
  );
  const [yuzeyStili, setYuzeyStili] = useState<YuzeyStili>(
    initialTheme?.yuzey_stili ?? "temiz",
  );
  const [arkaPlanGorseliUrl, setArkaPlanGorseliUrl] = useState(
    initialTheme?.arka_plan_gorseli_url ?? "",
  );
  const [waitlistOpen, setWaitlistOpen] = useState(
    initialTheme?.bekleme_listesi_acik ?? true,
  );
  const [hideBrand, setHideBrand] = useState(
    initialTheme?.terapistco_markasi_gizli ?? false,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!themeApi.data) return;
    setTasarimTarzi(themeApi.data.tasarim_tarzi ?? "klinik_modern");
    setTemaStili(themeApi.data.tema_stili);
    setVurguRengi(themeApi.data.vurgu_rengi);
    setButonStili(themeApi.data.buton_stili);
    setYaziTipi(themeApi.data.yazi_tipi ?? "modern_sans");
    setYuzeyStili(themeApi.data.yuzey_stili ?? "temiz");
    setArkaPlanGorseliUrl(themeApi.data.arka_plan_gorseli_url ?? "");
    setWaitlistOpen(themeApi.data.bekleme_listesi_acik);
    setHideBrand(themeApi.data.terapistco_markasi_gizli);
  }, [themeApi.data]);

  const premiumEnabled = Boolean(themeApi.data?.premium_etkin);
  const previewBgUrl = isSafeHttpsUrl(arkaPlanGorseliUrl)
    ? arkaPlanGorseliUrl.trim()
    : "";
  const isUnsplashPageUrl = /^https:\/\/(www\.)?unsplash\.com\/photos\//i.test(
    arkaPlanGorseliUrl.trim(),
  );

  function applyDesignStyle(style: DesignStyleOption) {
    setTasarimTarzi(style.id);
    setTemaStili(style.defaults.tema_stili);
    setVurguRengi(style.defaults.vurgu_rengi);
    setButonStili(style.defaults.buton_stili);
    setYaziTipi(style.defaults.yazi_tipi);
    setYuzeyStili(style.defaults.yuzey_stili);
    setNotice("");
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const updated = await api<TemaAyarlari>("/uzman/tema", {
        method: "PUT",
        body: JSON.stringify({
          bekleme_listesi_acik: waitlistOpen,
          tasarim_tarzi: tasarimTarzi,
          tema_stili: temaStili,
          vurgu_rengi: vurguRengi,
          buton_stili: butonStili,
          yazi_tipi: yaziTipi,
          yuzey_stili: yuzeyStili,
          arka_plan_gorseli_url: arkaPlanGorseliUrl.trim(),
          terapistco_markasi_gizli: hideBrand,
        }),
      });
      setTasarimTarzi(updated.tasarim_tarzi);
      setTemaStili(updated.tema_stili);
      setVurguRengi(updated.vurgu_rengi);
      setButonStili(updated.buton_stili);
      setYaziTipi(updated.yazi_tipi);
      setYuzeyStili(updated.yuzey_stili);
      setArkaPlanGorseliUrl(updated.arka_plan_gorseli_url ?? "");
      setWaitlistOpen(updated.bekleme_listesi_acik);
      setHideBrand(updated.terapistco_markasi_gizli);
      setNotice("Profil tasarım tarzınız ve görünüm ayarlarınız kaydedildi.");
      themeApi.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const activeStyleLabel =
    DESIGN_STYLES.find((s) => s.id === tasarimTarzi)?.label ?? "Klinik Modern";
  const activeFontLabel =
    FONT_PAIRINGS.find((f) => f.id === yaziTipi)?.label ?? "Modern Klinik Sans";

  return (
    <div className="admin-section-stack">
      <Status
        loading={themeApi.loading}
        error={themeApi.error}
        retry={themeApi.reload}
      />

      {themeApi.data && (
        <form onSubmit={save} className="theme-studio-layout">
          <div className="theme-controls-column">
            <section className="admin-panel-card theme-controls-card">
              <div className="analytics-metric-heading">
                <Sparkles size={19} aria-hidden="true" />
                <h3>1. Hazır Tasarım Tarzı (Tek Tıkla Uygula)</h3>
              </div>
              <p className="muted">
                Terapist.co site bütünlüğünü koruyarak profilinize karakter
                katan 4 temel tasarım tarzından birini seçin; aşağıdaki tüm
                detayları dilediğinizce özelleştirebilirsiniz.
              </p>

              <div className="design-style-grid">
                {DESIGN_STYLES.map((style) => {
                  const active = tasarimTarzi === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      aria-pressed={active}
                      className={`design-style-card ${active ? "is-active" : ""}`}
                      data-style-preview={style.id}
                      onClick={() => applyDesignStyle(style)}
                    >
                      <div
                        className="design-style-thumb"
                        data-design-style={style.id}
                        data-profile-theme={style.defaults.tema_stili}
                        data-profile-button={style.defaults.buton_stili}
                        data-profile-font={style.defaults.yazi_tipi}
                        data-profile-surface={style.defaults.yuzey_stili}
                        aria-hidden="true"
                      >
                        <span className="design-style-aa">Aa</span>
                        <span className="design-style-mini-btn">Randevu</span>
                      </div>
                      <div className="design-style-meta">
                        <div className="design-style-title-row">
                          <strong>{style.label}</strong>
                          {active && <Check size={15} aria-hidden="true" />}
                        </div>
                        <span className="design-style-tagline">
                          {style.tagline}
                        </span>
                        <small>{style.desc}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="admin-panel-card theme-controls-card">
              <div className="analytics-metric-heading">
                <Palette size={19} aria-hidden="true" />
                <h3>2. Renk Paleti ve Marka Rengi</h3>
              </div>

              <div className="theme-preset-grid">
                {THEME_PRESETS.map((preset) => {
                  const active = temaStili === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      className={`theme-preset-btn ${active ? "is-active" : ""}`}
                      onClick={() => {
                        setTemaStili(preset.id);
                        setVurguRengi(preset.color);
                      }}
                    >
                      <span
                        className="theme-swatch"
                        data-color-key={preset.id}
                        aria-hidden="true"
                      />
                      <span>
                        <strong>{preset.label}</strong>
                        <small>{preset.desc}</small>
                      </span>
                      {active && <Check size={16} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>

              <div className="theme-custom-row">
                <div className="theme-custom-header">
                  <strong>
                    <Sparkles size={15} aria-hidden="true" /> Özel Klinik Rengi
                    (Hex)
                  </strong>
                  {!premiumEnabled && (
                    <span className="status-badge">
                      <Lock size={12} aria-hidden="true" /> Kurucu / Premium
                      yetki
                    </span>
                  )}
                </div>
                <div className="theme-hex-controls">
                  <input
                    type="color"
                    aria-label="Marka rengi seçici"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(vurguRengi)
                        ? vurguRengi
                        : "#3459d1"
                    }
                    disabled={!premiumEnabled}
                    onChange={(e) => {
                      setTemaStili("ozel");
                      setVurguRengi(e.target.value.toLowerCase());
                    }}
                  />
                  <input
                    type="text"
                    aria-label="Marka Hex kodu"
                    value={vurguRengi}
                    pattern="^#[0-9a-fA-F]{6}$"
                    maxLength={7}
                    disabled={!premiumEnabled}
                    onChange={(e) => {
                      setTemaStili("ozel");
                      setVurguRengi(e.target.value.toLowerCase());
                    }}
                  />
                  <button
                    type="button"
                    className="button secondary admin-compact-btn"
                    disabled={!premiumEnabled}
                    onClick={() => setTemaStili("ozel")}
                  >
                    Özel Rengi Kullan
                  </button>
                </div>
              </div>
            </section>

            <section className="admin-panel-card theme-controls-card">
              <div className="analytics-metric-heading">
                <Square size={19} aria-hidden="true" />
                <h3>3. Buton Yapısı ve Etkileşim Biçimi</h3>
              </div>

              <div
                className="button-style-grid"
                role="group"
                aria-label="Buton yapısı seçenekleri"
              >
                {BUTTON_STYLES.map((opt) => {
                  const active = butonStili === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      className={`button-style-card ${active ? "is-active" : ""}`}
                      onClick={() => setButonStili(opt.id)}
                    >
                      <span
                        className="button-shape-sample"
                        data-profile-theme={temaStili}
                        data-profile-button={opt.id}
                        aria-hidden="true"
                      >
                        Randevu Al
                      </span>
                      <strong>{opt.label}</strong>
                      <small>{opt.desc}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="admin-panel-card theme-controls-card">
              <div className="analytics-metric-heading">
                <Type size={19} aria-hidden="true" />
                <h3>4. Tipografi ve Sayfa Zemini</h3>
              </div>

              <div
                className="font-style-grid"
                role="group"
                aria-label="Yazı tipi seçenekleri"
              >
                {FONT_PAIRINGS.map((font) => {
                  const active = yaziTipi === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      aria-pressed={active}
                      className={`font-style-card ${active ? "is-active" : ""}`}
                      onClick={() => setYaziTipi(font.id)}
                    >
                      <span
                        className="font-sample-aa"
                        data-profile-font={font.id}
                        aria-hidden="true"
                      >
                        Aa Şğ
                      </span>
                      <span>
                        <strong>{font.label}</strong>
                        <small>{font.desc}</small>
                      </span>
                      {active && <Check size={15} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>

              <div className="surface-style-block">
                <span className="surface-section-label">
                  <Layers size={15} aria-hidden="true" /> Sayfa Zemini &amp;
                  Kart Dokusu
                </span>
                <div
                  className="surface-style-grid"
                  role="group"
                  aria-label="Zemin atmosferi seçenekleri"
                >
                  {SURFACE_STYLES.map((surface) => {
                    const active = yuzeyStili === surface.id;
                    return (
                      <button
                        key={surface.id}
                        type="button"
                        aria-pressed={active}
                        className={`surface-style-card ${active ? "is-active" : ""}`}
                        onClick={() => setYuzeyStili(surface.id)}
                      >
                        <span
                          className="surface-swatch"
                          data-surface-key={surface.id}
                          data-profile-theme={temaStili}
                          aria-hidden="true"
                        />
                        <strong>{surface.label}</strong>
                        <small>{surface.desc}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="surface-style-block bg-image-picker-block">
                <div className="bg-image-picker-header">
                  <span className="surface-section-label">
                    <ImageIcon size={15} aria-hidden="true" /> Arka Plan Görseli
                    (Unsplash / Açık Kaynak)
                  </span>
                  {arkaPlanGorseliUrl && (
                    <button
                      type="button"
                      className="text-button small"
                      onClick={() => setArkaPlanGorseliUrl("")}
                    >
                      <X size={13} aria-hidden="true" /> Görseli kaldır
                    </button>
                  )}
                </div>
                <p className="muted small">
                  Masaüstünde çevresindeki alan seçtiğiniz görsel veya zemin
                  rengiyle uyumlu yumuşak bir fon oluşturur; mobilde görsel ya
                  da zemin rengi tam genişlikte ekranı kaplar.
                </p>

                <div
                  className="bg-preset-grid"
                  role="group"
                  aria-label="Unsplash arka plan görsel galerisi"
                >
                  <button
                    type="button"
                    aria-pressed={!arkaPlanGorseliUrl.trim()}
                    className={`bg-preset-card is-none ${!arkaPlanGorseliUrl.trim() ? "is-active" : ""}`}
                    onClick={() => setArkaPlanGorseliUrl("")}
                  >
                    <span
                      className="bg-preset-thumb bg-preset-color-swatch"
                      data-surface-key={yuzeyStili}
                      data-profile-theme={temaStili}
                      aria-hidden="true"
                    />
                    <strong>Sadece Zemin Rengi</strong>
                    <small>Seçili yüzey tonu</small>
                  </button>
                  {UNSPLASH_BG_PRESETS.map((preset) => {
                    const active = arkaPlanGorseliUrl.trim() === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={active}
                        className={`bg-preset-card ${active ? "is-active" : ""}`}
                        onClick={() => setArkaPlanGorseliUrl(preset.url)}
                      >
                        <img
                          className="bg-preset-thumb"
                          src={preset.thumbUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                        <strong>{preset.label}</strong>
                        <small>{preset.caption}</small>
                      </button>
                    );
                  })}
                </div>

                <label className="field bg-url-field">
                  <span>
                    Özel görsel bağlantısı (Unsplash, Pexels, Pixabay HTTPS URL)
                  </span>
                  <div className="bg-url-input-row">
                    <input
                      id="theme-bg-image-url"
                      type="url"
                      inputMode="url"
                      maxLength={500}
                      placeholder="https://images.unsplash.com/photo-..."
                      value={arkaPlanGorseliUrl}
                      onChange={(e) => setArkaPlanGorseliUrl(e.target.value)}
                    />
                    {arkaPlanGorseliUrl && (
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setArkaPlanGorseliUrl("")}
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <small className="muted">
                    İpucu: Unsplash’te beğendiğiniz fotoğrafa sağ tıklayıp
                    “Resim adresini kopyala” dediğinizde{" "}
                    <code>https://images.unsplash.com/...</code> bağlantısı
                    oluşur.
                  </small>
                  {isUnsplashPageUrl && (
                    <span className="bg-url-hint" role="status">
                      Sayfa bağlantısı yerine görsele sağ tıklayıp doğrudan{" "}
                      <code>images.unsplash.com</code> resim adresini
                      yapıştırmanız gerekir.
                    </span>
                  )}
                </label>
              </div>
            </section>

            <section className="admin-panel-card theme-controls-card">
              <label className="consent">
                <input
                  type="checkbox"
                  checked={waitlistOpen}
                  onChange={(e) => setWaitlistOpen(e.target.checked)}
                />
                Takvim dolduğunda danışanlar için Bekleme Listesi butonunu aktif
                et
              </label>

              <label
                className={`consent ${!premiumEnabled ? "is-locked-label" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={hideBrand}
                  disabled={!premiumEnabled}
                  onChange={(e) => setHideBrand(e.target.checked)}
                />
                <span>
                  <EyeOff size={14} aria-hidden="true" /> White-Label: Profil
                  sayfamda Terapist.co logosunu ve alt bilgisini gizle
                </span>
              </label>
              {!premiumEnabled && (
                <p className="muted small">
                  White-label logo gizleme ve özel Hex marka rengi Kurucu
                  Terapist üyeleri ile yönetim tarafından yetkilendirilen
                  Premium profillere açıktır.
                </p>
              )}

              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}

              <div className="theme-save-actions">
                <button className="button" type="submit" disabled={busy}>
                  {busy ? "Kaydediliyor…" : "Görünümü kaydet"}
                </button>
                <Link className="button secondary" to="/panel/onizleme">
                  <Eye size={16} aria-hidden="true" /> Profil Önizlemesi
                </Link>
                {profile.onayli && (
                  <Link
                    className="button secondary"
                    to={`/${profile.kullanici_adi}`}
                  >
                    <ExternalLink size={16} aria-hidden="true" /> Canlı Sayfa
                  </Link>
                )}
              </div>
            </section>
          </div>

          <aside
            className="admin-panel-card theme-preview-card"
            aria-label="Mikro-site canlı önizlemesi"
          >
            <div className="theme-preview-heading">
              <span className="eyebrow">CANLI MİKRO-SİTE ÖNİZLEMESİ</span>
              <span className="theme-preview-chip">
                {activeStyleLabel} · {activeFontLabel}
              </span>
            </div>
            {temaStili === "ozel" && (
              <p className="muted small">
                Özel marka renginiz (<code>{vurguRengi}</code>) kaydedildikten
                sonra canlı profil sayfanıza tam CSS değişkenleriyle uygulanır.
              </p>
            )}
            <div
              className={`microsite-preview-frame ${previewBgUrl ? "has-bg-image" : ""}`}
              data-design-style={tasarimTarzi}
              data-profile-theme={temaStili}
              data-profile-button={butonStili}
              data-profile-font={yaziTipi}
              data-profile-surface={yuzeyStili}
            >
              {previewBgUrl && (
                <div className="microsite-preview-backdrop" aria-hidden="true">
                  <img
                    className="microsite-preview-backdrop-img"
                    src={previewBgUrl}
                    alt=""
                  />
                </div>
              )}
              <div className="microsite-preview-stage">
                {previewBgUrl && (
                  <img
                    className="microsite-preview-stage-img"
                    src={previewBgUrl}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                <div className="microsite-preview-stage-inner">
                  <div className="microsite-preview-header">
                    <span className="microsite-preview-slug">
                      /{profile.kullanici_adi}
                    </span>
                    {!hideBrand && (
                      <span className="microsite-preview-brand">
                        terapist.co
                      </span>
                    )}
                  </div>
                  <div className="microsite-preview-card-surface">
                    <div className="microsite-preview-identity">
                      <div
                        className={`microsite-preview-avatar${profile.kurucu_no !== null ? " is-founding" : ""}`}
                        aria-hidden="true"
                      >
                        <span>
                          {profile.ad
                            .replace(/Dr\.|Uzm\.|Psk\.|Kln\./g, "")
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("") || "UZ"}
                        </span>
                        {profile.kurucu_no !== null && (
                          <small>
                            #{String(profile.kurucu_no).padStart(4, "0")}
                          </small>
                        )}
                      </div>
                      <div className="microsite-preview-name-row">
                        <strong>{profile.ad}</strong>
                        {profile.onayli && (
                          <BadgeCheck
                            size={16}
                            className="microsite-preview-verified"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <small>{profile.unvan || "Klinik Psikolog"}</small>
                      {profile.ekoller.length > 0 && (
                        <div className="microsite-preview-chips">
                          {profile.ekoller.slice(0, 2).map((ekol) => (
                            <span key={ekol}>{ekol}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="microsite-preview-buttons">
                      <span className="microsite-btn-primary">Randevu Al</span>
                      <span className="microsite-btn-secondary">
                        BDT Formu (Şifreli)
                      </span>
                      {waitlistOpen && (
                        <span className="microsite-btn-secondary">
                          Bekleme Listesine Katıl
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </form>
      )}

      <ProfileQrCard
        username={profile.kullanici_adi}
        therapistName={profile.ad}
        therapistTitle={profile.unvan}
        accentColor={
          temaStili === "ozel"
            ? vurguRengi
            : (THEME_PRESETS.find((p) => p.id === temaStili)?.color ??
              "#3459d1")
        }
        hideBrand={hideBrand}
      />
    </div>
  );
}
