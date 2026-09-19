import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  MapPin,
  Search,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { EslesenProfil, para } from "../lib/api";
import {
  MatchingFilters,
  emptyMatchingFilters,
  matchingRequest,
} from "../lib/matching";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import { Avatar } from "../components/Avatar";

export function Directory() {
  const [filters, setFilters] = useState(emptyMatchingFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mobileFilters, showFilters] = useState(false);
  const options = useApi<{
    sehirler: string[];
    uzmanliklar: string[];
    ekoller: string[];
    kitle: string[];
  }>("/secenekler");
  const { data, error, loading, reload } = useApi<{
    toplam: number;
    sonuclar: EslesenProfil[];
  }>("/eslestirme", matchingRequest(filters, page));
  const change = <K extends keyof MatchingFilters>(
    key: K,
    value: MatchingFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setFilters(emptyMatchingFilters);
    setSearch("");
    setPage(1);
  };
  const select = (label: string, key: "sehir" | "kitle", values: string[]) => (
    <label className="field">
      {label}
      <select
        value={filters[key]}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">Tümü</option>
        {values.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  const choices = (
    label: string,
    key: "uzmanliklar" | "ekoller",
    values: string[],
    limit: number,
  ) => (
    <fieldset>
      <legend>{label}</legend>
      <p className="muted small">
        En fazla {limit} seçim; eşleşenler önce gösterilir.
      </p>
      <div className="matching-choices">
        {values.map((value) => (
          <label className="radio" key={value}>
            <input
              type="checkbox"
              checked={filters[key].includes(value)}
              disabled={
                !filters[key].includes(value) && filters[key].length >= limit
              }
              onChange={(e) =>
                change(
                  key,
                  e.target.checked
                    ? [...filters[key], value]
                    : filters[key].filter((v) => v !== value),
                )
              }
            />
            {value}
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <>
      <section className="directory-intro">
        <div>
          <span className="eyebrow">KENDİNİZE AYIRDIĞINIZ BİR ALAN</span>
          <h1>
            Size uygun bir
            <br />
            <em>başlangıç.</em>
          </h1>
          <p>
            İhtiyaçlarınıza uygun uzmanı bulun.
            <br />
            İlk adımı, kendi hızınızda atın.
          </p>
        </div>
        <div className="intro-note">
          <span className="sun-mark" aria-hidden="true">
            ✳
          </span>
          <p>
            Her yolculuk farklı.
            <br />
            <strong>Sizin için doğru olanı keşfedin.</strong>
          </p>
          <span className="small-label">Çevrim içi veya yüz yüze görüşme</span>
        </div>
      </section>
      <div className="directory-layout">
        <aside
          className={`filters ${mobileFilters ? "is-open" : ""}`}
          aria-label="Uzman filtreleri"
        >
          <div className="section-row">
            <h2>
              <SlidersHorizontal size={17} /> Tercihleriniz
            </h2>
            <button className="text-button" onClick={reset}>
              Temizle
            </button>
          </div>
          {select("Şehir", "sehir", options.data?.sehirler || [])}
          {choices(
            "Destek almak istediğiniz alanlar",
            "uzmanliklar",
            options.data?.uzmanliklar || [],
            5,
          )}
          <fieldset>
            <legend>Görüşme şekli</legend>
            {[
              ["", "Fark etmez"],
              ["Çevrim içi", "Çevrim içi"],
              ["Yüz yüze", "Yüz yüze"],
            ].map(([value, label]) => (
              <label className="radio" key={value}>
                <input
                  type="radio"
                  name="format"
                  value={value}
                  checked={filters.format === value}
                  onChange={() => change("format", value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          {choices(
            "Terapi yaklaşımı (isteğe bağlı)",
            "ekoller",
            options.data?.ekoller || [],
            3,
          )}
          {select("Danışan grubu", "kitle", options.data?.kitle || [])}
          <label className="field">
            Deneyim
            <select
              value={filters.deneyim}
              onChange={(e) => change("deneyim", e.target.value)}
            >
              <option value="0">Tümü</option>
              <option value="3">3 yıl ve üzeri</option>
              <option value="5">5 yıl ve üzeri</option>
              <option value="10">10 yıl ve üzeri</option>
            </select>
          </label>
          <label className="field">
            En yüksek görüşme ücreti (₺)
            <input
              type="number"
              min="0"
              max="100000"
              step="1"
              placeholder="Sınır yok"
              value={filters.azami_ucret}
              onChange={(e) => change("azami_ucret", e.target.value)}
            />
          </label>
          <p className="filter-note">
            Şehir, danışan grubu, görüşme şekli, ücret ve deneyim koşulları
            kesin uygulanır. Yaklaşım seçmek zorunlu değildir.
          </p>
        </aside>
        <section className="results" aria-label="Uzman sonuçları">
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              change("arama", search);
            }}
          >
            <Search size={20} />
            <input
              aria-label="Uzman adıyla ara"
              placeholder="Bir uzman adı arayın"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Ara</button>
          </form>
          <div className="results-toolbar">
            <p aria-live="polite">
              <strong>{loading ? "…" : (data?.toplam ?? 0)}</strong> uzman{" "}
              <span>· Kendinize uygun olanı bulun</span>
            </p>
            <button
              className="mobile-filter button secondary"
              onClick={() => showFilters(!mobileFilters)}
              aria-expanded={mobileFilters}
            >
              Filtreler
            </button>
            <label className="sort">
              <span className="sr-only">Sıralama</span>
              <select
                value={filters.sirala}
                onChange={(e) => change("sirala", e.target.value)}
              >
                <option value="eslesme">Tercihlerime en uygun</option>
                <option value="ad">Ada göre sırala</option>
                <option value="ucret_artan">Ücret: düşükten yükseğe</option>
                <option value="ucret_azalan">Ücret: yüksekten düşüğe</option>
              </select>
            </label>
          </div>
          <p className="matching-note">
            {filters.uzmanliklar.length || filters.ekoller.length
              ? "Eşleşme puanı seçtiğiniz destek alanları ve yaklaşımlara dayanır. Klinik uygunluk veya tedavi başarısı ölçümü değildir."
              : "Destek alanı veya yaklaşım seçerek size göre sıralayın. Tercih belirtilmediğinde uzmanlar seçtiğiniz sırayla, varsayılan olarak alfabetik gösterilir."}
          </p>
          <Status loading={loading} error={error} retry={reload} />
          {!loading && !error && data?.sonuclar.length === 0 && (
            <div className="empty-state">
              <Search size={32} />
              <h2>Bu tercihlerle uzman bulunamadı</h2>
              <p>Bir filtreyi kaldırarak yeniden deneyebilirsiniz.</p>
              <button className="button secondary" onClick={reset}>
                Filtreleri temizle
              </button>
            </div>
          )}
          <div className="profile-grid">
            {!loading &&
              data?.sonuclar.map((p) => (
                <article className="profile-card" key={p.id}>
                  <div className="card-heading">
                    <Avatar ad={p.ad} />
                    <span className="verified">
                      <Check size={12} /> Onaylı profil
                    </span>
                  </div>
                  <h2>
                    <Link to={`/uzman/${p.id}`}>{p.ad}</Link>
                  </h2>
                  <p className="location">
                    <MapPin size={14} /> {p.ilce}, {p.sehir}
                    <span>·</span>
                    {p.deneyim_yili} yıl deneyim
                  </p>
                  <div className="tags">
                    {p.uzmanliklar.slice(0, 3).map((x) => (
                      <span key={x}>{x}</span>
                    ))}
                  </div>
                  <p className="approach">
                    {p.ekoller.join(" · ") || "Terapi yaklaşımı profilde"}
                  </p>
                  <p className="formats">
                    <Video size={14} /> {p.formatlar.join(" & ")}
                  </p>
                  {p.eslesme.puan !== null && (
                    <div className="matching-explanation">
                      <strong>
                        Tercih eşleşmesi:{" "}
                        {p.eslesme.puan.toLocaleString("tr-TR")} / 100
                      </strong>
                      {[
                        ...p.eslesme.eslesen_alanlar,
                        ...p.eslesme.eslesen_ekoller,
                      ].length > 0 && (
                        <p>
                          Eşleşenler:{" "}
                          {[
                            ...p.eslesme.eslesen_alanlar,
                            ...p.eslesme.eslesen_ekoller,
                          ].join(" · ")}
                        </p>
                      )}
                      {[...p.eslesme.eksik_alanlar, ...p.eslesme.eksik_ekoller]
                        .length > 0 && (
                        <p className="muted">
                          Profilde belirtilmeyenler:{" "}
                          {[
                            ...p.eslesme.eksik_alanlar,
                            ...p.eslesme.eksik_ekoller,
                          ].join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="card-bottom">
                    <div>
                      <strong>{para(p.ucret)}</strong>
                      <span> / görüşme</span>
                    </div>
                    <Link
                      to={`/uzman/${p.id}`}
                      aria-label={`${p.ad} profilini incele`}
                    >
                      Profili incele <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </article>
              ))}
          </div>
          {data && data.toplam > 12 && (
            <nav className="pagination" aria-label="Sonuç sayfaları">
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Önceki
              </button>
              <span>
                {page} / {Math.ceil(data.toplam / 12)}
              </span>
              <button
                className="button secondary"
                disabled={page * 12 >= data.toplam}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </button>
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
