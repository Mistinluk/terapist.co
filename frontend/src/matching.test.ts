/**
 * Tercihlerin JSON sözleşmesi: boş bütçe sınırsız, 0 ise ücretsiz demektir.
 * Bu dosya puanlamayı test etmez; puan ve sayfalama backend testlerindedir.
 * Varsayılan durumun değişmemesi diğer aramalara tercih taşınmasını önler.
 */
import { describe, expect, it } from "vitest";
import { emptyMatchingFilters, matchingRequest } from "./lib/matching";

describe("eşleştirme istek sözleşmesi", () => {
  it("varsayılan sıralama, boş bütçe ve sayfayı JSON gövdesine taşır", () => {
    expect(JSON.parse(matchingRequest(emptyMatchingFilters, 2))).toMatchObject({
      sirala: "eslesme",
      azami_ucret: null,
      deneyim: 0,
      sayfa: 2,
      uzmanliklar: [],
      ekoller: [],
    });
  });
  it("sıfır bütçeyi kaybetmez, çoklu Türkçe tercihleri korur", () => {
    const result = JSON.parse(
      matchingRequest(
        {
          ...emptyMatchingFilters,
          azami_ucret: "0",
          deneyim: "5",
          uzmanliklar: ["Kaygı", "Yas / kayıp"],
          ekoller: ["BDT", "EMDR"],
        },
        1,
      ),
    );
    expect(result.azami_ucret).toBe(0);
    expect(result.deneyim).toBe(5);
    expect(result.uzmanliklar).toEqual(["Kaygı", "Yas / kayıp"]);
    expect(result.ekoller).toEqual(["BDT", "EMDR"]);
    expect(emptyMatchingFilters.uzmanliklar).toEqual([]);
  });
});
