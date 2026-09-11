import { describe, expect, it } from "vitest";
import { readProfile } from "./components/ProfileForm";
import { para, tarih } from "./lib/api";

describe("Türkçe profil ve tarih dönüşümleri", () => {
  it("kapalı günleri dışarıda bırakır, virgüllü alanları normalize eder", () => {
    const data = new FormData();
    data.set("ad", "  Örnek Uzman  ");
    data.set("ekoller", "BDT, EMDR, ");
    data.set("ucret", "1800");
    data.set("gun_0", "on");
    data.set("bas_0", "9");
    data.set("bit_0", "17");
    data.set("bas_1", "9");
    data.set("bit_1", "17");
    data.append("formatlar", "Çevrim içi");
    expect(readProfile(data)).toMatchObject({
      ad: "Örnek Uzman",
      ekoller: ["BDT", "EMDR"],
      ucret: 1800,
      calisma_saatleri: [{ gun: 0, baslangic: 9, bitis: 17 }],
    });
  });
  it("cihaz saatinden bağımsız Türkiye saatini gösterir", () => {
    expect(tarih("2026-09-14T06:00:00Z")).toContain("09:00");
    expect(para(1800)).toContain("1.800");
  });
});
