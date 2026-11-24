import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GoogleTakvimDurumu } from "../lib/api";
import { GoogleCalendarCardContent } from "./GoogleCalendarCard";

const bagliDegil: GoogleTakvimDurumu = {
  yapilandirildi: true,
  bagli: false,
  email: null,
  durum: null,
  son_senkron: null,
  hata: null,
  takvimler: [],
  musaitlik_takvimi: null,
  dolu_takvimleri: [],
  dolu_aralik_sayisi: 0,
  musait_aralik_sayisi: null,
};

const bagliDurum: GoogleTakvimDurumu = {
  yapilandirildi: true,
  bagli: true,
  email: "uzman@example.com",
  durum: "aktif",
  son_senkron: 1760000000,
  hata: null,
  takvimler: [
    { id: "uzman@example.com", ad: "Kişisel", birincil: true },
    { id: "klinik@group.calendar", ad: "Klinik", birincil: false },
  ],
  musaitlik_takvimi: null,
  dolu_takvimleri: ["uzman@example.com"],
  dolu_aralik_sayisi: 4,
  musait_aralik_sayisi: null,
  webhook_etkin: true,
  webhook_kanal_sayisi: 1,
  webhook_son_bildirim: null,
};

describe("GoogleCalendarCardContent", () => {
  it("yapılandırıldığında Takviminizi ekleyin bağlantısını etkinleştirir", () => {
    const html = renderToStaticMarkup(
      <GoogleCalendarCardContent data={bagliDegil} />,
    );

    expect(html).toContain("Takviminizi ekleyin (Google Takvim)");
    expect(html).not.toContain("disabled");
    expect(html).toContain(
      "kişisel etkinlik başlıkları veya katılımcılar profilinizde gösterilmez",
    );
  });

  it("bağlı hesapta takvim seçimlerini ve eşitleme kontrollerini gösterir", () => {
    const html = renderToStaticMarkup(
      <GoogleCalendarCardContent
        data={bagliDurum}
        selectedAvailability="klinik@group.calendar"
        selectedBusy={["uzman@example.com"]}
      />,
    );

    expect(html).toContain("Google Takvim bağlı");
    expect(html).toContain("uzman@example.com");
    expect(html).toContain("4 dolu zaman aralığı");
    expect(html).toContain("Anlık bildirim (webhook) etkin");
    expect(html).toContain("Takvim seçimini kaydet");
    expect(html).toContain("Şimdi eşitle");
    expect(html).toContain("Bağlantıyı kaldır");
  });

  it("izin kaldırıldığında yeniden bağlama uyarısını gösterir", () => {
    const html = renderToStaticMarkup(
      <GoogleCalendarCardContent
        data={{
          ...bagliDurum,
          durum: "koptu",
          hata: "Google Takvim izni kaldırılmış. Bağlantıyı yeniden kurun.",
        }}
      />,
    );

    expect(html).toContain("Yeniden bağlayın");
    expect(html).toContain("Google Takvim&#x27;i yeniden bağla");
    expect(html).toContain("Google Takvim izni kaldırılmış");
  });
});
