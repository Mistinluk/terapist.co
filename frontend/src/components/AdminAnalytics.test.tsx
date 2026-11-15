import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { YonetimAnalitik } from "../lib/api";
import { AdminAnalyticsOverview } from "./AdminAnalytics";

const sampleAnalytics: YonetimAnalitik = {
  ozet: {
    toplam_uzman: 18,
    yayindaki_uzman: 14,
    bekleyen_uzman: 4,
    arsivli_uzman: 1,
    kurucu_programi: {
      azami_uye: 500,
      atanmis_uye: 14,
      kalan: 486,
      siradaki_numara: 15,
    },
    randevular: {
      toplam: 42,
      bekliyor: 6,
      onaylandi: 29,
      reddedildi: 4,
      iptal: 3,
      son_7_gun: 9,
      son_30_gun: 27,
      gelecek_aktif: 11,
      onay_orani_yuzde: 81,
    },
  },
  ag_ve_profil: {
    takvim_bagli_uzman: 9,
    takvim_koptu_uzman: 1,
    takvim_webhook_aktif_kanal: 12,
    rozet_olusturan_uzman: 7,
    rozet_toplam_tiklama: 34,
    profil_kaynagi_sayisi: 21,
    profil_kaynagi_tiklama: 88,
    aktif_profesyonel_baglanti: 25,
    bekleyen_baglanti_istegi: 3,
    uzmanlik_iliskisi_sayisi: 16,
    tavsiye_sayisi: 11,
    acik_moderasyon_raporu: 2,
  },
  buyume_ve_yonlendirme: {
    toplam_davet: 15,
    bekleyen_davet: 4,
    kabul_edilen_davet: 10,
    toplam_yonlendirme_linki: 12,
    aktif_yonlendirme_linki: 8,
    yonlendirme_goruntulenme: 54,
    yonlendirme_hedef_atamasi: 22,
    yonlendirme_profil_tiklamasi: 19,
  },
  sehir_dagilimi: [
    { sehir: "İstanbul", toplam: 12, yayinda: 10 },
    { sehir: "Ankara", toplam: 6, yayinda: 4 },
  ],
  format_dagilimi: { cevrim_ici: 16, yuz_yuze: 10 },
  siradaki_adim: {
    anahtar: "pending_therapists",
    baslik: "4 terapist doğrulama bekliyor",
    aciklama: "Başvuruları inceleyip yayına alabilirsiniz.",
    sekme: "uzmanlar",
  },
};

describe("AdminAnalytics", () => {
  it("platform, profil özellikleri ve büyüme istatistiklerini eksiksiz render eder", () => {
    const html = renderToStaticMarkup(
      <AdminAnalyticsOverview
        data={sampleAnalytics}
        onNavigate={() => undefined}
      />,
    );

    expect(html).toContain("18");
    expect(html).toContain("14 / 500");
    expect(html).toContain("9 aktif");
    expect(html).toContain("12 webhook kanalı");
    expect(html).toContain("7 rozet");
    expect(html).toContain("21 bağlantı");
    expect(html).toContain("İstanbul");
    expect(html).toContain("4 terapist doğrulama bekliyor");
  });
});
