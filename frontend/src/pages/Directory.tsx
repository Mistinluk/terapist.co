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
import { Profil, para } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import { Avatar } from "../components/Avatar";

type Filters = {
  arama: string;
  sehir: string;
  uzmanlik: string;
  format: string;
  ekol: string;
  kitle: string;
  deneyim: string;
  sirala: string;
};
const empty: Filters = {
  arama: "",
  sehir: "",
  uzmanlik: "",
  format: "",
  ekol: "",
  kitle: "",
  deneyim: "0",
  sirala: "ad",
};

export function Directory() {
  const [filters, setFilters] = useState(empty);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mobileFilters, showFilters] = useState(false);
  const options = useApi<{
    sehirler: string[];
    uzmanliklar: string[];
    ekoller: string[];
    kitle: string[];
  }>("/secenekler");
  const params = new URLSearchParams({ ...filters, sayfa: String(page) });
  const { data, error, loading, reload } = useApi<{
    toplam: number;
    sonuclar: Profil[];
  }>(`/uzmanlar?${params}`);
  const change = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const reset = () => {
    setFilters(empty);
    setSearch("");
    setPage(1);
  };
  const select = (label: string, key: keyof Filters, values: string[]) => (
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
          {select(
            "Destek almak istediğiniz alan",
            "uzmanlik",
            options.data?.uzmanliklar || [],
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
          {select("Terapi yaklaşımı", "ekol", options.data?.ekoller || [])}
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
          <p className="filter-note">
            Hangi yaklaşımı seçeceğinizden emin değilseniz uzman profillerindeki
            açıklamaları inceleyebilirsiniz.
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
                <option value="ad">Ada göre sırala</option>
                <option value="ucret_artan">Ücret: düşükten yükseğe</option>
                <option value="ucret_azalan">Ücret: yüksekten düşüğe</option>
              </select>
            </label>
          </div>
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
