import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { slugifyTurkishName, UsernameField } from "../components/UsernameField";
import { DEFAULT_TITLE, usePageMetadata } from "../lib/seoMetadata";
import {
  SEO_FOOTER_GROUPS,
  SEO_PAGES,
  SEO_PAGES_BY_PATH,
  SEO_PAGES_BY_SLUG,
  SeoCategory,
  SeoPageData,
} from "../data/seoPages";

export function SeoHubPage({
  initialCategory,
}: {
  initialCategory?: SeoCategory;
}) {
  const navigate = useNavigate();
  const [heroSlug, setHeroSlug] = useState("ardaekintuncay");
  const [activeFilter, setActiveFilter] = useState<SeoCategory | "all">(
    initialCategory ?? "all",
  );

  useEffect(() => {
    setActiveFilter(initialCategory ?? "all");
  }, [initialCategory]);

  const hubPath = initialCategory ? `/${initialCategory}` : "/cozumler";
  const hubCopy: Record<
    string,
    {
      label: string;
      title: string;
      description: string;
      eyebrow: string;
      h1Lead: string;
      h1Accent: string;
      lead: string;
    }
  > = {
    "/karsilastirma": {
      label: "Karşılaştırmalar",
      title:
        "Terapist.co Karşılaştırmalar · Linktree, Web Sitesi, Calendly ve Pazaryerleri",
      description:
        "Terapist.co vs Linktr.ee, Klasik Web Sitesi, Calendly ve Pazaryerleri karşılaştırmaları; ruh sağlığı uzmanları için maliyet, KVKK ve randevu analizi.",
      eyebrow: "KARŞILAŞTIRMA MERKEZİ",
      h1Lead: "Size özel klinik altyapıyı",
      h1Accent: "tüm alternatiflerle karşılaştırın!",
      lead: "Linktr.ee, klasik web siteleri, genel takvim araçları ve komisyonlu pazaryerleri yerine neden ruh sağlığı uzmanları için tasarlanmış tekil bir vitrin seçmelisiniz?",
    },
    "/cozumler": {
      label: "Klinik Çözümler",
      title:
        "Terapist.co Klinik Çözümler · Link in Bio, Randevu Takvimi, Şifreli Formlar",
      description:
        "Psikologlar için Link in Bio, online terapi randevu takvimi, şifreli BDT/Şema formları, klinik QR masa kartı ve doğrulanmış meslektaş ağı.",
      eyebrow: "KLİNİK ÇÖZÜMLER",
      h1Lead: "Klinik pratiğiniz için tek çatı:",
      h1Accent: "randevu, şifreli form ve QR kimlik!",
      lead: "Psikologlar için Link in Bio, online terapi randevu takvimi, şifreli BDT/Şema ön görüşme formları, dinamik QR masa kartı ve doğrulanmış meslektaş ağı.",
    },
    "/rehber": {
      label: "Uzman Rehberleri",
      title:
        "Klinik Psikologlar ve Terapistler İçin Dijital Rehberler | terapist.co",
      description:
        "Klinik psikolog dijital kimlik, BDT/Şema ve Çift/EMDR terapistleri için pratik kurulum ve terapide KVKK veri minimizasyonu rehberleri.",
      eyebrow: "UZMAN REHBERLERİ",
      h1Lead: "Ruh sağlığı uzmanları için",
      h1Accent: "dijital kimlik, SEO ve KVKK rehberleri!",
      lead: "Klinik psikolog dijital kimlik kurulumu, BDT/Şema ve Çift/EMDR pratiklerine özel profil mimarisi ve terapide KVKK veri minimizasyonu ilkeleri.",
    },
  };
  const currentHub = hubCopy[hubPath] ?? hubCopy["/cozumler"];
  usePageMetadata({
    title: currentHub.title,
    description: currentHub.description,
    path: hubPath,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: currentHub.title,
          url: `https://terapist.co${hubPath}`,
          inLanguage: "tr",
          isPartOf: { "@id": "https://terapist.co/#website" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Ana Sayfa",
              item: "https://terapist.co/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: currentHub.label,
              item: `https://terapist.co${hubPath}`,
            },
          ],
        },
      ],
    },
  });

  const normalizedSlug = slugifyTurkishName(heroSlug);
  const filteredPages =
    activeFilter === "all"
      ? SEO_PAGES
      : SEO_PAGES.filter((page) => page.category === activeFilter);

  return (
    <div className="home-flow lt-landing-flow seo-landing-flow">
      <section
        className="home-hero lt-hero-stage seo-hub-hero"
        aria-labelledby="seo-hub-title"
      >
        <div className="home-hero-copy lt-hero-copy">
          <span className="eyebrow lt-eyebrow-pill">
            <Sparkles size={13} aria-hidden="true" />
            {currentHub.eyebrow}
          </span>
          <h1 id="seo-hub-title">
            {currentHub.h1Lead}
            <br />
            <em>{currentHub.h1Accent}</em>
          </h1>
          <p className="lt-hero-lead">{currentHub.lead}</p>

          <form
            className="lt-hero-claim-form"
            aria-label="Hızlı profil adresi sahiplenme"
            onSubmit={(event) => {
              event.preventDefault();
              if (normalizedSlug.length >= 3) {
                navigate(
                  `/basvuru?kullanici_adi=${encodeURIComponent(normalizedSlug)}`,
                );
              } else {
                navigate("/basvuru");
              }
            }}
          >
            <label
              className="lt-claim-input-pill"
              htmlFor="seo-hub-claim-input"
            >
              <span className="lt-claim-prefix">terapist.co/</span>
              <input
                id="seo-hub-claim-input"
                type="text"
                value={heroSlug}
                onChange={(event) =>
                  setHeroSlug(slugifyTurkishName(event.target.value))
                }
                placeholder="kullaniciadiniz"
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
              />
            </label>
            <button className="lt-claim-cta-pill" type="submit">
              <span>Profil adresini sahiplen</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="seo-hero-summary-card">
          <div className="seo-hero-summary-head">
            <span className="seo-summary-badge">HIZLI BAKIŞ</span>
            <h2>Terapist.co Neden Farklı?</h2>
            <p>
              Genel amaçlı link ve takvim araçlarının aksine yalnızca ruh
              sağlığı uzmanlarının klinik ihtiyaçları için tasarlandı.
            </p>
          </div>
          <ul className="seo-hero-checklist">
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>
                <strong>Doğrulanmış Uzman &amp; Founding Rozeti</strong>
                <span>Yönetici incelemesinden geçmiş güvenilir kimlik</span>
              </div>
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>
                <strong>Şifreli BDT &amp; Şema Formları (Link Lock)</strong>
                <span>
                  Sadece PIN şifresini bilen danışanlara özel ölçekler
                </span>
              </div>
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>
                <strong>Google Takvim &amp; Bekleme Listesi</strong>
                <span>
                  Çakışmaları önleyen takvim ve dolu kontenjan yönetimi
                </span>
              </div>
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>
                <strong>%0 Komisyon &amp; KVKK Veri Minimasyonu</strong>
                <span>Tanı veya terapi notu tutmayan bağımsız mimari</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section
        className="home-section lt-tonal-section lt-tonal-ivory"
        aria-labelledby="seo-catalog-heading"
      >
        <div className="home-section-heading lt-section-heading">
          <span className="eyebrow lt-eyebrow-pill">
            TÜM REHBER VE KARŞILAŞTIRMALAR
          </span>
          <h2 id="seo-catalog-heading">
            Klinik pratiğiniz için doğru araçları inceleyin.
          </h2>
          <p>
            Karşılaştırma tabloları, kullanım senaryoları ve terapi ekollerine
            özel dijital pratik rehberleri.
          </p>
        </div>

        <div
          className="seo-hub-filter-pills"
          role="tablist"
          aria-label="İçerik kategorileri"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "all"}
            className={`seo-filter-pill${activeFilter === "all" ? " is-active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Tümü ({SEO_PAGES.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "karsilastirma"}
            className={`seo-filter-pill${activeFilter === "karsilastirma" ? " is-active" : ""}`}
            onClick={() => setActiveFilter("karsilastirma")}
          >
            <Scale size={15} aria-hidden="true" />
            Karşılaştırmalar ({SEO_FOOTER_GROUPS.karsilastirma.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "cozumler"}
            className={`seo-filter-pill${activeFilter === "cozumler" ? " is-active" : ""}`}
            onClick={() => setActiveFilter("cozumler")}
          >
            <Layers size={15} aria-hidden="true" />
            Klinik Çözümler ({SEO_FOOTER_GROUPS.cozumler.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "rehber"}
            className={`seo-filter-pill${activeFilter === "rehber" ? " is-active" : ""}`}
            onClick={() => setActiveFilter("rehber")}
          >
            <BookOpen size={15} aria-hidden="true" />
            Uzman Rehberleri ({SEO_FOOTER_GROUPS.rehber.length})
          </button>
        </div>

        <div className="home-feature-grid lt-bento-grid seo-hub-grid">
          {filteredPages.map((item) => (
            <article
              key={item.path}
              className="home-feature-card lt-bento-card seo-hub-card"
            >
              <div className="home-feature-top">
                <span className="home-feature-icon" aria-hidden="true">
                  {item.category === "karsilastirma" ? (
                    <Scale size={21} />
                  ) : item.category === "cozumler" ? (
                    <Layers size={21} />
                  ) : (
                    <BookOpen size={21} />
                  )}
                </span>
                <span className="home-feature-badge">{item.categoryLabel}</span>
              </div>
              <h3>
                <Link to={item.path} className="seo-card-title-link">
                  {item.titleDark} {item.titleAccent}
                </Link>
              </h3>
              <p>{item.lead}</p>
              <Link to={item.path} className="seo-card-cta">
                <span>İncelemeyi oku</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SeoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const page: SeoPageData | undefined =
    SEO_PAGES_BY_PATH[location.pathname] ??
    (slug ? SEO_PAGES_BY_SLUG[slug] : undefined);

  const [heroSlug, setHeroSlug] = useState("ardaekintuncay");
  const [bottomSlug, setBottomSlug] = useState("");
  const [bottomAvailable, setBottomAvailable] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);

  const categoryLabelMap: Record<SeoCategory, string> = {
    karsilastirma: "Karşılaştırmalar",
    cozumler: "Klinik Çözümler",
    rehber: "Uzman Rehberleri",
  };
  const pageJsonLd = page
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": page.category === "rehber" ? "Article" : "WebPage",
            ...(page.category === "rehber"
              ? { headline: page.metaTitle }
              : { name: page.metaTitle }),
            description: page.metaDescription,
            url: `https://terapist.co${page.path}`,
            inLanguage: "tr",
            publisher: {
              "@type": "Organization",
              "@id": "https://terapist.co/#organization",
              name: "terapist.co",
              url: "https://terapist.co/",
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Ana Sayfa",
                item: "https://terapist.co/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: categoryLabelMap[page.category],
                item: `https://terapist.co/${page.category}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: page.eyebrow,
                item: `https://terapist.co${page.path}`,
              },
            ],
          },
          {
            "@type": "FAQPage",
            mainEntity: page.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          },
        ],
      }
    : null;

  usePageMetadata({
    title: page?.metaTitle ?? DEFAULT_TITLE,
    description:
      page?.metaDescription ??
      "Klinik psikologlar ve terapistler için doğrulanmış dijital profil, randevu takvimi ve şifreli form altyapısı.",
    path: page?.path ?? location.pathname,
    ogType: page?.category === "rehber" ? "article" : "website",
    jsonLd: pageJsonLd,
  });

  useEffect(() => {
    setOpenFaqIdx(0);
  }, [location.pathname]);

  if (!page) {
    return <SeoHubPage />;
  }

  const normalizedHeroSlug = slugifyTurkishName(heroSlug);
  const others = SEO_PAGES.filter((item) => item.slug !== page.slug);
  const relatedPages = [
    ...others.filter((item) => item.category === "karsilastirma").slice(0, 2),
    ...others.filter((item) => item.category === "cozumler").slice(0, 2),
    ...others.filter((item) => item.category === "rehber").slice(0, 2),
  ];

  return (
    <div className="home-flow lt-landing-flow seo-landing-flow">
      <section
        className="home-hero lt-hero-stage seo-detail-hero"
        aria-labelledby="seo-page-title"
      >
        <div className="home-hero-copy lt-hero-copy">
          <div className="seo-breadcrumb-row">
            <Link to={`/${page.category}`} className="seo-breadcrumb-link">
              {categoryLabelMap[page.category]}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="eyebrow lt-eyebrow-pill">{page.eyebrow}</span>
          </div>

          <h1 id="seo-page-title">
            {page.titleDark}
            <br />
            <em>{page.titleAccent}</em>
          </h1>

          <p className="lt-hero-lead">{page.lead}</p>

          <form
            className="lt-hero-claim-form"
            aria-label="Hızlı profil adresi sahiplenme"
            onSubmit={(event) => {
              event.preventDefault();
              if (normalizedHeroSlug.length >= 3) {
                navigate(
                  `/basvuru?kullanici_adi=${encodeURIComponent(normalizedHeroSlug)}`,
                );
              } else {
                navigate("/basvuru");
              }
            }}
          >
            <label
              className="lt-claim-input-pill"
              htmlFor="seo-hero-claim-input"
            >
              <span className="lt-claim-prefix">terapist.co/</span>
              <input
                id="seo-hero-claim-input"
                type="text"
                value={heroSlug}
                onChange={(event) =>
                  setHeroSlug(slugifyTurkishName(event.target.value))
                }
                placeholder="kullaniciadiniz"
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
              />
            </label>
            <button className="lt-claim-cta-pill" type="submit">
              <span>Profil adresini sahiplen</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="home-claim-note lt-hero-trust-note">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>
              Doğrulanmış uzman rozeti · %0 seans komisyonu · KVKK veri
              minimasyonu
            </span>
          </p>
        </div>

        <aside
          className="seo-versus-card"
          aria-label="Hızlı karşılaştırma özeti"
        >
          <div className="seo-versus-header">
            <div className="seo-versus-pill is-terapist">
              <strong>terapist.co</strong>
              <span>{page.terapistTagline}</span>
            </div>
            <span className="seo-versus-badge">VS</span>
            <div className="seo-versus-pill is-competitor">
              <strong>{page.competitorName}</strong>
              <span>{page.competitorTagline}</span>
            </div>
          </div>

          <div className="seo-metrics-list">
            {page.heroMetrics.map((metric) => (
              <div key={metric.label} className="seo-metric-row">
                <span className="seo-metric-label">{metric.label}</span>
                <div className="seo-metric-values">
                  <span className="seo-metric-good">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {metric.terapistValue}
                  </span>
                  <span className="seo-metric-other">
                    <XCircle size={15} aria-hidden="true" />
                    {metric.competitorValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section
        className="home-section lt-tonal-section lt-tonal-ivory"
        aria-labelledby="comparison-table-title"
      >
        <div className="home-section-heading lt-section-heading">
          <span className="eyebrow lt-eyebrow-pill">
            DETAYLI KARŞILAŞTIRMA TABLOSU
          </span>
          <h2 id="comparison-table-title">{page.comparisonTitle}</h2>
          <p>{page.comparisonSubtitle}</p>
        </div>

        <div className="seo-comparison-table-wrap">
          <table className="seo-comparison-table">
            <thead>
              <tr>
                <th scope="col">Klinik Kriter &amp; Özellik</th>
                <th scope="col" className="is-terapist-col">
                  terapist.co
                </th>
                <th scope="col">{page.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {page.comparisonRows.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td className="is-terapist-col" data-label="terapist.co">
                    <div className="seo-cell-with-icon is-positive">
                      <CheckCircle2 size={18} aria-hidden="true" />
                      <span>{row.terapistCo}</span>
                    </div>
                  </td>
                  <td data-label={page.competitorName}>
                    <div className="seo-cell-with-icon is-neutral">
                      <XCircle size={18} aria-hidden="true" />
                      <span>{row.competitor}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="home-section home-dark-band lt-tonal-section lt-tonal-navy"
        aria-labelledby="seo-pillars-title"
      >
        <div className="home-dark-inner">
          <div className="home-section-heading lt-section-heading">
            <span className="eyebrow lt-eyebrow-pill is-dark">
              {page.pillarsEyebrow}
            </span>
            <h2 id="seo-pillars-title">{page.pillarsTitle}</h2>
            <p>{page.pillarsSubtitle}</p>
          </div>
          <div className="home-step-grid lt-dark-cards-grid">
            {page.pillars.map((pillar) => (
              <article key={pillar.title} className="home-step lt-dark-card">
                <span className="seo-pillar-badge">{pillar.badge}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="home-section home-for-therapists lt-tonal-section lt-tonal-CobaltSoft"
        aria-labelledby="seo-steps-title"
      >
        <div className="home-section-heading lt-section-heading">
          <span className="eyebrow lt-eyebrow-pill">HIZLI GEÇİŞ ADIMLARI</span>
          <h2 id="seo-steps-title">{page.stepsTitle}</h2>
          <p>{page.stepsSubtitle}</p>
        </div>
        <div className="home-therapist-grid lt-steps-row">
          {page.steps.map((step) => (
            <div key={step.number} className="lt-step-card">
              <span className="home-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>

        <form
          className="home-claim-form lt-bottom-claim-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (bottomAvailable) {
              navigate(
                `/basvuru?kullanici_adi=${encodeURIComponent(bottomSlug)}`,
              );
            } else {
              navigate("/basvuru");
            }
          }}
        >
          <UsernameField
            inputId="seo-alt-kullanici-adi"
            value={bottomSlug}
            onChange={setBottomSlug}
            onAvailabilityChange={setBottomAvailable}
          />
          <button className="button lt-pill-btn" type="submit">
            {bottomAvailable ? "Bu adresle başvur" : "Profil başvurusu yap"}{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </section>

      <section
        className="home-section home-faq-section lt-tonal-section lt-tonal-faq"
        aria-labelledby="seo-faq-title"
      >
        <div className="home-faq-shell lt-faq-shell">
          <header className="home-faq-header">
            <div className="home-faq-badge-row">
              <span className="home-faq-sole-tab">
                <ShieldCheck size={14} aria-hidden="true" />
                {page.categoryLabel}
              </span>
              <span className="eyebrow">SIKÇA SORULAN SORULAR</span>
            </div>
            <h2 id="seo-faq-title">Merak edilen sorular ve yanıtlar.</h2>
          </header>

          <div className="home-faq-list lt-faq-list">
            {page.faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              const btnId = `seo-faq-btn-${idx}`;
              const panelId = `seo-faq-panel-${idx}`;
              return (
                <article
                  key={faq.question}
                  className={`home-faq-item lt-faq-pill-item${isOpen ? " is-open" : ""}`}
                >
                  <h3>
                    <button
                      id={btnId}
                      type="button"
                      className="home-faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                    >
                      <span className="home-faq-trigger-lead">
                        <span className="home-faq-index" aria-hidden="true">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span>{faq.question}</span>
                      </span>
                      <span className="home-faq-chevron" aria-hidden="true">
                        <ChevronDown size={18} />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    hidden={!isOpen}
                    className="home-faq-panel"
                  >
                    <p>{faq.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="home-faq-cta-box lt-closing-banner">
            <div className="home-faq-cta-copy">
              <strong>Kişisel terapist.co adresinizi bugün sahiplenin</strong>
              <p>
                Doğrulanmış uzman profilinizi, şifreli formlarınızı ve randevu
                takviminizi tek bir bağlantıda birleştirin.
              </p>
            </div>
            <div className="home-faq-cta-actions">
              <Link to="/basvuru" className="button lt-pill-btn">
                Uzman başvurusu başlat{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/kesfet" className="button secondary lt-pill-btn">
                Profilleri incele
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="home-section lt-tonal-section lt-tonal-sky"
        aria-labelledby="related-seo-title"
      >
        <div className="home-section-heading lt-section-heading">
          <span className="eyebrow lt-eyebrow-pill">
            İLGİLİ KARŞILAŞTIRMA &amp; REHBERLER
          </span>
          <h2 id="related-seo-title">Diğer uzman içeriklerini keşfedin.</h2>
          <p>
            Terapist.co altyapısının farklı kullanım senaryolarını ve platform
            karşılaştırmalarını inceleyin.
          </p>
        </div>

        <div className="home-feature-grid lt-bento-grid seo-related-grid">
          {relatedPages.map((item) => (
            <article
              key={item.path}
              className="home-feature-card lt-bento-card seo-hub-card"
            >
              <div className="home-feature-top">
                <span className="home-feature-icon" aria-hidden="true">
                  {item.category === "karsilastirma" ? (
                    <Scale size={20} />
                  ) : item.category === "cozumler" ? (
                    <Layers size={20} />
                  ) : (
                    <BookOpen size={20} />
                  )}
                </span>
                <span className="home-feature-badge">{item.categoryLabel}</span>
              </div>
              <h3>
                <Link to={item.path} className="seo-card-title-link">
                  {item.footerLabel}
                </Link>
              </h3>
              <p>{item.lead}</p>
              <Link to={item.path} className="seo-card-cta">
                <span>Sayfayı incele</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
