import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BuyumeAnalitigi } from "../lib/api";
import { AnalyticsOverview, nextGrowthAction } from "./GrowthAnalytics";

const summary: BuyumeAnalitigi = {
  baglantilar: { toplam: 12, bekleyen_istekler: 1 },
  davetler: { gonderilen: 3, kabul_edilen: 2, bekleyen: 1, kalan_hak: 0 },
  yonlendirmeler: {
    olusturulan_baglanti: 7,
    aktif_baglanti: 4,
    profil_tiklamalari: 14,
  },
  tavsiyeler: { onerilen_terapist: 5 },
};

describe("GrowthAnalytics", () => {
  it("talep edilen metrikleri iddiasız ve açıklayıcı etiketlerle sunar", () => {
    const html = renderToStaticMarkup(
      <AnalyticsOverview data={summary} onNavigate={() => undefined} />,
    );

    expect(html).toContain("12");
    expect(html).toContain("3");
    expect(html).toContain("2 kabul edildi");
    expect(html).toContain("7");
    expect(html).toContain("14");
    expect(html).toContain("5");
    expect(html).toContain("Tekil ziyaretçi değil, toplam geçiş sayısıdır");
    expect(html).not.toMatch(/en iyi|başarı oranı|popüler/i);
  });

  it("bekleyen bağlantı isteğini sıradaki aksiyon olarak önceliklendirir", () => {
    expect(nextGrowthAction(summary)).toMatchObject({
      tab: "baglantilar",
      action: "İstekleri değerlendir",
    });
  });
});
