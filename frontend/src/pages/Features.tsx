import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartHandshake,
  LockKeyhole,
  Palette,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Unlock,
  UsersRound,
} from "lucide-react";
import { slugifyTurkishName, UsernameField } from "../components/UsernameField";
import { usePageMetadata } from "../lib/seoMetadata";

export const FEATURES_META_TITLE =
  "Özellikler · Psikolog ve terapist profili, randevu ve QR kod | terapist.co";
export const FEATURES_META_DESCRIPTION =
  "Psikolog ve terapistler için terapist.co özellikleri: isminize özel profil adresi, tek sayfada dijital profil, kolay randevu takvimi, şifreli formlar ve QR kodunuz.";

type StudioThemeId = "modern" | "editorial" | "organic" | "glass";

const STUDIO_THEMES: {
  id: StudioThemeId;
  label: string;
  tagline: string;
  accentLabel: string;
}[] = [
  {
    id: "modern",
    label: "Klinik Modern",
    tagline: "Ferah, net ve güven veren mavi-beyaz görünüm",
    accentLabel: "Kobalt ve beyaz",
  },
  {
    id: "editorial",
    label: "Editoryal Klinik",
    tagline: "Yazılar ve özgeçmiş için göz yormayan krem tonlar",
    accentLabel: "Krem ve mürekkep",
  },
  {
    id: "organic",
    label: "Doğal sakinlik",
    tagline: "Yumuşak yeşil tonlarla huzurlu bir karşılama",
    accentLabel: "Adaçayı ve toprak",
  },
  {
    id: "glass",
    label: "Yumuşak cam",
    tagline: "Modern ve aydınlık kart görünümü",
    accentLabel: "Buz ve lavanta",
  },
];

export interface DetailedFeatureSection {
  id: string;
  number: string;
  badge: string;
  shortTitle: string;
  icon: typeof AtSign;
  title: string;
  subtitle: string;
  simpleNote: string;
  bullets: string[];
  relatedLink: {
    to: string;
    label: string;
  };
}

export const DETAILED_FEATURE_SECTIONS: DetailedFeatureSection[] = [
  {
    id: "kisisel-adres",
    number: "01",
    badge: "KİŞİSEL ADRES",
    shortTitle: "terapist.co/adiniz",
    icon: AtSign,
    title: "İnternette sadece size ait, akılda kalıcı bir adresiniz olur",
    subtitle:
      "Tıpkı ofisinizin kapısındaki isimlik gibi, internette de kendi adınızla yer alırsınız. Danışanlarınız adınızı yazdığında karışık bağlantılar yerine doğrudan size ulaşır.",
    simpleNote:
      "Instagram, WhatsApp ve kartvizitinizde tek bir temiz adres paylaşırsınız.",
    bullets: [
      "Tire veya karışık rakamlar olmadan kendi adınız",
      "İsminizin yanında güven veren Onaylı Uzman rozeti",
      "Sosyal medya ve kartvizit için tek kalıcı bağlantı",
    ],
    relatedLink: {
      to: "/rehber/klinik-psikolog-dijital-kimlik",
      label: "Dijital kimlik rehberini incele",
    },
  },
  {
    id: "link-in-bio",
    number: "02",
    badge: "DİJİTAL VİTRİN",
    shortTitle: "Tek sayfada profil",
    icon: Palette,
    title:
      "Kim olduğunuzu, eğitimlerinizi ve videolarınızı tek sayfada gösterin",
    subtitle:
      "Teknik bilgiye hiç gerek yok. Hazır renklerden sevdiğinizi seçin; özgeçmişinizi, çalıştığınız alanları, YouTube videolarınızı ve podcast yayınlarınızı tek bir düzenli sayfada toplayın.",
    simpleNote:
      "Danışanınız başka sitelerde kaybolmadan sizi kendi sayfanızda tanır.",
    bullets: [
      "Tek tıkla değişen 4 sade görünüm ve renk seçimi",
      "Sayfadan çıkmadan açılan YouTube ve Spotify kutuları",
      "Terapist.co için marka gizleme (White-Label) seçeneği",
    ],
    relatedLink: {
      to: "/cozumler/psikolog-link-in-bio",
      label: "Psikologlar için biyografi bağlantısı",
    },
  },
  {
    id: "randevu-takvimi",
    number: "03",
    badge: "KOLAY RANDEVU",
    shortTitle: "Takvim ve bekleme listesi",
    icon: CalendarDays,
    title: "“Hangi gün uygunsunuz?” mesajlarına tek tek yanıt vermeyin",
    subtitle:
      "Hangi gün ve saatlerde çalıştığınızı seçersiniz. Danışanlarınız sadece boş saatlerinizi görür ve kolayca randevu ister. Takviminiz tamamen doluysa bekleme listesine kaydolur.",
    simpleNote:
      "Google Takvim'inizdeki özel notlarınız kimseye görünmez; sadece dolu saatleriniz otomatik kapanır.",
    bullets: [
      "Çevrim içi ve yüz yüze seans saatlerini kolayca ayırma",
      "Kişisel Google Takvim hesabınızla otomatik eşitleme",
      "Yeriniz dolduğunda tek tıkla açılan bekleme listesi",
    ],
    relatedLink: {
      to: "/cozumler/online-terapi-randevu-takvimi",
      label: "Çevrim içi randevu takviminin ayrıntıları",
    },
  },
  {
    id: "sifreli-formlar",
    number: "04",
    badge: "ŞİFRELİ FORM VE QR",
    shortTitle: "Şifreli bağlantı ve QR kod",
    icon: LockKeyhole,
    title: "Formlarınızı şifreyle koruyun, QR kodunuzla anında paylaşın",
    subtitle:
      "Seans öncesi ölçek veya ödev bağlantılarınız için şifre belirlersiniz; sadece şifreyi verdiğiniz danışanınız açabilir. Odanızdaki QR kodunuzu telefonla okutan danışanınız saniyeler içinde sayfanıza ulaşır.",
    simpleNote:
      "Kâğıt kalem kullanma veya uzun bağlantıları kopyalama zahmeti olmadan güvenli paylaşım yaparsınız.",
    bullets: [
      "Sadece şifreyi verdiğiniz kişinin açabildiği özel bağlantılar",
      "Grup çalışmaları için başlangıç ve bitiş tarihli kayıt",
      "Odanız ve kartvizitiniz için basıma hazır QR kodunuz",
    ],
    relatedLink: {
      to: "/cozumler/sifreli-bdt-sema-formlari",
      label: "Şifreli formlar nasıl çalışır?",
    },
  },
  {
    id: "analitik",
    number: "05",
    badge: "ZİYARETÇİ SAYACI",
    shortTitle: "Ziyaretçi istatistikleri",
    icon: BarChart3,
    title: "Sayfanızı kaç kişinin ziyaret ettiğini ve nereden geldiğini görün",
    subtitle:
      "Sade rakamlarla profilinize kaç kişinin girdiğini, Instagram'dan mı yoksa Google'dan mı geldiklerini ve hangi düğmelere tıkladıklarını anında görürsünüz.",
    simpleNote:
      "Danışanların özel sağlık bilgilerini asla kaydetmeyen, tamamen güvenli bir yapıdır.",
    bullets: [
      "Sayfanızı ziyaret eden kişi sayısı",
      "Instagram, Google ve QR kodunuzdan gelenlerin oranı",
      "En çok tıklanan yazı, video ve randevu düğmeleri",
    ],
    relatedLink: {
      to: "/rehber/terapide-kvkk-ve-veri-minimasyonu",
      label: "Gizlilik ve güvenlik rehberi",
    },
  },
  {
    id: "meslektas-agi",
    number: "06",
    badge: "MESLEKTAŞ AĞI",
    shortTitle: "Uzman dayanışması",
    icon: Share2,
    title: "Güvendiğiniz meslektaşlarınızla bağ kurun ve danışan yönlendirin",
    subtitle:
      "Birlikte eğitim veya süpervizyon aldığınız uzmanları profilinizde gösterebilirsiniz. Çalışmadığınız bir konuda veya takviminiz doluyken danışanınızı özel bir bağlantıyla güvendiğiniz meslektaşınıza yönlendirirsiniz.",
    simpleNote:
      "Yıldız, puan veya yorum yarışı yoktur; sadece gerçek mesleki dayanışma vardır.",
    bullets: [
      "Onaylı meslektaşlarınızla görünür uzmanlık bağı",
      "terapist.co/r/... bağlantısıyla kolay danışan yönlendirme",
      "Puanlama veya reklam rekabeti olmayan saygılı dizin",
    ],
    relatedLink: {
      to: "/cozumler/dogrulanmis-meslektas-agi",
      label: "Meslektaş ağının ayrıntıları",
    },
  },
];

export function Features() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeFeatureId, setActiveFeatureId] =
    useState<string>("kisisel-adres");
  const [selectedTheme, setSelectedTheme] = useState<StudioThemeId>("modern");
  const [waitlistSimMode, setWaitlistSimMode] = useState<"musait" | "dolu">(
    "musait",
  );
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [bottomSlug, setBottomSlug] = useState("");
  const [bottomAvailable, setBottomAvailable] = useState(false);

  usePageMetadata({
    title: FEATURES_META_TITLE,
    description: FEATURES_META_DESCRIPTION,
    path: "/ozellikler",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: FEATURES_META_TITLE,
          description: FEATURES_META_DESCRIPTION,
          url: "https://terapist.co/ozellikler",
          inLanguage: "tr",
          isPartOf: { "@id": "https://terapist.co/#website" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Ana sayfa",
              item: "https://terapist.co/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Özellikler",
              item: "https://terapist.co/ozellikler",
            },
          ],
        },
      ],
    },
  });

  useEffect(() => {
    if (!location.hash) return;
    const rawId = location.hash.replace(/^#/, "");
    if (rawId === "alan-adini-sahiplen") {
      const claimEl = document.getElementById("alan-adini-sahiplen");
      claimEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const matched = DETAILED_FEATURE_SECTIONS.find((sec) => sec.id === rawId);
    if (matched) {
      setActiveFeatureId(matched.id);
      const studioEl = document.getElementById("ozellik-secici-studyo");
      window.setTimeout(() => {
        studioEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, [location.hash]);

  const activeFeature =
    DETAILED_FEATURE_SECTIONS.find((sec) => sec.id === activeFeatureId) ??
    DETAILED_FEATURE_SECTIONS[0];
  const ActiveIcon = activeFeature.icon;

  function renderFeatureInteractiveDemo(featureId: string) {
    switch (featureId) {
      case "kisisel-adres":
        return (
          <div className="ft-demo-card ft-demo-domain">
            <div className="ft-demo-browser-bar">
              <span className="ft-demo-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <div className="ft-demo-url-pill">
                <LockKeyhole size={13} aria-hidden="true" />
                <span>https://terapist.co/</span>
                <strong className="ft-typing-slug">ardaekintuncay</strong>
              </div>
            </div>
            <div className="ft-demo-identity-box">
              <div className="ft-demo-avatar-ring">
                <span className="ft-demo-avatar-initials">AT</span>
                <span className="ft-demo-founding-tag">Kurucu #12</span>
              </div>
              <div className="ft-demo-identity-meta">
                <div className="ft-demo-name-row">
                  <strong>Uzm. Kl. Psk. Arda Ekin Tuncay</strong>
                  <span className="ft-demo-verified-pill">
                    <ShieldCheck size={13} aria-hidden="true" />
                    Doğrulanmış
                  </span>
                </div>
                <p>Yetişkin ve çift terapisi · İstanbul ve çevrim içi</p>
                <div className="ft-demo-role-chips">
                  <span>Psikolog</span>
                  <span>Terapist</span>
                  <span>Klinik Psikolog</span>
                  <span>Psikiyatr</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "link-in-bio":
        return (
          <div
            className={`ft-demo-card ft-demo-studio is-theme-${selectedTheme}`}
          >
            <div
              className="ft-studio-switcher"
              role="tablist"
              aria-label="Görünüm rengini değiştir"
            >
              {STUDIO_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedTheme === theme.id}
                  className={`ft-studio-tab${selectedTheme === theme.id ? " is-active" : ""}`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  {theme.label}
                </button>
              ))}
            </div>
            <div className="ft-studio-preview-surface">
              <div className="ft-studio-preview-top">
                <span className="ft-studio-palette-tag">
                  {
                    STUDIO_THEMES.find((t) => t.id === selectedTheme)
                      ?.accentLabel
                  }
                </span>
                <span className="ft-studio-wl-tag">Tek tıkla görünüm</span>
              </div>
              <strong>
                {STUDIO_THEMES.find((t) => t.id === selectedTheme)?.label}
              </strong>
              <p>
                {STUDIO_THEMES.find((t) => t.id === selectedTheme)?.tagline}
              </p>
              <div className="ft-studio-mock-links">
                <div className="ft-studio-mock-btn is-primary">
                  <span>Randevu iste (çevrim içi / yüz yüze)</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </div>
                <div className="ft-studio-mock-btn">
                  <span>Spotify · Terapi Odasından Notlar</span>
                  <Sparkles size={14} aria-hidden="true" />
                </div>
                <div className="ft-studio-mock-btn">
                  <span>YouTube · Kaygıyla baş etme videosu</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        );

      case "randevu-takvimi":
        return (
          <div className="ft-demo-card ft-demo-calendar">
            <div className="ft-cal-top-bar">
              <span className="ft-cal-sync-pill">
                <CheckCircle2 size={14} aria-hidden="true" />
                Google Takvim bağlı
              </span>
              <div
                className="ft-cal-mode-toggle"
                role="group"
                aria-label="Takvim durumu"
              >
                <button
                  type="button"
                  className={`ft-cal-mode-btn${waitlistSimMode === "musait" ? " is-active" : ""}`}
                  onClick={() => setWaitlistSimMode("musait")}
                >
                  Uygun saatler var
                </button>
                <button
                  type="button"
                  className={`ft-cal-mode-btn${waitlistSimMode === "dolu" ? " is-active" : ""}`}
                  onClick={() => setWaitlistSimMode("dolu")}
                >
                  Takvim dolu
                </button>
              </div>
            </div>

            {waitlistSimMode === "musait" ? (
              <div className="ft-cal-slots-box">
                <div className="ft-cal-day-row">
                  <strong>Salı · Çevrim içi veya yüz yüze</strong>
                  <span>50 dk seans</span>
                </div>
                <div className="ft-cal-slot-pills">
                  <span className="ft-slot is-open">10:00 · Boş</span>
                  <span className="ft-slot is-busy">11:30 · Dolu</span>
                  <span className="ft-slot is-open is-pulse">14:00 · Boş</span>
                  <span className="ft-slot is-open">16:30 · Boş</span>
                </div>
                <p className="ft-cal-note">
                  Danışanınız boş saati seçip kolayca talep gönderir.
                </p>
              </div>
            ) : (
              <div className="ft-cal-waitlist-box">
                <div className="ft-cal-waitlist-head">
                  <Clock size={18} aria-hidden="true" />
                  <strong>Bekleme listesi açık</strong>
                </div>
                <p>
                  Boş yeriniz olmadığında danışanınız adını ve uygun gününü
                  bırakır; yer açılınca hemen haber verirsiniz.
                </p>
                <div className="ft-cal-waitlist-badges">
                  <span>Hafta içi akşam</span>
                  <span>Çevrim içi görüşme</span>
                </div>
              </div>
            )}
          </div>
        );

      case "sifreli-formlar":
        return (
          <div className="ft-demo-card ft-demo-lock">
            <div className="ft-lock-grid">
              <div className="ft-lock-panel">
                <div className="ft-lock-header">
                  <span className="ft-lock-status-pill">
                    {pinUnlocked ? (
                      <>
                        <Unlock size={13} aria-hidden="true" />
                        Form açıldı
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={13} aria-hidden="true" />
                        Şifreli form
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    className="ft-lock-toggle-btn"
                    onClick={() => setPinUnlocked((prev) => !prev)}
                  >
                    {pinUnlocked ? "Tekrar kilitle" : "Şifreyi gir (4821)"}
                  </button>
                </div>
                <strong>Seans öncesi değerlendirme formu</strong>
                <p>
                  {pinUnlocked
                    ? "Şifre doğru! Danışanınız formu güvenle doldurabilir."
                    : "Bu form kilitlidir. Sadece şifreyi verdiğiniz danışanınız açabilir."}
                </p>
                <div className="ft-pin-boxes" aria-hidden="true">
                  <span>{pinUnlocked ? "4" : "•"}</span>
                  <span>{pinUnlocked ? "8" : "•"}</span>
                  <span>{pinUnlocked ? "2" : "•"}</span>
                  <span>{pinUnlocked ? "1" : "•"}</span>
                </div>
              </div>

              <div className="ft-qr-mini-card">
                <QrCode size={38} aria-hidden="true" />
                <strong>QR kodunuz</strong>
                <span>Kamerayla okutunca anında açılır</span>
              </div>
            </div>
          </div>
        );

      case "analitik":
        return (
          <div className="ft-demo-card ft-demo-analytics">
            <div className="ft-analytics-head">
              <div>
                <span className="ft-analytics-eyebrow">BU AYKİ ÖZETİNİZ</span>
                <strong>Ziyaretçiler sizi nereden buldu?</strong>
              </div>
              <span className="ft-analytics-kvkk-pill">
                <ShieldCheck size={13} aria-hidden="true" />
                Güvenli sayaç
              </span>
            </div>
            <div className="ft-analytics-bars">
              <div className="ft-bar-row">
                <div className="ft-bar-label">
                  <span>Instagram profilinizden</span>
                  <strong>%48</strong>
                </div>
                <div className="ft-bar-track">
                  <span className="ft-bar-fill is-w48" />
                </div>
              </div>
              <div className="ft-bar-row">
                <div className="ft-bar-label">
                  <span>Google aramalarından</span>
                  <strong>%29</strong>
                </div>
                <div className="ft-bar-track">
                  <span className="ft-bar-fill is-w29" />
                </div>
              </div>
              <div className="ft-bar-row">
                <div className="ft-bar-label">
                  <span>Odanızdaki QR koddan</span>
                  <strong>%15</strong>
                </div>
                <div className="ft-bar-track">
                  <span className="ft-bar-fill is-w15" />
                </div>
              </div>
              <div className="ft-bar-row">
                <div className="ft-bar-label">
                  <span>Meslektaş önerisinden</span>
                  <strong>%8</strong>
                </div>
                <div className="ft-bar-track">
                  <span className="ft-bar-fill is-w8" />
                </div>
              </div>
            </div>
          </div>
        );

      case "meslektas-agi":
      default:
        return (
          <div className="ft-demo-card ft-demo-network">
            <div className="ft-network-nodes">
              <div className="ft-network-node is-center">
                <UsersRound size={20} aria-hidden="true" />
                <strong>Sizin profiliniz</strong>
                <span>Yetişkin terapisi</span>
              </div>
              <div className="ft-network-connector" aria-hidden="true">
                <span className="ft-connector-pulse" />
              </div>
              <div className="ft-network-node is-peer">
                <HeartHandshake size={20} aria-hidden="true" />
                <strong>Meslektaşınız</strong>
                <span>Çocuk ve ergen</span>
              </div>
            </div>
            <div className="ft-network-referral-pill">
              <code>terapist.co/r/zeynepdemir</code>
              <span>
                Çalışmadığınız bir konuda danışanınızı tek bağlantıyla
                güvendiğiniz meslektaşınıza yönlendirin.
              </span>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="home-page therapist-home lt-landing-flow features-page-flow">
      <section
        className="home-hero lt-hero-stage features-hero-stage ft-clean-hero"
        aria-labelledby="features-page-title"
      >
        <div className="home-hero-copy lt-hero-copy">
          <div className="seo-breadcrumb-row">
            <Link to="/" className="seo-breadcrumb-link">
              Ana sayfa
            </Link>
            <span aria-hidden="true">/</span>
            <span className="eyebrow lt-eyebrow-pill">
              <Sparkles size={13} aria-hidden="true" />
              TERAPİST.CO ÖZELLİK STÜDYOSU
            </span>
          </div>

          <h1 id="features-page-title">
            Psikolog ve terapistler için
            <br />
            <em>tüm dijital araçlar tek adreste!</em>
          </h1>

          <p className="lt-hero-lead">
            Ayrı ayrı web sitesi, takvim veya form programlarıyla uğraşmayın.
            İsminize özel <strong>terapist.co/adiniz</strong> adresinizde
            kendinizi tanıtın, kolayca randevu alın ve danışanlarınızla güvenle
            form paylaşın.
          </p>

          <div className="ft-hero-value-pills">
            <span className="ft-hero-value-pill">
              <Check size={15} aria-hidden="true" />
              <span>Kodlama veya teknik bilgi gerekmez</span>
            </span>
            <span className="ft-hero-value-pill">
              <Check size={15} aria-hidden="true" />
              <span>3 dakikada hazır profil</span>
            </span>
            <span className="ft-hero-value-pill">
              <Check size={15} aria-hidden="true" />
              <span>%0 seans komisyonu</span>
            </span>
          </div>
        </div>

        <div
          className="ft-hero-mosaic"
          aria-label="Terapist.co dijital araçlar özeti"
        >
          <div className="ft-mosaic-center-card">
            <span className="ft-mosaic-tag">MERKEZ ADRESİNİZ</span>
            <strong>terapist.co/adiniz</strong>
            <p>Tüm mesleki dünyanız tek bir sade bağlantıda birleşir.</p>
          </div>
          <div className="ft-mosaic-mini-grid">
            {DETAILED_FEATURE_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeFeatureId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  className={`ft-mosaic-node${isSelected ? " is-active" : ""}`}
                  onClick={() => {
                    setActiveFeatureId(sec.id);
                    document
                      .getElementById("ozellik-secici-studyo")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{sec.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="ozellik-secici-studyo"
        className="home-section lt-tonal-section lt-tonal-sky ft-explorer-section"
        aria-labelledby="explorer-heading"
      >
        <div className="home-section-heading lt-section-heading lt-bento-heading-compact">
          <span className="eyebrow lt-eyebrow-pill">6 TEMEL ÖZELLİK</span>
          <h2 id="explorer-heading">
            Bir özellik seçin, nasıl çalıştığını deneyin.
          </h2>
          <p>
            Sayfalarca aşağı kaydırmadan tüm özellikleri tek ekranda
            inceleyebilirsiniz.
          </p>
        </div>

        <div className="ft-explorer-workspace">
          <div
            className="ft-explorer-nav-grid"
            role="tablist"
            aria-label="Özellik seçici"
          >
            {DETAILED_FEATURE_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = sec.id === activeFeature.id;
              return (
                <button
                  key={sec.id}
                  id={sec.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="ft-explorer-stage-panel"
                  className={`ft-selector-card${isActive ? " is-active" : ""}`}
                  onClick={() => setActiveFeatureId(sec.id)}
                >
                  <div className="ft-selector-top">
                    <span className="ft-selector-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <span className="ft-selector-num">{sec.number}</span>
                  </div>
                  <strong>{sec.shortTitle}</strong>
                  <span className="ft-selector-badge">{sec.badge}</span>
                </button>
              );
            })}
          </div>

          <div
            id="ft-explorer-stage-panel"
            role="tabpanel"
            aria-labelledby={activeFeature.id}
            key={activeFeature.id}
            className="ft-explorer-stage-card"
          >
            <div className="ft-explorer-stage-copy">
              <div className="ft-deep-badge-row">
                <span className="home-feature-icon" aria-hidden="true">
                  <ActiveIcon size={20} />
                </span>
                <span className="eyebrow lt-eyebrow-pill">
                  {activeFeature.badge}
                </span>
              </div>

              <h3>{activeFeature.title}</h3>
              <p className="ft-deep-lead">{activeFeature.subtitle}</p>

              <p className="ft-persuasion-quote">{activeFeature.simpleNote}</p>

              <ul className="lt-feature-bullets ft-deep-bullets">
                {activeFeature.bullets.map((bullet) => (
                  <li key={bullet}>
                    <Check size={16} aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="ft-deep-links-row">
                <Link
                  to={activeFeature.relatedLink.to}
                  className="ft-inline-seo-link is-secondary"
                >
                  <span>{activeFeature.relatedLink.label}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="ft-explorer-stage-demo">
              {renderFeatureInteractiveDemo(activeFeature.id)}
            </div>
          </div>
        </div>
      </section>

      <section
        id="alan-adini-sahiplen"
        className="home-section lt-tonal-section lt-tonal-navy ft-closing-claim-section"
        aria-labelledby="features-closing-title"
      >
        <div className="ft-closing-claim-inner">
          <div className="home-section-heading lt-section-heading lt-heading-on-dark">
            <span className="eyebrow lt-eyebrow-pill is-dark">
              HEMEN BAŞLAYIN · 3 DAKİKADA KURULUM
            </span>
            <h2 id="features-closing-title">
              İsminize özel profil adresinizi seçin ve profilinizi oluşturun.
            </h2>
            <p>
              Adınızı aşağıya yazarak adresinizin boş olup olmadığını hemen
              görün ve başvuru adımına geçin.
            </p>
          </div>

          <form
            className="home-claim-form lt-bottom-claim-card ft-bottom-claim-form"
            aria-label="Profil adresini seç ve başvuruya başla"
            onSubmit={(event) => {
              event.preventDefault();
              const slugToUse = slugifyTurkishName(bottomSlug);
              if (bottomAvailable && slugToUse.length >= 3) {
                navigate(
                  `/basvuru?kullanici_adi=${encodeURIComponent(slugToUse)}`,
                );
              } else if (slugToUse.length >= 3) {
                navigate(
                  `/basvuru?kullanici_adi=${encodeURIComponent(slugToUse)}`,
                );
              } else {
                navigate("/basvuru");
              }
            }}
          >
            <UsernameField
              inputId="ozellikler-alt-kullanici-adi"
              value={bottomSlug}
              onChange={setBottomSlug}
              onAvailabilityChange={setBottomAvailable}
            />
            <button className="button lt-pill-btn" type="submit">
              <span>
                {bottomSlug.trim().length >= 3
                  ? `terapist.co/${slugifyTurkishName(bottomSlug)} ile başvur`
                  : "Profil adresini seç ve başvur"}
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
