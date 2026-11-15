import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, "..");
const distDir = join(frontendRoot, "dist");
const SITE_ORIGIN = "https://terapist.co";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/brand/terapistco-og.png`;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function loadSeoPages() {
  const sourcePath = join(frontendRoot, "src/data/seoPages.ts");
  const source = readFileSync(sourcePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const tmpFile = join(__dirname, ".seoPages.tmp.mjs");
  writeFileSync(tmpFile, outputText, "utf8");
  return import(pathToFileURL(tmpFile).href).finally(() => {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup error
    }
  });
}

function injectRouteMeta(templateHtml, route) {
  const canonicalUrl = `${SITE_ORIGIN}${route.path}`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const ogType = route.ogType ?? "website";
  const robots = route.robots ?? "index, follow";

  let html = templateHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${description}" />`,
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${ogType}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalUrl}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:image:alt"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta property="og:image:alt" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />`,
  );
  if (!/<meta\s+name="robots"/i.test(html)) {
    html = html.replace(
      "<head>",
      `<head>\n    <meta name="robots" content="${robots}" />`,
    );
  }
  if (route.jsonLd) {
    const safeJson = JSON.stringify(route.jsonLd).replace(/<\//g, "<\\/");
    html = html.replace(
      "</head>",
      `    <script id="page-jsonld" type="application/ld+json">${safeJson}</script>\n  </head>`,
    );
  }
  return html;
}

async function main() {
  const indexPath = join(distDir, "index.html");
  const templateHtml = readFileSync(indexPath, "utf8");
  const { SEO_PAGES } = await loadSeoPages();

  const staticRoutes = [
    {
      path: "/ozellikler",
      title:
        "Özellikler · Psikolog Dijital Profil, Online Randevu ve QR Kodunuz | terapist.co",
      description:
        "Psikolog, terapist ve ruh sağlığı uzmanları için tüm dijital araçlar tek yerde: terapist.co/adınız adresiniz, hazır profil vitrini, kolay randevu takvimi, şifreli formlar ve QR Kodunuz.",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            name: "Özellikler · Psikolog Dijital Profil, Online Randevu ve QR Kodunuz | terapist.co",
            url: `${SITE_ORIGIN}/ozellikler`,
            inLanguage: "tr",
            isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Ana Sayfa",
                item: `${SITE_ORIGIN}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Özellikler",
                item: `${SITE_ORIGIN}/ozellikler`,
              },
            ],
          },
        ],
      },
    },
    {
      path: "/kesfet",
      title: "Terapistleri Keşfet · Doğrulanmış Uzman Dizini | terapist.co",
      description:
        "Şehir, terapi yaklaşımı, çalışma alanı ve danışan grubuna göre doğrulanmış psikolog ve terapistleri keşfedin; doğrudan profil ve randevu bilgilerine ulaşın.",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            name: "Terapistleri Keşfet · Doğrulanmış Uzman Dizini",
            url: `${SITE_ORIGIN}/kesfet`,
            inLanguage: "tr",
            isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Ana Sayfa",
                item: `${SITE_ORIGIN}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Terapistleri Keşfet",
                item: `${SITE_ORIGIN}/kesfet`,
              },
            ],
          },
        ],
      },
    },
    {
      path: "/basvuru",
      title: "Uzman Olarak Katıl · Profil Adresini Sahiplen | terapist.co",
      description:
        "terapist.co/adiniz biçiminde doğrulanmış klinik profilinizi, randevu takviminizi ve şifreli değerlendirme formlarınızı dakikalar içinde oluşturun.",
    },
    {
      path: "/aydinlatma",
      title: "KVKK ve Aydınlatma Metni | terapist.co",
      description:
        "terapist.co kişisel verilerin korunması, veri minimizasyonu, çerez politikası ve danışan gizliliği ilkeleri hakkında aydınlatma metni.",
    },
    {
      path: "/karsilastirma",
      title:
        "Terapist.co Karşılaştırmalar · Linktree, Web Sitesi, Calendly ve Pazaryerleri",
      description:
        "Terapist.co vs Linktr.ee, Klasik Web Sitesi, Calendly ve Pazaryerleri karşılaştırmaları; ruh sağlığı uzmanları için maliyet, KVKK ve randevu analizi.",
    },
    {
      path: "/cozumler",
      title:
        "Terapist.co Klinik Çözümler · Link in Bio, Randevu Takvimi, Şifreli Formlar",
      description:
        "Psikologlar için Link in Bio, online terapi randevu takvimi, şifreli BDT/Şema formları, klinik QR masa kartı ve doğrulanmış meslektaş ağı.",
    },
    {
      path: "/rehber",
      title: "Klinik Psikologlar ve Terapistler İçin Dijital Rehberler | terapist.co",
      description:
        "Klinik psikolog dijital kimlik, BDT/Şema ve Çift/EMDR terapistleri için pratik kurulum ve terapide KVKK veri minimizasyonu rehberleri.",
    },
    {
      path: "/giris",
      title: "Uzman Girişi | terapist.co",
      description: "Doğrulanmış terapist çalışma alanına giriş yapın.",
      robots: "noindex, nofollow",
    },
  ];

  const categoryLabels = {
    karsilastirma: "Karşılaştırmalar",
    cozumler: "Klinik Çözümler",
    rehber: "Uzman Rehberleri",
  };

  const seoRoutes = SEO_PAGES.map((page) => ({
    path: page.path,
    title: page.metaTitle,
    description: page.metaDescription,
    ogType: page.category === "rehber" ? "article" : "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": page.category === "rehber" ? "Article" : "WebPage",
          ...(page.category === "rehber"
            ? { headline: page.metaTitle }
            : { name: page.metaTitle }),
          description: page.metaDescription,
          url: `${SITE_ORIGIN}${page.path}`,
          inLanguage: "tr",
          publisher: {
            "@type": "Organization",
            "@id": `${SITE_ORIGIN}/#organization`,
            name: "terapist.co",
            url: `${SITE_ORIGIN}/`,
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Ana Sayfa",
              item: `${SITE_ORIGIN}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: categoryLabels[page.category] ?? "Klinik Çözümler",
              item: `${SITE_ORIGIN}/${page.category}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: page.eyebrow,
              item: `${SITE_ORIGIN}${page.path}`,
            },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: (page.faqs ?? []).map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        },
      ],
    },
  }));

  const allRoutes = [...staticRoutes, ...seoRoutes];
  for (const route of allRoutes) {
    const outPath = join(distDir, `${route.path.slice(1)}.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, injectRouteMeta(templateHtml, route), "utf8");
  }
  console.log(`Generated ${allRoutes.length} SEO static HTML files in dist/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
