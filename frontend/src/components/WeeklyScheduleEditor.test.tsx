import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildInitialSchedule,
  WeeklyScheduleEditor,
} from "./WeeklyScheduleEditor";

describe("WeeklyScheduleEditor", () => {
  it("açık günlerin özetini, şablonları ve kapalı gün durumunu gösterir", () => {
    const html = renderToStaticMarkup(
      <WeeklyScheduleEditor
        initialHours={[
          { gun: 0, baslangic: 9, bitis: 17 },
          { gun: 2, baslangic: 10, bitis: 15 },
        ]}
      />,
    );

    expect(html).toContain("Haftada 2 gün · toplam 13 saat açık");
    expect(html).toContain("Hafta içi 09:00–17:00");
    expect(html).toContain("Hafta içi 10:00–18:00");
    expect(html).toContain("Pzt–Cmt 10:00–17:00");
    expect(html).toContain("09:00 – 17:00 · 8 saat");
    expect(html).toContain("10:00 – 15:00 · 5 saat");
    expect(html).toContain("Randevuya kapalı");
    expect(html).toContain("Hafta içine uygula");
  });

  it("hiç açık gün yoksa özet mesajını ve pasif temizle düğmesini gösterir", () => {
    const html = renderToStaticMarkup(
      <WeeklyScheduleEditor initialHours={[]} />,
    );

    expect(html).toContain("Henüz açık gün seçilmedi");
    expect(html).toContain("disabled");
  });

  it("initialHours verisini 7 günlük başlangıç durumuna dönüştürür", () => {
    const state = buildInitialSchedule([{ gun: 4, baslangic: 11, bitis: 19 }]);
    expect(state).toHaveLength(7);
    expect(state[4]).toEqual({ acik: true, baslangic: 11, bitis: 19 });
    expect(state[0]).toEqual({ acik: false, baslangic: 9, bitis: 17 });
  });
});
