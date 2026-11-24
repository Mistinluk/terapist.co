import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Admin } from "../pages/Admin";
import { Dashboard } from "../pages/Dashboard";
import { AnalyticsBarList, DailyTrendChart } from "./AnalyticsBarList";
import { AdminTrafficAnalyticsView } from "./AdminTrafficAnalytics";
import { TherapistTrafficAnalyticsView } from "./TherapistTrafficAnalytics";
import type { UzmanTrafikAnalitigi, YonetimTrafikAnalitigi } from "../lib/api";

const sampleAdminReport: YonetimTrafikAnalitigi = {
  gun: 30,
  istenen_kaynak: "karma",
  aktif_kaynak: "ga4",
  ga4_veri_hazir: true,
  ga4_durumu: {
    olcum_kimligi: "G-TEST1234",
    mulk_kimligi: "123456789",
    olcum_etkin: true,
    baglanti_durumu: "oauth_bagli",
    hesap_etiketi: "admin@terapist.co",
    son_senkron: 1730000000,
    hata: null,
    oauth_etkin: true,
    geri_donus_adresi: "http://localhost:5173/api/google-analitik/geri-donus",
  },
  ozet: {
    ziyaretci: 420,
    sayfa_goruntuleme: 1280,
    profil_goruntuleme: 510,
    randevu_basvurusu: 27,
    en_yuksek_kaynak: "Instagram",
  },
  gunluk_egilim: [
    {
      tarih: "2026-11-12",
      ziyaretci: 34,
      sayfa_goruntuleme: 89,
      profil_goruntuleme: 31,
    },
    {
      tarih: "2026-11-13",
      ziyaretci: 41,
      sayfa_goruntuleme: 102,
      profil_goruntuleme: 39,
    },
  ],
  en_cok_ziyaret_edilen_uzmanlar: [
    {
      uzman_id: "u1",
      ad: "Uzm. Psk. Selin Kaya",
      kullanici_adi: "selin-kaya",
      sehir: "İstanbul",
      profil_goruntuleme: 194,
      tekil_ziyaretci: 148,
      randevu_talebi: 12,
    },
  ],
  yonlendiren_kaynaklar: [
    {
      anahtar: "instagram",
      etiket: "Instagram",
      kategori: "instagram",
      ziyaretci: 185,
      sayfa_goruntuleme: 490,
      pay_yuzde: 44,
    },
    {
      anahtar: "google",
      etiket: "Google",
      kategori: "google",
      ziyaretci: 120,
      sayfa_goruntuleme: 380,
      pay_yuzde: 28.6,
    },
  ],
  ziyaretci_konumlari: [
    {
      sehir: "İstanbul",
      ulke: "TR",
      ziyaretci: 260,
      sayfa_goruntuleme: 810,
      pay_yuzde: 61.9,
    },
  ],
  sayfa_turleri: [
    {
      tur: "terapist_profili",
      etiket: "Terapist profili",
      goruntuleme: 510,
    },
  ],
  donusum_hunisi: {
    dizin_aramasi: 310,
    profil_goruntuleme: 510,
    randevu_cekmecesi: 88,
    randevu_talebi: 27,
  },
};

const sampleTherapistReport: UzmanTrafikAnalitigi = {
  gun: 30,
  profil_adresi: "/selin-kaya",
  ozet: {
    profil_goruntuleme: 194,
    tekil_ziyaretci: 148,
    randevu_cekmece_acilisi: 29,
    randevu_talebi: 12,
    donusum_orani_yuzde: 6.2,
    kaynak_ve_rozet_tiklamasi: 19,
    en_yuksek_kaynak: "Google",
  },
  gelis_kaynaklari: [
    {
      anahtar: "google",
      etiket: "Google",
      ziyaretci: 74,
      pay_yuzde: 50,
    },
    {
      anahtar: "instagram",
      etiket: "Instagram",
      ziyaretci: 46,
      pay_yuzde: 31.1,
    },
  ],
  ziyaretci_konumlari: [
    { konum: "İstanbul", ziyaretci: 98, pay_yuzde: 66.2 },
    { konum: "Ankara", ziyaretci: 26, pay_yuzde: 17.6 },
  ],
  gunluk_egilim: [
    { tarih: "2026-11-12", goruntuleme: 14, randevu_talebi: 1 },
    { tarih: "2026-11-13", goruntuleme: 19, randevu_talebi: 2 },
  ],
  profil_etkilesimleri: {
    bilgi_kaynagi_tiklama: 11,
    website_rozet_tiklama: 8,
    randevu_form_acilisi: 29,
  },
  oneri: {
    baslik: "En güçlü kaynağınız: Google",
    aciklama: "Google üzerinden gelen ziyaretçiler profilinizi inceliyor.",
  },
};

describe("Analytics visualizations & dashboard navigation", () => {
  it("AdminTrafficAnalyticsView temel ziyaretçi, konum, profil ve kaynak metriklerini gösterir", () => {
    const html = renderToStaticMarkup(
      <AdminTrafficAnalyticsView data={sampleAdminReport} />,
    );

    expect(html).toContain("420");
    expect(html).toContain("Instagram");
    expect(html).toContain("Uzm. Psk. Selin Kaya");
    expect(html).toContain("İstanbul");
    expect(html).toContain("194");
    expect(html).toContain("Rehberden randevuya ziyaretçi yolculuğu");
  });

  it("TherapistTrafficAnalyticsView sadeleştirilmiş profil metriklerini ve kaynakları sunar", () => {
    const html = renderToStaticMarkup(
      <TherapistTrafficAnalyticsView
        data={sampleTherapistReport}
        onEditProfile={() => undefined}
        onOpenBadge={() => undefined}
      />,
    );

    expect(html).toContain("148");
    expect(html).toContain("194 profil görüntülenmesi");
    expect(html).toContain("Google");
    expect(html).toContain("Instagram");
    expect(html).toContain("İstanbul · %66,2");
    expect(html).toContain("En güçlü kaynağınız: Google");
  });

  it("AnalyticsBarList yatay çubukları ve pay yüzdelerini erişilebilir biçimde render eder", () => {
    const html = renderToStaticMarkup(
      <AnalyticsBarList
        title="En fazla siteye yönlendirme yapan adresler"
        eyebrow="KAYNAKLAR"
        headingId="ref-head"
        valueLabel="Ziyaretçi"
        emptyText="Henüz veri yok"
        items={[
          {
            key: "instagram",
            label: "Instagram",
            value: 42,
            sharePct: 60,
            secondaryValue: "98 görüntüleme",
          },
          {
            key: "google",
            label: "Google",
            value: 28,
            sharePct: 40,
          },
        ]}
      />,
    );

    expect(html).toContain("Instagram");
    expect(html).toContain("42 · %60");
    expect(html).toContain("98 görüntüleme");
    expect(html).toContain("Grafik");
    expect(html).toContain("Tablo");
  });

  it("DailyTrendChart günlük değerleri erişilebilir başlıklarla sunar", () => {
    const html = renderToStaticMarkup(
      <DailyTrendChart
        title="Son 7 gün profil ziyaretleri"
        eyebrow="TREND"
        headingId="trend-head"
        primaryLabel="Profil görüntüleme"
        secondaryLabel="Randevu talebi"
        points={[
          { tarih: "2026-11-12", birincil: 12, ikincil: 2 },
          { tarih: "2026-11-13", birincil: 18, ikincil: 4 },
        ]}
      />,
    );

    expect(html).toContain("Son 7 gün profil ziyaretleri");
    expect(html).toContain("Profil görüntüleme");
    expect(html).toContain('role="img"');
  });

  it("Admin sol menüsü Google Analytics ve trafik sekmesini sunar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/yonetim?sekme=trafik"]}>
        <Admin />
      </MemoryRouter>,
    );

    expect(html).toContain("Google Analytics ve trafik");
  });

  it("Terapist sol menüsü sadeleştirilmiş Profil istatistikleri sekmesini sunar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/panel?sekme=istatistikler"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(html).toContain("Profil istatistikleri");
  });
});
