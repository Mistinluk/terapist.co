import { useEffect } from "react";

export const SITE_ORIGIN = "https://terapist.co";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/brand/terapistco-og.png`;
export const DEFAULT_TITLE =
  "Psikolog & Terapist Profili | Alan Adınızı Alın · terapist.co";
export const DEFAULT_DESCRIPTION =
  "Psikolog ve terapistler için doğrulanmış dijital profil. Özel terapist.co adresinizi alın; randevu takvimi, şifreli form ve QR kartınızı hemen oluşturun.";

export interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  ogType?: "website" | "article" | "profile";
  robots?: string;
  jsonLd?: Record<string, unknown> | null;
}

function upsertJsonLd(data?: Record<string, unknown> | null) {
  const existing = document.getElementById("page-jsonld");
  if (!data) {
    existing?.remove();
    return;
  }
  const script =
    existing instanceof HTMLScriptElement
      ? existing
      : document.createElement("script");
  script.id = "page-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(script);
  }
}

function upsertMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

/** Sayfa başlığı, kanonik bağlantı ve Open Graph / Twitter etiketlerini günceller. */
export function usePageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  imageAlt,
  ogType = "website",
  robots = "index, follow",
  jsonLd = null,
}: PageMetadataOptions) {
  const jsonLdSerialized = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const canonicalUrl = `${SITE_ORIGIN}${normalizedPath === "/" ? "/" : normalizedPath}`;
    const resolvedImage = image.startsWith("https://")
      ? image
      : `${SITE_ORIGIN}${image.startsWith("/") ? image : `/${image}`}`;

    document.title = title;
    upsertCanonical(canonicalUrl);
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", robots);

    upsertMeta('meta[property="og:type"]', "property", "og:type", ogType);
    upsertMeta(
      'meta[property="og:site_name"]',
      "property",
      "og:site_name",
      "terapist.co",
    );
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "tr_TR");
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      description,
    );
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    upsertMeta(
      'meta[property="og:image"]',
      "property",
      "og:image",
      resolvedImage,
    );
    upsertMeta(
      'meta[property="og:image:secure_url"]',
      "property",
      "og:image:secure_url",
      resolvedImage,
    );
    upsertMeta(
      'meta[property="og:image:alt"]',
      "property",
      "og:image:alt",
      imageAlt || title,
    );

    upsertMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      "summary_large_image",
    );
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      description,
    );
    upsertMeta(
      'meta[name="twitter:image"]',
      "name",
      "twitter:image",
      resolvedImage,
    );
    upsertJsonLd(
      jsonLdSerialized
        ? (JSON.parse(jsonLdSerialized) as Record<string, unknown>)
        : null,
    );
  }, [
    title,
    description,
    path,
    image,
    imageAlt,
    ogType,
    robots,
    jsonLdSerialized,
  ]);
}
