import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App, { isProfileRoute } from "../App";
import { AuthProvider } from "../lib/auth";
import { Home } from "./Home";

describe("Home ana sayfa kullanım amaçları ve terapist SSS", () => {
  it("üst sahiplenme bandını gizler ve hero başlığında iki renkli alan adı teşviği sunar", () => {
    const appHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(appHtml).not.toContain("header-claim");
    expect(appHtml).not.toContain('href="/randevularim"');
    expect(appHtml).not.toContain("DANIŞAN ALANI");
    expect(appHtml).not.toContain("#alanini-sahiplen");
    expect(appHtml).toContain("Psikolog");
    expect(appHtml).toContain("lt-hero-role-rotator");
    expect(appHtml).toContain(
      "size özel <em>profil adresinizi şimdi sahiplenin!</em>",
    );
    expect(appHtml).toContain("terapist.co/adiniz");
    expect(appHtml).toContain('href="/ozellikler"');
    expect(appHtml).toContain("lt-hero-claim-form");
    expect(appHtml).toContain("lt-particle-sphere-canvas");
    expect(appHtml).not.toContain("Önizlenen adres:");
    expect(appHtml).not.toContain("Yayındaki profilleri incele");
    expect(appHtml).not.toContain("Mesleki bilgilerinizi kontrollü paylaşın.");
    expect(appHtml).toContain("/karsilastirma/terapistco-vs-linktree");
    expect(appHtml).toContain("/cozumler/psikolog-link-in-bio");
    expect(appHtml).toContain("/rehber/klinik-psikolog-dijital-kimlik");
    expect(appHtml).toContain("ardaekintuncay");
    expect(appHtml).not.toContain('style="');
  });

  it("Özellikler (/ozellikler) sayfasını interaktif vitrin ve başvuru CTA ile sunar", () => {
    const featuresHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/ozellikler"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(featuresHtml).toContain("TERAPİST.CO ÖZELLİK STÜDYOSU");
    expect(featuresHtml).toContain("<em>tüm dijital araçlar tek adreste!</em>");
    expect(featuresHtml).toContain('id="kisisel-adres"');
    expect(featuresHtml).toContain('id="link-in-bio"');
    expect(featuresHtml).toContain('id="randevu-takvimi"');
    expect(featuresHtml).toContain('id="sifreli-formlar"');
    expect(featuresHtml).toContain('id="analitik"');
    expect(featuresHtml).toContain('id="meslektas-agi"');
    expect(featuresHtml).toContain("Profil adresini seç ve başvur");
    expect(featuresHtml).not.toContain('style="');
  });

  it("SEO karşılaştırma ve rehber sayfalarını ana sayfayla uyumlu yapıda sunar", () => {
    const vsHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/karsilastirma/terapistco-vs-linktree"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(vsHtml).toContain("Terapist.co vs Linktr.ee:");
    expect(vsHtml).toContain("seo-comparison-table");
    expect(vsHtml).toContain("lt-hero-claim-form");
    expect(vsHtml).not.toContain('style="');
  });

  it("sitenin temel kullanım amaçlarını tanıtır ve CSP-güvenli render edilir", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(html).toContain("ANA ÖZELLİKLER");
    expect(html).toContain("Tüm özellikleri incele");
    expect(html).toContain("Biyografiniz için tek bağlantı");
    expect(html).toContain("Size özel terapist.co/kullaniciadi");
    expect(html).toContain("Doğrudan randevu talebi");
    expect(html).toContain("Şifreli ölçek ve belge paylaşımı");
    expect(html).toContain("Ziyaretçi istatistikleri");
    expect(html).toContain("Meslektaşlarınızla iletişim kurun");
    expect(html).toContain("Marka gizleme özelliği");
    expect(html).toContain('href="/ozellikler#kisisel-adres"');
    expect(html).toContain('href="/ozellikler#link-in-bio"');
    expect(html).not.toContain('style="');
  });

  it("SSS bölümünü danışan sekmesi olmadan yalnızca terapistler için tek akışta sunar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(html).toContain("home-faq-shell");
    expect(html).toContain("Aklınıza takılan soruların yanıtları burada");
    expect(html).toContain("mailto:ekin@terapist.co");
    expect(html).not.toContain("Terapistler İçin");
    expect(html).not.toContain("Danışanlar &amp; Randevu");
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain("Terapist.co’nun ana kullanım amaçları nelerdir");
    expect(html).toContain("Görünüm ve QR kodu");
    expect(html).toContain("Uzman başvurusu başlat");
  });

  it("uzman profil rotalarında ana menüyü ve site altbilgisini gizleyerek bağımsız profil tuvali sunar", () => {
    expect(isProfileRoute("/selin-kaya")).toBe(true);
    expect(isProfileRoute("/uzman/uzman-1")).toBe(true);
    expect(isProfileRoute("/panel/onizleme")).toBe(true);
    expect(isProfileRoute("/")).toBe(false);
    expect(isProfileRoute("/kesfet")).toBe(false);
    expect(isProfileRoute("/ozellikler")).toBe(false);
    expect(isProfileRoute("/panel")).toBe(false);
    expect(isProfileRoute("/yonetim")).toBe(false);

    const profileRouteHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/selin-kaya"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(profileRouteHtml).not.toContain("site-header");
    expect(profileRouteHtml).not.toContain("site-footer");
    expect(profileRouteHtml).not.toContain("Uzmanlara dön");
    expect(profileRouteHtml).toContain("is-profile-canvas");
  });
});
