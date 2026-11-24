import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Layers,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { ProfilGirdi, uploadProfilePhoto } from "../lib/api";
import { Avatar } from "./Avatar";
import { GoogleCalendarCard } from "./GoogleCalendarCard";
import { DAYS, WeeklyScheduleEditor } from "./WeeklyScheduleEditor";

export type ProfileSectionTab =
  "kimlik" | "uzmanlik" | "takvim" | "baglantilar" | "tumu";

const SECTION_TABS: {
  id: ProfileSectionTab;
  label: string;
  shortLabel: string;
  icon: typeof UserRound;
}[] = [
  {
    id: "kimlik",
    label: "Kimlik ve ücret",
    shortLabel: "Kimlik",
    icon: UserRound,
  },
  {
    id: "uzmanlik",
    label: "Uzmanlık ve eğitim",
    shortLabel: "Uzmanlık",
    icon: Briefcase,
  },
  {
    id: "takvim",
    label: "Takvim ve saatler",
    shortLabel: "Takvim",
    icon: Calendar,
  },
  {
    id: "baglantilar",
    label: "Sosyal bağlantılar",
    shortLabel: "Bağlantılar",
    icon: Share2,
  },
  {
    id: "tumu",
    label: "Tümünü aç",
    shortLabel: "Tümü",
    icon: Layers,
  },
];

const QUICK_SUGGESTIONS: Partial<Record<keyof ProfilGirdi, string[]>> = {
  uzmanliklar: [
    "Kaygı / Anksiyete",
    "Depresyon",
    "İlişki Sorunları",
    "Travma / TSSB",
    "Yas ve Kayıp",
    "Özdeğer / Özgüven",
    "Stres ve Tükenmişlik",
    "OKB",
  ],
  ekoller: [
    "Bilişsel Davranışçı Terapi (BDT)",
    "EMDR",
    "Şema Terapi",
    "Psikodinamik Terapi",
    "Kabul ve Kararlılık (ACT)",
    "Varoluşçu Terapi",
    "Çözüm Odaklı Terapi",
  ],
  kitle: ["Yetişkin", "Ergen", "Çift", "Çocuk", "Aile"],
  diller: ["Türkçe", "İngilizce", "Almanca", "Fransızca"],
};

const WIZARD_STEPS = [
  {
    id: 0,
    number: "01",
    title: "Adres ve hesap",
    subtitle: "Profil bağlantınız ve giriş bilgileriniz",
  },
  {
    id: 1,
    number: "02",
    title: "Mesleki kimlik",
    subtitle: "Tanıtım, fotoğraf ve görüşme ücreti",
  },
  {
    id: 2,
    number: "03",
    title: "Uzmanlık ve eğitim",
    subtitle: "Çalışma alanlarınız, ekoller ve bağlantılar",
  },
  {
    id: 3,
    number: "04",
    title: "Görüşme takvimi",
    subtitle: "Haftalık uygun saatleriniz ve onay",
  },
];

export const days = DAYS;
const socialKeys = [
  "instagram",
  "linkedin",
  "x",
  "youtube",
  "website",
] as const;
const socialLabels: Record<(typeof socialKeys)[number], string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  website: "Web sitesi",
};
export function readProfile(form: FormData): ProfilGirdi {
  const text = (key: string) => String(form.get(key) || "").trim();
  const list = (key: string) =>
    text(key)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    ad: text("ad"),
    unvan: text("unvan"),
    profil_fotografi_url: text("profil_fotografi_url"),
    sehir: text("sehir"),
    ilce: text("ilce"),
    biyografi: text("biyografi"),
    terapi_yaklasimi: text("terapi_yaklasimi"),
    ucret: Number(form.get("ucret")),
    seans_suresi_dakika: Number(
      form.get("seans_suresi_dakika") || 60,
    ) as ProfilGirdi["seans_suresi_dakika"],
    deneyim_yili: Number(form.get("deneyim_yili")),
    adres: text("adres"),
    ekoller: list("ekoller"),
    kitle: list("kitle"),
    diller: list("diller"),
    uzmanliklar: list("uzmanliklar"),
    egitim: list("egitim"),
    egitim_universite: text("egitim_universite"),
    egitim_program: text("egitim_program"),
    egitim_derece: text("egitim_derece"),
    kurumlar: list("kurumlar"),
    sosyal_baglantilar: Object.fromEntries(
      socialKeys
        .map((key) => [key, text(`sosyal_${key}`)])
        .filter(([, url]) => url),
    ) as ProfilGirdi["sosyal_baglantilar"],
    formatlar: form.getAll("formatlar").map(String),
    calisma_saatleri: days.flatMap((_, gun) =>
      form.has(`gun_${gun}`)
        ? [
            {
              gun,
              baslangic: Number(form.get(`bas_${gun}`)),
              bitis: Number(form.get(`bit_${gun}`)),
            },
          ]
        : [],
    ),
  };
}
export function ProfileForm({
  profile,
  children,
  onSubmit,
  label = "Değişiklikleri kaydet",
  googleCalendarEnabled = false,
  googleCalendarCallback,
  onClearGoogleCalendarCallback,
  wizardMode = false,
  onDraftChange,
  onSectionChange,
}: {
  profile?: ProfilGirdi;
  children?: ReactNode;
  onSubmit: (profile: ProfilGirdi, data: FormData) => Promise<void>;
  label?: string;
  googleCalendarEnabled?: boolean;
  googleCalendarCallback?: string | null;
  onClearGoogleCalendarCallback?: () => void;
  wizardMode?: boolean;
  onDraftChange?: (draft: ProfilGirdi) => void;
  onSectionChange?: (section: ProfileSectionTab) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [sectionTab, setSectionTab] = useState<ProfileSectionTab>(
    googleCalendarCallback ? "takvim" : "kimlik",
  );
  const [bioExpanded, setBioExpanded] = useState(false);
  const [eduExpanded, setEduExpanded] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile?.profil_fotografi_url || "");
  const [photoMeta, setPhotoMeta] = useState<{
    boyut_bayt: number;
    genislik: number;
    yukseklik: number;
  } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [draggingPhoto, setDraggingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRefs = useRef<
    Partial<Record<keyof ProfilGirdi, HTMLInputElement>>
  >({});
  const [chipTick, setChipTick] = useState(0);

  function syncDraft() {
    if (!formRef.current || !onDraftChange) return;
    onDraftChange(readProfile(new FormData(formRef.current)));
  }

  useEffect(() => {
    setPhotoUrl(profile?.profil_fotografi_url || "");
    setPhotoMeta(null);
    setPhotoError("");
  }, [profile?.profil_fotografi_url]);

  useEffect(() => {
    syncDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, chipTick]);

  useEffect(() => {
    if (googleCalendarCallback) {
      setSectionTab("takvim");
    }
  }, [googleCalendarCallback]);

  useEffect(() => {
    onSectionChange?.(sectionTab);
  }, [sectionTab, onSectionChange]);

  async function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    if (file.size > 12 * 1024 * 1024) {
      setPhotoError("Görsel dosyası en fazla 12 MB olabilir.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const result = await uploadProfilePhoto(file);
      setPhotoUrl(result.url);
      setPhotoMeta({
        boyut_bayt: result.boyut_bayt,
        genislik: result.genislik,
        yukseklik: result.yukseklik,
      });
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    void handlePhotoFile(e.target.files?.[0]);
  }

  function onPhotoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDraggingPhoto(false);
    void handlePhotoFile(e.dataTransfer.files?.[0]);
  }
  function toggleSuggestionChip(key: keyof ProfilGirdi, item: string) {
    const input = inputRefs.current[key];
    if (!input) return;
    const current = input.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = current.some(
      (val) => val.toLocaleLowerCase("tr") === item.toLocaleLowerCase("tr"),
    );
    const next = exists
      ? current.filter(
          (val) => val.toLocaleLowerCase("tr") !== item.toLocaleLowerCase("tr"),
        )
      : [...current, item];
    input.value = next.join(", ");
    setChipTick((t) => t + 1);
  }

  function isChipSelected(key: keyof ProfilGirdi, item: string): boolean {
    const input = inputRefs.current[key];
    const source = input
      ? input.value
      : Array.isArray(profile?.[key])
        ? (profile[key] as string[]).join(", ")
        : "";
    return source
      .split(",")
      .map((s) => s.trim().toLocaleLowerCase("tr"))
      .includes(item.toLocaleLowerCase("tr"));
  }

  function validateStep(stepIndex: number): boolean {
    if (!formRef.current) return true;
    const stepContainer = formRef.current.querySelector(
      `[data-wizard-step="${stepIndex}"]`,
    );
    if (!stepContainer) return true;
    const controls = stepContainer.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select");
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goNextStep() {
    if (!validateStep(activeStep)) return;
    setError("");
    setActiveStep((prev) => Math.min(WIZARD_STEPS.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevStep() {
    setError("");
    setActiveStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (wizardMode && !showAllSteps) {
      for (let i = 0; i < WIZARD_STEPS.length; i++) {
        const stepContainer = formEl.querySelector(`[data-wizard-step="${i}"]`);
        if (!stepContainer) continue;
        const controls = stepContainer.querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >("input, textarea, select");
        for (const control of controls) {
          if (!control.checkValidity()) {
            setActiveStep(i);
            window.setTimeout(() => control.reportValidity(), 40);
            return;
          }
        }
      }
    } else if (!wizardMode) {
      const allControls = formEl.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select");
      for (const control of allControls) {
        if (!control.checkValidity()) {
          const parentSection = control.closest<HTMLElement>(
            "[data-profile-section]",
          );
          const secId = parentSection?.dataset.profileSection as
            ProfileSectionTab | undefined;
          if (secId && sectionTab !== "tumu" && sectionTab !== secId) {
            setSectionTab(secId);
          }
          if (
            control.name === "biyografi" ||
            control.name === "terapi_yaklasimi" ||
            control.name === "adres"
          ) {
            setBioExpanded(true);
          }
          if (
            control.name.startsWith("egitim") ||
            control.name === "kurumlar"
          ) {
            setEduExpanded(true);
          }
          window.setTimeout(() => control.reportValidity(), 40);
          return;
        }
      }
    }
    setBusy(true);
    setError("");
    setSaved(false);
    const form = new FormData(formEl);
    try {
      await onSubmit(readProfile(form), form);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof ProfilGirdi,
    label: string,
    required = false,
    maxLength = 100,
    placeholder?: string,
  ) => {
    const suggestions = QUICK_SUGGESTIONS[key];
    return (
      <div className="field-with-chips">
        <label className="field">
          <span>
            {label}
            {required && (
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </span>
          <input
            ref={(el) => {
              if (el) inputRefs.current[key] = el;
            }}
            name={key}
            required={required}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={() => {
              if (suggestions) setChipTick((t) => t + 1);
            }}
            defaultValue={
              Array.isArray(profile?.[key])
                ? (profile[key] as string[]).join(", ")
                : String(profile?.[key] || "")
            }
          />
        </label>
        {suggestions && (
          <div
            className="quick-chips"
            aria-label={`${label} için hızlı seçimler`}
          >
            {suggestions.map((item) => {
              const active = isChipSelected(key, item);
              return (
                <button
                  key={item}
                  type="button"
                  className={`quick-chip${active ? " active" : ""}`}
                  onClick={() => toggleSuggestionChip(key, item)}
                >
                  {active ? (
                    <Check size={12} aria-hidden="true" />
                  ) : (
                    <Plus size={12} aria-hidden="true" />
                  )}
                  {item}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const stepHidden = (stepIdx: number) =>
    wizardMode && !showAllSteps && activeStep !== stepIdx;

  const sectionHidden = (sec: Exclude<ProfileSectionTab, "tumu">) =>
    !wizardMode && sectionTab !== "tumu" && sectionTab !== sec;

  const orderedSectionIds: Exclude<ProfileSectionTab, "tumu">[] = [
    "kimlik",
    "uzmanlik",
    "takvim",
    "baglantilar",
  ];
  const currentSecIndex = orderedSectionIds.indexOf(
    sectionTab === "tumu" ? "kimlik" : sectionTab,
  );

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      onChange={syncDraft}
      className={`profile-form${wizardMode ? " is-wizard" : " is-sectioned"}`}
    >
      {!wizardMode && (
        <div
          className="profile-section-switcher"
          role="tablist"
          aria-label="Profil düzenleme bölümleri"
        >
          {SECTION_TABS.map((tabItem) => {
            const Icon = tabItem.icon;
            const active = sectionTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`profile-section-pill${active ? " active" : ""}`}
                onClick={() => setSectionTab(tabItem.id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="pill-label-full">{tabItem.label}</span>
                <span className="pill-label-short">{tabItem.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}
      {wizardMode && (
        <div className="onboarding-stepper" aria-label="Başvuru adımları">
          <div className="onboarding-stepper-top">
            <div className="onboarding-stepper-badge">
              <Sparkles size={14} aria-hidden="true" />
              <span>
                {showAllSteps
                  ? "Tüm adımlar açık"
                  : `Adım ${activeStep + 1} / ${WIZARD_STEPS.length} · ${WIZARD_STEPS[activeStep].title}`}
              </span>
            </div>
            <button
              type="button"
              className="stepper-mode-toggle"
              onClick={() => setShowAllSteps((prev) => !prev)}
            >
              <Layers size={14} aria-hidden="true" />
              {showAllSteps ? "Adım adım ilerle" : "Tümünü tek sayfada aç"}
            </button>
          </div>
          {!showAllSteps && (
            <>
              <div
                className="onboarding-progress-track"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={WIZARD_STEPS.length}
                aria-valuenow={activeStep + 1}
              >
                <div
                  className="onboarding-progress-fill"
                  style={{
                    width: `${((activeStep + 1) / WIZARD_STEPS.length) * 100}%`,
                  }}
                />
              </div>
              <div className="onboarding-step-tabs" role="tablist">
                {WIZARD_STEPS.map((step) => {
                  const isCurrent = activeStep === step.id;
                  const isDone = activeStep > step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      className={`onboarding-step-tab${isCurrent ? " active" : ""}${isDone ? " done" : ""}`}
                      onClick={() => {
                        if (step.id > activeStep && !validateStep(activeStep)) {
                          return;
                        }
                        setActiveStep(step.id);
                      }}
                    >
                      <span className="step-tab-num">
                        {isDone ? <Check size={13} /> : step.number}
                      </span>
                      <span className="step-tab-text">
                        <strong>{step.title}</strong>
                        <small>{step.subtitle}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      {children && (
        <div
          data-wizard-step="0"
          className={stepHidden(0) ? "wizard-step-hidden" : "wizard-step-pane"}
        >
          {children}
        </div>
      )}
      <section
        data-wizard-step="1"
        data-profile-section="kimlik"
        className={`form-section${stepHidden(1) ? " wizard-step-hidden" : ""}${sectionHidden("kimlik") ? " profile-sec-hidden" : ""}`}
      >
        <div className="section-compact-header">
          <div>
            <h2>Profil bilgileri</h2>
            <p className="muted">
              Bu bölümdeki bilgiler onaydan sonra herkese açık profilinizde
              görünür.
            </p>
          </div>
        </div>

        <div className="profile-subcard is-open">
          <div className="field">
            <span>Profil fotoğrafı</span>
            <input type="hidden" name="profil_fotografi_url" value={photoUrl} />
            <div
              className={`photo-uploader${draggingPhoto ? " dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingPhoto(true);
              }}
              onDragLeave={() => setDraggingPhoto(false)}
              onDrop={onPhotoDrop}
            >
              <div className="photo-uploader-preview">
                <Avatar ad={profile?.ad || "Uzman"} src={photoUrl} large />
              </div>
              <div className="photo-uploader-body">
                <div className="photo-uploader-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="photo-file-input"
                    id="profil-fotografi-dosya"
                    onChange={onPhotoChange}
                    disabled={uploadingPhoto}
                  />
                  <label
                    htmlFor="profil-fotografi-dosya"
                    className={`button secondary small photo-upload-btn${uploadingPhoto ? " disabled" : ""}`}
                  >
                    <Upload size={15} aria-hidden="true" />
                    {uploadingPhoto
                      ? "Sıkıştırılıyor ve yükleniyor…"
                      : photoUrl
                        ? "Fotoğrafı değiştir"
                        : "Fotoğraf yükle"}
                  </label>
                  {photoUrl && !uploadingPhoto && (
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() => {
                        setPhotoUrl("");
                        setPhotoMeta(null);
                        setPhotoError("");
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Kaldır
                    </button>
                  )}
                </div>
                <p className="muted small photo-uploader-hint">
                  HEIC, JPG, PNG veya WebP seçin ya da sürükleyin. Otomatik
                  sıkıştırılıp WebP formatına dönüştürülür (en fazla 12 MB).
                </p>
                {photoMeta && (
                  <p className="photo-uploader-meta" role="status">
                    WebP olarak optimize edildi ·{" "}
                    {Math.max(1, Math.round(photoMeta.boyut_bayt / 1024))} KB (
                    {photoMeta.genislik}×{photoMeta.yukseklik})
                  </p>
                )}
                {photoError && (
                  <p className="notice error small" role="alert">
                    {photoError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="form-grid compact-pair-grid">
            {field("ad", "Ad ve soyad", true, 150)}
            {field("unvan", "Mesleki unvan", false, 100)}
          </div>
          <div className="form-grid compact-pair-grid">
            {field("sehir", "Şehir", true, 80)}
            {field("ilce", "İlçe", true, 80)}
          </div>
          <div className="form-grid compact-triple-grid">
            <label className="field">
              <span>
                Görüşme ücreti (₺){" "}
                <span className="required-mark" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                name="ucret"
                type="number"
                min="0"
                max="100000"
                required
                defaultValue={profile?.ucret ?? ""}
              />
            </label>
            <label className="field">
              <span>
                Deneyim (yıl){" "}
                <span className="required-mark" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                name="deneyim_yili"
                type="number"
                min="0"
                max="70"
                required
                defaultValue={profile?.deneyim_yili ?? 0}
              />
            </label>
            <label className="field">
              <span>Süre (dk)</span>
              <select
                name="seans_suresi_dakika"
                defaultValue={profile?.seans_suresi_dakika ?? 60}
              >
                {[30, 45, 50, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} dk
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div
          className={`profile-subcard collapsible-subcard${bioExpanded || wizardMode ? " is-open" : ""}`}
        >
          <button
            type="button"
            className="subcard-toggle-btn"
            aria-expanded={bioExpanded || wizardMode}
            onClick={() => setBioExpanded((prev) => !prev)}
          >
            <div>
              <strong>Hakkınızda, terapi yaklaşımı ve açık adres</strong>
              <small>
                {profile?.biyografi
                  ? `${profile.biyografi.slice(0, 56)}…`
                  : "Özgeçmiş metninizi, yaklaşımınızı ve isteğe bağlı ofis adresinizi düzenleyin"}
              </small>
            </div>
            <span className="subcard-chevron" aria-hidden="true">
              <ChevronDown size={17} />
            </span>
          </button>
          <div className="subcard-body">
            <label className="field">
              <span>
                Hakkınızda{" "}
                <span className="required-mark" aria-hidden="true">
                  *
                </span>
              </span>
              <textarea
                name="biyografi"
                rows={4}
                minLength={20}
                maxLength={5000}
                required
                defaultValue={profile?.biyografi}
              />
            </label>
            <label className="field">
              Terapi yaklaşımınız (isteğe bağlı)
              <textarea
                name="terapi_yaklasimi"
                rows={3}
                maxLength={2000}
                defaultValue={profile?.terapi_yaklasimi}
              />
            </label>
            {field("adres", "Görüşme adresi (isteğe bağlı)", false, 500)}
          </div>
        </div>
      </section>
      <section
        data-wizard-step="2"
        data-profile-section="uzmanlik"
        className={`form-section${stepHidden(2) ? " wizard-step-hidden" : ""}${sectionHidden("uzmanlik") ? " profile-sec-hidden" : ""}`}
      >
        <h2>Çalışma alanlarınız</h2>
        <p className="muted">
          Önerilen etiketlere dokunarak hızlıca ekleyebilir veya virgülle
          ayırarak kendi alanlarınızı yazabilirsiniz.
        </p>
        <div className="profile-subcard is-open">
          <div className="form-grid">
            {field(
              "uzmanliklar",
              "Destek alanları",
              true,
              1000,
              "Örn. Kaygı, İlişki sorunları, Yas",
            )}
            {field(
              "ekoller",
              "Terapi yaklaşımları",
              true,
              1000,
              "Örn. BDT, EMDR, Şema Terapi",
            )}
            {field(
              "kitle",
              "Danışan grupları",
              true,
              500,
              "Örn. Yetişkin, Ergen, Çift",
            )}
            {field(
              "diller",
              "Görüşme dilleri",
              true,
              500,
              "Örn. Türkçe, İngilizce",
            )}
          </div>
          <fieldset className="format-fieldset">
            <legend>Görüşme şekli (en az birini seçin)</legend>
            <div className="inline-fields">
              {["Çevrim içi", "Yüz yüze"].map((value) => (
                <label className="radio format-pill-option" key={value}>
                  <input
                    type="checkbox"
                    name="formatlar"
                    value={value}
                    defaultChecked={
                      profile?.formatlar.includes(value) ??
                      value === "Çevrim içi"
                    }
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div
          className={`profile-subcard collapsible-subcard${eduExpanded || wizardMode ? " is-open" : ""}`}
        >
          <button
            type="button"
            className="subcard-toggle-btn"
            aria-expanded={eduExpanded || wizardMode}
            onClick={() => setEduExpanded((prev) => !prev)}
          >
            <div>
              <strong>Akademik eğitim, üniversite ve kurum bilgileri</strong>
              <small>
                {profile?.egitim_universite
                  ? `${profile.egitim_universite}${profile.egitim_program ? ` · ${profile.egitim_program}` : ""}`
                  : "Üniversite, bölüm, derece, sertifikalar ve çalıştığınız kurumlar"}
              </small>
            </div>
            <span className="subcard-chevron" aria-hidden="true">
              <ChevronDown size={17} />
            </span>
          </button>
          <div className="subcard-body">
            <div className="form-grid compact-triple-grid">
              {field("egitim_universite", "Üniversite", false, 150)}
              {field("egitim_program", "Program / bölüm", false, 150)}
              {field("egitim_derece", "Akademik derece", false, 100)}
            </div>
            <div className="form-grid">
              {field("egitim", "Eğitim ve sertifikalar", false, 1000)}
              {field("kurumlar", "Çalıştığınız kurumlar", false, 1000)}
            </div>
          </div>
        </div>
      </section>
      <section
        data-profile-section="baglantilar"
        className={`form-section${stepHidden(2) ? " wizard-step-hidden" : ""}${sectionHidden("baglantilar") ? " profile-sec-hidden" : ""}`}
      >
        <h2>Sosyal bağlantılar (isteğe bağlı)</h2>
        <p className="muted">
          Yalnız doldurduğunuz bağlantılar profilinizde görünür. HTTPS adresi
          kullanın.
        </p>
        <div className="form-grid compact-pair-grid">
          {socialKeys.map((key) => (
            <label className="field" key={key}>
              {socialLabels[key]}
              <input
                name={`sosyal_${key}`}
                type="url"
                inputMode="url"
                maxLength={1000}
                placeholder="https://"
                defaultValue={profile?.sosyal_baglantilar?.[key] ?? ""}
              />
            </label>
          ))}
        </div>
      </section>
      <section
        data-wizard-step="3"
        data-profile-section="takvim"
        className={`form-section${stepHidden(3) ? " wizard-step-hidden" : ""}${sectionHidden("takvim") ? " profile-sec-hidden" : ""}`}
      >
        <h2>Haftalık görüşme saatleri</h2>
        <p className="muted">
          Türkiye saatiyle, birer saat aralıklı başlangıçlar. Hazır şablonlarla
          tek tıkla doldurabilir veya günleri özelleştirebilirsiniz.
        </p>
        <GoogleCalendarCard
          enabled={googleCalendarEnabled}
          callbackOutcome={googleCalendarCallback}
          onClearCallback={onClearGoogleCalendarCallback}
        />
        <WeeklyScheduleEditor initialHours={profile?.calisma_saatleri} />
      </section>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          Bilgiler kaydedildi.
        </p>
      )}
      {wizardMode && !showAllSteps ? (
        <div className="wizard-nav-bar">
          {activeStep > 0 ? (
            <button
              type="button"
              className="button secondary wizard-back-btn"
              onClick={goPrevStep}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Önceki adım
            </button>
          ) : (
            <span />
          )}
          {activeStep < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              className="button wizard-next-btn"
              onClick={goNextStep}
              disabled={uploadingPhoto}
            >
              Sonraki adıma geç <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="button wizard-submit-btn"
              type="submit"
              disabled={busy || uploadingPhoto}
            >
              <Check size={17} aria-hidden="true" />
              {busy ? "Kaydediliyor…" : label}
            </button>
          )}
        </div>
      ) : (
        <div className="profile-sticky-save-bar">
          {sectionTab !== "tumu" && (
            <div className="profile-sticky-step-nav">
              <button
                type="button"
                className="button secondary small"
                disabled={currentSecIndex <= 0}
                onClick={() => {
                  if (currentSecIndex > 0) {
                    setSectionTab(orderedSectionIds[currentSecIndex - 1]);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" /> Önceki
              </button>
              <button
                type="button"
                className="button secondary small"
                disabled={currentSecIndex >= orderedSectionIds.length - 1}
                onClick={() => {
                  if (currentSecIndex < orderedSectionIds.length - 1) {
                    setSectionTab(orderedSectionIds[currentSecIndex + 1]);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                Sonraki <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            className="button profile-save-submit-btn"
            type="submit"
            disabled={busy || uploadingPhoto}
          >
            <Check size={16} aria-hidden="true" />
            {busy ? "Kaydediliyor…" : saved ? "Kaydedildi ✓" : label}
          </button>
        </div>
      )}
    </form>
  );
}
