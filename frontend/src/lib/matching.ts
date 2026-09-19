/** Tercihler URL'ye veya kalıcı tarayıcı depolamasına yazılmaz. */
export type MatchingFilters = {
  arama: string;
  sehir: string;
  uzmanliklar: string[];
  ekoller: string[];
  format: string;
  kitle: string;
  deneyim: string;
  azami_ucret: string;
  sirala: string;
};

export const emptyMatchingFilters: MatchingFilters = {
  arama: "",
  sehir: "",
  uzmanliklar: [],
  ekoller: [],
  format: "",
  kitle: "",
  deneyim: "0",
  azami_ucret: "",
  sirala: "eslesme",
};

/** Boş bütçe sınırsızdır; 0 TL ise geçerli ve farklı bir tercihtir. */
export function matchingRequest(filters: MatchingFilters, page: number) {
  return JSON.stringify({
    ...filters,
    deneyim: Number(filters.deneyim),
    azami_ucret:
      filters.azami_ucret === "" ? null : Number(filters.azami_ucret),
    sayfa: page,
  });
}
