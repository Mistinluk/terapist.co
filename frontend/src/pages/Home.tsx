import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUp,
  AtSign,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  HeartHandshake,
  LockKeyhole,
  Mail,
  Palette,
  Share2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { slugifyTurkishName } from "../components/UsernameField";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  usePageMetadata,
} from "../lib/seoMetadata";

const setupSteps = [
  {
    number: "01",
    badge: "ADIM 01 · ~30 SN",
    title: "İsminize özel adresinizi ayırın",
    text: "Başkası almadan terapist.co/adiniz adresinizi seçin ve mesleki kimliğinizi güvenceye alın.",
    chips: ["terapist.co/adiniz", "Kalıcı URL"],
  },
  {
    number: "02",
    badge: "ADIM 02 · ~2 DK",
    title: "Uzmanlık bilgilerinizi ve takviminizi ekleyin",
    text: "Eğitimlerinizi, çalıştığınız ekolleri, şifreli formlarınızı ve görüşme saatlerinizi tanımlayın.",
    chips: ["Google Takvim", "Şifreli formlar"],
  },
  {
    number: "03",
    badge: "ADIM 03 · TEK LİNK",
    title: "Tek bağlantıyla her yerde paylaşın",
    text: "Doğrulama onayının ardından Instagram, LinkedIn ve Google profillerinizde, ayrıca QR kodunuzda aynı adresi kullanın.",
    chips: ["Instagram ve Google", "QR kodunuz"],
  },
];

export const HERO_ROTATING_ROLES = [
  "Psikolog",
  "Terapist",
  "Psikiyatr",
  "Klinik Psikolog",
  "Psikolojik Danışman",
  "Çift & Aile Terapisti",
];

const PLACEHOLDER_SLUGS = [
  "ardaekintuncay",
  "elifkaya",
  "zeynepdemir",
  "denizyaln",
];

type StaticSphereDot = {
  key: string;
  cx: string;
  cy: string;
  r: string;
  layer: "back" | "mid" | "front";
  band: "a" | "b" | "c";
};

const STATIC_SPHERE_DOTS: StaticSphereDot[] = (() => {
  const dots: StaticSphereDot[] = [];
  const count = 190;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = 158;
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * ringRadius;
    const z = Math.sin(theta) * ringRadius;
    const perspective = 1 / (1 - z * 0.26);
    const px = 230 + x * radius * perspective;
    const py = 230 + y * radius * perspective;
    const dotRadius = Math.max(1.4, (z + 1.35) * 1.85);
    const layer: "back" | "mid" | "front" =
      z < -0.2 ? "back" : z < 0.35 ? "mid" : "front";
    const band: "a" | "b" | "c" = i % 3 === 0 ? "a" : i % 3 === 1 ? "b" : "c";
    dots.push({
      key: `d-${i}`,
      cx: px.toFixed(1),
      cy: py.toFixed(1),
      r: dotRadius.toFixed(2),
      layer,
      band,
    });
  }
  return dots;
})();

const PLATFORM_FEATURES = [
  {
    id: "kisisel-adres",
    bentoRole: "hero",
    icon: AtSign,
    badge: "KİŞİSEL ADRES",
    title: "Size özel terapist.co/kullaniciadi",
    summary:
      "İsminiz başkası tarafından alınmadan kalıcı mesleki adresinizi bugün ayırın.",
    tags: ["Tire ve ek yok", "Doğrulanmış rozet", "Kurucu uzman halkası"],
    previewPill: "terapist.co/adiniz",
  },
  {
    id: "link-in-bio",
    bentoRole: "wide",
    icon: Palette,
    badge: "BİYOGRAFİ BAĞLANTISI",
    title: "Biyografiniz için tek bağlantı",
    summary:
      "4 klinik tema, gömülü Spotify/YouTube oynatıcıları ve marka gizleme desteğiyle tek bir vitrin.",
    tags: ["4 klinik tema", "Gömülü medya", "Marka gizleme özelliği"],
  },
  {
    id: "randevu-takvimi",
    bentoRole: "tile",
    icon: CalendarDays,
    badge: "RANDEVU",
    title: "Doğrudan randevu talebi",
    summary:
      "Google Takvim eşitlemesi ve kontenjanınız dolduğunda kullanabileceğiniz bekleme listesi.",
    tags: ["Google Takvim", "Bekleme listesi"],
  },
  {
    id: "sifreli-formlar",
    bentoRole: "tile",
    icon: LockKeyhole,
    badge: "ŞİFRELİ FORM VE QR",
    title: "Şifreli ölçek ve belge paylaşımı",
    summary:
      "PIN koduyla korunan BDT/Şema formlarını ve basıma hazır QR kodunuzu tek yerden sunun.",
    tags: ["PIN korumalı bağlantı", "QR kodunuz"],
  },
  {
    id: "analitik",
    bentoRole: "tile",
    icon: BarChart3,
    badge: "ANALİTİK",
    title: "Ziyaretçi istatistikleri",
    summary:
      "Ziyaretçi kaynaklarını ve randevu dönüşümlerini KVKK veri minimizasyonuyla izleyin.",
    tags: ["Trafik kaynakları", "KVKK uyumlu"],
  },
  {
    id: "meslektas-agi",
    bentoRole: "banner",
    icon: Share2,
    badge: "MESLEKTAŞ AĞI",
    title: "Meslektaşlarınızla iletişim kurun",
    summary:
      "Süpervizyon bağlarınızı görünür kılın, terapist.co/r/... ile danışanları etik biçimde yönlendirin.",
    tags: [
      "Onaylı mesleki bağ",
      "terapist.co/r/... yönlendirmesi",
      "Puanlamasız dizin",
    ],
  },
];

const FAQ_ITEMS: {
  id: string;
  question: string;
  answer: string;
}[] = [
  {
    id: "ana-kullanim-amaclari",
    question:
      "Terapist.co’nun ana kullanım amaçları nelerdir ve kimler katılabilir?",
    answer:
      "Terapist.co, psikoloji, klinik psikoloji, psikiyatri ve psikolojik danışmanlık alanlarında eğitimini tamamlamış ruh sağlığı uzmanları için kurulmuş doğrulanmış dijital vitrin ve çalışma alanıdır. Tek bir bağlantıda mesleki profilinizi ve içeriklerinizi sunmanıza, takvim ile bekleme listenizi yönetmenize ve doğrulanmış meslektaşlarınızla yönlendirme ağı kurmanıza olanak tanır.",
  },
  {
    id: "adres-ve-tasarim-studyo",
    question:
      "Özel profil adresimi (terapist.co/ardaekintuncay gibi) ve tasarımımı nasıl özelleştiririm?",
    answer:
      "Ana sayfadaki kutuya adınızı yazıp kullanıcı adınızı doğrudan belirleyebilir ve 4 adımlı başvuru sihirbazıyla profilinizi oluşturabilirsiniz. Onay sonrasında Çalışma Alanım › Görünüm ve QR kodu sekmesinden 4 tasarım tarzı (Klinik Modern, Editoryal Klinik, Doğal sakinlik, Yumuşak cam), 8 renk paleti veya özel HEX renk kodu, 6 düğme şekli, 4 yazı tipi ve arka plan seçebilir; yetkiniz dâhilinde marka gizleme (White-Label) özelliğiyle Terapist.co logosunu gizleyebilirsiniz.",
  },
  {
    id: "sifreli-link-ve-medya",
    question:
      "Değerlendirme formları, zamanlı etkinlikler ve medya içeriklerini nasıl paylaşırım?",
    answer:
      "Bağlantılarım bölümünde bağlantılarınızı Yazılar, Kitaplar ve Podcast gibi kategorilere ayırabilir; yalnızca parolasını paylaştığınız kişilerin açabileceği şifreli form bağlantıları (ör. BDT veya Şema Terapi ön formları) ekleyebilirsiniz. Grup terapisi kayıtları için başlangıç ve bitiş tarihi tanımlayabilir, acil iletişim düğmelerini vurgulayabilir, Spotify ve YouTube bağlantılarını sayfadan çıkılmadan çalacak biçimde gömebilirsiniz.",
  },
  {
    id: "takvim-google-ve-bekleme",
    question:
      "Haftalık takvimim, Google Takvim bağlantısı ve bekleme listesi nasıl işler?",
    answer:
      "Çalışma alanınızdan haftalık müsaitlik dilimlerinizi ve çevrim içi ve yüz yüze görüşme seçeneklerinizi tanımlayabilirsiniz. Google Takvim hesabınızı bağladığınızda sistem yalnızca meşgul/müsait zaman aralıklarını eşitleyip dolu saatlerinizi kapatır; özel etkinlik başlıklarınız asla paylaşılmaz. Takviminiz dolduğunda ise Bekleme Listesi özelliğini etkinleştirerek yeni başvuruları sıraya alabilirsiniz.",
  },
  {
    id: "qr-kart-ve-web-rozeti",
    question:
      "Dinamik QR kodunuz ve kendi web sitem için doğrulama rozeti nasıl kullanılır?",
    answer:
      "Görünüm stüdyosunda profil bağlantınıza özel QR kodunuz hazır olarak üretilir. Bunu görüşme odanız veya kartvizitiniz için yüksek çözünürlüklü PNG masa kartı ya da vektör SVG olarak indirebilirsiniz. Web Sitesi Rozeti sekmesindeki yerleştirme koduyla da onaylı uzman rozetinizi kişisel web sitenize kolayca ekleyebilirsiniz.",
  },
  {
    id: "meslektas-agi-yonlendirme",
    question:
      "Meslektaş ağı ve özel referans yönlendirmesi (terapist.co/r/...) pratiğime ne sağlar?",
    answer:
      "Doğrulanmış meslektaşlarınızla eğitim, süpervizyon veya birlikte çalışma bağlamında profesyonel bağ kurabilir, birbirinizi profilinizde önerebilirsiniz. Takviminizin dolu olduğu veya uzmanlık alanınız dışında kalan konularda kendi çalışma alanınızdan özel yönlendirme bağlantısı (terapist.co/r/...) oluşturarak uygun meslektaşınıza etik ve ölçülebilir yönlendirme yapabilirsiniz.",
  },
  {
    id: "dogrulama-ve-kurucu-rozet",
    question:
      "Başvuru incelemesi, Doğrulanmış Uzman rozeti ve Kurucu terapist statüsü nasıl çalışır?",
    answer:
      "Başvurunuzu gönderdikten sonra eğitim, unvan ve mesleki bilgileriniz yönetici ekibimizce incelenir; onay verilmeden profiliniz dizinde listelenmez. Onaylanan profillerde ismin yanında Doğrulanmış Uzman rozeti yer alır; platformun ilk uzmanları arasında yer alan terapistlerde ise Kurucu terapist numarası profil görseli etrafındaki özel halka ile gösterilir.",
  },
  {
    id: "analitik-kvkk-guvenlik",
    question:
      "Profil analitiğimden neleri izleyebilirim ve veri gizliliği nasıl korunur?",
    answer:
      "Analitik sekmesinde profilinizin toplam ve tekil ziyaretçi sayılarını, Instagram, Google, QR veya yönlendirme bağlantısı gibi trafik kaynaklarını ve bağlantı tıklama dönüşümlerini günlük trendlerle görebilirsiniz. Terapist.co klinik vaka kaydı tutma veya seans notu aracı değildir; randevu ve bekleme listesi formlarında tanı ya da klinik öykü istenmez, iletişim verileri şifreli saklanır ve hesabınız iki aşamalı doğrulama (MFA/TOTP) ile korunur.",
  },
];

function FlowingParticleSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setHydrated(true);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 460;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const particleCount = 310;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const basePoints = Array.from({ length: particleCount }, (_, i) => {
      const y = 1 - (i / (particleCount - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      return {
        bx: Math.cos(theta) * r,
        by: y,
        bz: Math.sin(theta) * r,
        phase: i * 0.19,
      };
    });

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frameId = 0;
    const startTime = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = reducedMotion ? 0 : (now - startTime) * 0.001;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const centerX = size * 0.5;
      // Akıyormuş gibi aşağı yukarı süzülme hareketi
      const verticalBob = Math.sin(elapsed * 1.45) * 14;
      const centerY = size * 0.5 + verticalBob;
      const sphereRadius = 164;

      // Küre merkezinde yumuşak kobalt-buz ışıması
      const glow = ctx.createRadialGradient(
        centerX - 18,
        centerY - 22,
        16,
        centerX,
        centerY,
        sphereRadius * 1.22,
      );
      glow.addColorStop(0, "rgba(52, 89, 209, 0.22)");
      glow.addColorStop(0.55, "rgba(36, 69, 174, 0.08)");
      glow.addColorStop(1, "rgba(52, 89, 209, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius * 1.22, 0, Math.PI * 2);
      ctx.fill();

      const rotY = elapsed * 0.52;
      const rotX = Math.sin(elapsed * 0.7) * 0.28 + 0.22;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const projected = basePoints.map((p) => {
        // Küre yüzeyinde aşağı-yukarı akan dalga hareketi
        const flowWave =
          Math.sin(p.by * 4.2 - elapsed * 2.4 + p.phase * 0.25) * 0.065;
        const radialPulse =
          1 + Math.cos(p.by * 3.2 + elapsed * 1.9 + p.phase * 0.15) * 0.04;

        const nx = p.bx * radialPulse;
        const ny = (p.by + flowWave) * radialPulse;
        const nz = p.bz * radialPulse;

        // Y ekseni dönüşü
        const x1 = nx * cosY - nz * sinY;
        const z1 = nx * sinY + nz * cosY;
        // X ekseni eğimi
        const y2 = ny * cosX - z1 * sinX;
        const z2 = ny * sinX + z1 * cosX;

        const depth = 1 / (1 - z2 * 0.28);
        const sx = centerX + x1 * sphereRadius * depth;
        const sy = centerY + y2 * sphereRadius * depth;

        return { sx, sy, z: z2, depth, phase: p.phase };
      });

      projected.sort((a, b) => a.z - b.z);

      for (const pt of projected) {
        const normZ = (pt.z + 1.15) / 2.3; // 0..1
        const alpha = Math.max(0.14, Math.min(0.96, 0.16 + normZ * 0.82));
        const dotR = Math.max(1.25, (0.9 + normZ * 2.55) * pt.depth * 0.92);

        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, dotR, 0, Math.PI * 2);
        if (normZ > 0.72) {
          ctx.fillStyle = `rgba(15, 23, 42, ${alpha.toFixed(3)})`;
        } else if (normZ > 0.42) {
          ctx.fillStyle = `rgba(36, 69, 174, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(52, 89, 209, ${(alpha * 0.78).toFixed(3)})`;
        }
        ctx.fill();
      }

      if (!reducedMotion) {
        frameId = window.requestAnimationFrame(renderFrame);
      }
    };

    frameId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className={`lt-sphere-stage${hydrated ? " is-canvas-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="lt-sphere-ambient-ring lt-ring-outer" />
      <div className="lt-sphere-ambient-ring lt-ring-inner" />
      <canvas
        ref={canvasRef}
        className="lt-particle-sphere-canvas"
        width={460}
        height={460}
      />
      <svg
        className="lt-particle-sphere-svg"
        viewBox="0 0 460 460"
        focusable="false"
      >
        <defs>
          <radialGradient id="ltSphereGlow" cx="46%" cy="44%" r="54%">
            <stop offset="0%" stopColor="#3459d1" stopOpacity="0.24" />
            <stop offset="65%" stopColor="#2445ae" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3459d1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="230" cy="230" r="184" fill="url(#ltSphereGlow)" />
        <g className="lt-sphere-svg-group">
          {STATIC_SPHERE_DOTS.map((dot) => (
            <circle
              key={dot.key}
              className={`lt-sphere-dot is-${dot.layer} band-${dot.band}`}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function Home() {
  usePageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  });
  const navigate = useNavigate();
  const heroInputRef = useRef<HTMLInputElement>(null);
  const heroFormRef = useRef<HTMLFormElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [heroInput, setHeroInput] = useState("");
  const [showcaseIdx, setShowcaseIdx] = useState(0);
  const [roleIdx, setRoleIdx] = useState(0);
  const [rolePaused, setRolePaused] = useState(false);
  const [heroHighlighted, setHeroHighlighted] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string>(FAQ_ITEMS[0].id);

  const customSlug = slugifyTurkishName(heroInput);

  useEffect(() => {
    return () => {
      if (scrollAnimRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimRef.current);
      }
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  function scrollToHeroClaim() {
    const formEl = heroFormRef.current;
    const inputEl = heroInputRef.current;
    if (!formEl) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const triggerHighlight = () => {
      inputEl?.focus({ preventScroll: true });
      setHeroHighlighted(true);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHeroHighlighted(false);
      }, 1500);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      formEl.scrollIntoView({ block: "center" });
      triggerHighlight();
      return;
    }

    if (scrollAnimRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimRef.current);
    }

    const startY = window.scrollY;
    const rect = formEl.getBoundingClientRect();
    const targetY = Math.max(
      0,
      startY + rect.top - Math.round(window.innerHeight * 0.34),
    );
    const distance = targetY - startY;
    const duration = 950;
    const startTime = performance.now();

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        scrollAnimRef.current = window.requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
        triggerHighlight();
      }
    };

    scrollAnimRef.current = window.requestAnimationFrame(step);
  }

  useEffect(() => {
    if (heroInput.trim()) return;
    const timer = window.setInterval(() => {
      setShowcaseIdx((prev) => (prev + 1) % PLACEHOLDER_SLUGS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [heroInput]);

  useEffect(() => {
    if (rolePaused) return;
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setRoleIdx((prev) => (prev + 1) % HERO_ROTATING_ROLES.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [rolePaused]);

  const activePlaceholder = PLACEHOLDER_SLUGS[showcaseIdx];
  const activeRole = HERO_ROTATING_ROLES[roleIdx];

  return (
    <div className="home-page therapist-home lt-landing-flow">
      <section className="home-hero lt-hero-stage" aria-labelledby="home-title">
        <div className="home-hero-copy lt-hero-copy">
          <span className="eyebrow lt-eyebrow-pill">
            <Sparkles size={13} aria-hidden="true" />
            RUH SAĞLIĞI UZMANLARI İÇİN DOĞRULANMIŞ DİJİTAL PROFİL
          </span>
          <h1 id="home-title">
            <button
              type="button"
              className="lt-hero-role-rotator"
              aria-label={`Uzmanlık unvanı: ${activeRole}. Sonraki unvanı görmek için tıklayın`}
              onMouseEnter={() => setRolePaused(true)}
              onMouseLeave={() => setRolePaused(false)}
              onFocus={() => setRolePaused(true)}
              onBlur={() => setRolePaused(false)}
              onClick={() =>
                setRoleIdx((prev) => (prev + 1) % HERO_ROTATING_ROLES.length)
              }
            >
              <span key={activeRole} className="lt-hero-role-word">
                {activeRole}
              </span>
            </button>{" "}
            olarak
            <br />
            size özel <em>profil adresinizi şimdi sahiplenin!</em>
          </h1>
          <p className="lt-hero-lead">
            İsminize özel <strong>terapist.co/adiniz</strong> adresinizi başkası
            almadan ayırın. Doğrulanmış uzman profilinizi, Google Takvim uyumlu
            randevu ve bekleme listenizi, şifreli değerlendirme formlarınızı ve
            QR kodunuzu tek bağlantıda birleştirin.
          </p>

          <form
            ref={heroFormRef}
            className={`lt-hero-claim-form${heroHighlighted ? " is-highlighted" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                customSlug.length >= 3
                  ? `/basvuru?kullanici_adi=${encodeURIComponent(customSlug)}`
                  : `/basvuru?kullanici_adi=${encodeURIComponent(activePlaceholder)}`,
              );
            }}
          >
            <label className="lt-claim-input-pill" htmlFor="hero-claim-input">
              <span className="lt-claim-prefix">terapist.co/</span>
              <input
                ref={heroInputRef}
                id="hero-claim-input"
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                placeholder={activePlaceholder}
                maxLength={45}
                aria-label="Adınızı yazarak terapist.co profil adresinizi deneyin"
              />
            </label>
            <button type="submit" className="lt-claim-cta-pill">
              <span>
                {customSlug.length >= 3
                  ? `terapist.co/${customSlug} adresini al`
                  : "Profil adresini sahiplen"}
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="home-hero-assurance lt-hero-assurance">
            <ShieldCheck size={17} aria-hidden="true" /> Başvuru sonrası
            profiliniz incelenir, onay sonrası yayına alınır.
          </p>
        </div>

        <div className="home-hero-visual lt-hero-sphere-col">
          <FlowingParticleSphere />
        </div>
      </section>

      <section
        id="kullanim-amaclari"
        className="home-section home-features-section lt-tonal-section lt-tonal-sky"
        aria-labelledby="features-title"
      >
        <div className="home-section-heading lt-section-heading lt-bento-heading-compact">
          <span className="eyebrow lt-eyebrow-pill">ANA ÖZELLİKLER</span>
          <h2 id="features-title">
            Neden profil adresinizi bugün almalısınız?
          </h2>
          <p>İhtiyacınız olan tüm klinik araçlar tek adreste.</p>
        </div>
        <div className="home-features-bento lt-features-bento lt-bento-asymmetric">
          {PLATFORM_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.id}
                to={`/ozellikler#${feature.id}`}
                className={`home-feature-card lt-feature-card lt-feature-card-link lt-bento-role-${feature.bentoRole}`}
                aria-label={`${feature.title} özelliğini detaylı incele`}
              >
                <div className="lt-bento-card-main">
                  <div className="home-feature-top">
                    <span className="home-feature-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <span className="home-feature-badge">{feature.badge}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p className="lt-feature-card-summary">{feature.summary}</p>
                </div>

                <div className="lt-bento-card-meta">
                  {feature.previewPill && (
                    <span className="lt-bento-url-chip">
                      {feature.previewPill}
                    </span>
                  )}
                  <div className="lt-bento-tags">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="lt-bento-tag-pill">
                        <Check size={12} aria-hidden="true" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                  <span className="lt-feature-foot-pill">
                    <span>Detaylı incele</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="lt-section-internal-links">
          <Link to="/ozellikler" className="lt-claim-cta-pill">
            <span>Tüm özellikleri incele</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="home-section home-for-therapists lt-tonal-section lt-tonal-CobaltSoft"
        aria-labelledby="setup-title"
      >
        <div className="home-section-heading lt-section-heading">
          <span className="eyebrow lt-eyebrow-pill">BAŞLANGIÇ ADIMLARI</span>
          <h2 id="setup-title">Alanınızı üç adımda hazırlayın.</h2>
          <p>
            Profil adresiniz ve mesleki bilgileriniz aynı başvuruda bir araya
            gelir.
          </p>
        </div>
        <div className="home-therapist-grid lt-steps-row lt-steps-modern">
          {setupSteps.map((step, idx) => (
            <article
              key={step.number}
              className={`lt-step-card lt-step-modern-card${idx === 2 ? " is-final" : ""}`}
            >
              <div className="lt-step-modern-top">
                <span className="lt-step-num-circle" aria-hidden="true">
                  {step.number}
                </span>
                <span className="lt-step-time-badge">{step.badge}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <div className="lt-bento-tags lt-step-chips">
                {step.chips.map((chip) => (
                  <span key={chip} className="lt-bento-tag-pill">
                    <Check size={12} aria-hidden="true" />
                    <span>{chip}</span>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="lt-bottom-cta-row">
          <button
            type="button"
            className="lt-claim-cta-pill lt-scroll-hero-cta"
            onClick={scrollToHeroClaim}
          >
            <span>Profil adresini al</span>
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section
        className="home-section lt-tonal-section lt-tonal-navy"
        aria-labelledby="benefits-title"
      >
        <div className="lt-navy-split">
          <div className="home-section-heading lt-section-heading lt-heading-on-dark">
            <span className="eyebrow lt-eyebrow-pill is-dark">
              PROFİLİNİZ NE SAĞLAR?
            </span>
            <h2 id="benefits-title">Danışanlarınız sizi tanısın.</h2>
            <p>
              Danışanlarınızın sizi tanımasını kolaylaştırın. Mesleki
              bilgilerinizi, kaynaklarınızı ve uygun görüşme saatlerinizi tek
              sayfada sunarak randevu talebine giden yolu kısaltın.
            </p>
          </div>
          <div className="home-step-grid lt-dark-cards-grid">
            <article className="home-step lt-dark-card">
              <UserRoundCheck size={25} aria-hidden="true" />
              <h3>Mesleki künyenizi oluşturun</h3>
              <p>
                Özgeçmişinizi, eğitim bilgilerinizi ve çalıştığınız danışan
                gruplarını sade ve şeffaf biçimde sunun. Etik bir profile sahip
                olun.
              </p>
              <Link
                to="/rehber/klinik-psikolog-dijital-kimlik"
                className="lt-dark-card-link"
              >
                <span>Dijital kimlik rehberi</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
            <article className="home-step lt-dark-card">
              <CalendarDays size={25} aria-hidden="true" />
              <h3>Uygunluğunuzu belirtin</h3>
              <p>
                Görüşme şeklinizi ve uygun saatlerinizi belirtin. Google Takvim
                bağlantısıyla dolu saatlerinizin otomatik güncellenmesini
                sağlayın.
              </p>
              <Link
                to="/cozumler/online-terapi-randevu-takvimi"
                className="lt-dark-card-link"
              >
                <span>Randevu takvimi nasıl çalışır?</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
            <article className="home-step lt-dark-card">
              <ShieldCheck size={25} aria-hidden="true" />
              <h3>Onaylı profilinizi paylaşın</h3>
              <p>
                Onaylanan profil adresinizi sosyal medya hesaplarınıza ekleyin;
                ziyaretçileriniz sizi tanısın ve randevu talep edebilsin.
              </p>
              <Link
                to="/cozumler/psikolog-link-in-bio"
                className="lt-dark-card-link"
              >
                <span>Paylaşım biçimleri</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section
        id="meslektas-agi"
        className="home-network lt-tonal-section lt-tonal-sky"
        aria-labelledby="network-title"
      >
        <div className="lt-network-copy">
          <span className="eyebrow lt-eyebrow-pill">MESLEKTAŞ AĞI</span>
          <h2 id="network-title">
            Mesleki bağlarınızı anlamlı biçimde gösterin.
          </h2>
          <p>
            Doğrulanmış terapistlerle profesyonel ilişkinizin bağlamını görünür
            kılın. Çalışmadığınız bir alan için o alanda çalışan doğrulanmış bir
            meslektaşınızı önerebilirsiniz. Danışanlar bu bağlantıları
            profilinizde inceleyebilir; sistem bunları bir kalite sıralamasına
            dönüştürmez.
          </p>
        </div>
        <div className="home-network-grid lt-network-cards">
          <Link
            to="/ozellikler#meslektas-agi"
            className="lt-network-card lt-network-card-link"
          >
            <UsersRound size={25} aria-hidden="true" />
            <h3>Mesleki bağlantı</h3>
            <p>
              Birlikte çalışma, eğitim veya süpervizyon bağlarınızı karşılıklı
              onayla görünür kılın.
            </p>
            <span className="lt-feature-foot-pill">
              <span>Ağ yapısını incele</span>
              <ArrowRight size={14} aria-hidden="true" />
            </span>
          </Link>
          <Link
            to="/cozumler/dogrulanmis-meslektas-agi"
            className="lt-network-card lt-network-card-link"
          >
            <HeartHandshake size={25} aria-hidden="true" />
            <h3>Meslektaş önerisi</h3>
            <p>
              Kendi çalışma alanınızın dışında kalan konularda danışanı
              terapist.co/r/... bağlantısıyla başka bir uzmana yönlendirin.
            </p>
            <span className="lt-feature-foot-pill">
              <span>Referans sistemini keşfet</span>
              <ArrowRight size={14} aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      <section
        id="sss"
        className="home-section home-faq-section lt-tonal-section lt-tonal-faq"
        aria-labelledby="faq-title"
      >
        <div className="home-faq-shell lt-faq-shell">
          <header className="home-faq-header">
            <div className="home-faq-badge-row">
              <span className="eyebrow">SIKÇA SORULAN SORULAR</span>
            </div>
            <h2 id="faq-title">Aklınıza takılan soruların yanıtları burada</h2>
            <p>
              Başvuru doğrulamasından mikro site özelleştirmeye, akıllı
              takvimden şifreli formlara ve meslektaş yönlendirmelerine kadar
              uzmanların sık sorduğu soruları bir araya getirdik.
            </p>
          </header>

          <div className="home-faq-list lt-faq-list">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqId === item.id;
              const btnId = `faq-btn-${item.id}`;
              const panelId = `faq-panel-${item.id}`;
              return (
                <article
                  key={item.id}
                  className={`home-faq-item lt-faq-pill-item${isOpen ? " is-open" : ""}`}
                >
                  <h3>
                    <button
                      id={btnId}
                      type="button"
                      className="home-faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaqId(isOpen ? "" : item.id)}
                    >
                      <span className="home-faq-trigger-lead">
                        <span className="home-faq-index" aria-hidden="true">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span>{item.question}</span>
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
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="lt-faq-contact-row">
            <a
              href="mailto:ekin@terapist.co"
              className="button secondary lt-pill-btn lt-faq-contact-btn"
            >
              <Mail size={16} aria-hidden="true" />
              <span>
                Sormak istediğiniz bir soru mu var? Hemen bizimle iletişime
                geçin
              </span>
            </a>
          </div>

          <div className="home-faq-cta-box lt-closing-banner">
            <div className="home-faq-cta-copy">
              <strong>Mesleki adresinizi hemen hazırlayın</strong>
              <p>
                Doğrulanmış uzman profilinizi dakikalar içinde oluşturup
                yönetici incelemesine gönderebilirsiniz.
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
    </div>
  );
}
