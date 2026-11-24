import { useState } from "react";
import { Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { YonetimYonlendirmeler, tarih } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

const reasonLabels: Record<string, string> = {
  schedule_full: "Takvim dolu",
  outside_specialty: "Uzmanlık alanı dışı",
  age_group: "Yaş grubu uyuşmuyor",
  location: "Konum / ulaşım",
  budget: "Ücret / bütçe",
  therapy_format: "Görüşme şekli",
  psychiatry: "Psikiyatrik değerlendirme",
  other: "Diğer",
};

const linkStatusLabels: Record<string, string> = {
  active: "Aktif",
  expired: "Süresi doldu",
  revoked: "Kapatıldı",
};

export function AdminClientReferralsView({
  data,
  loading,
  error,
  retry,
}: {
  data?: YonetimYonlendirmeler;
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase("tr");

  const creators = (data?.uzman_ozetleri ?? []).filter(
    (item) =>
      !term ||
      item.uzman.ad.toLocaleLowerCase("tr").includes(term) ||
      item.hedefler.some((target) =>
        target.ad.toLocaleLowerCase("tr").includes(term),
      ),
  );

  const recipients = (data?.alan_uzman_ozetleri ?? []).filter(
    (item) =>
      !term ||
      item.uzman.ad.toLocaleLowerCase("tr").includes(term) ||
      item.yonlendirenler.some((src) =>
        src.ad.toLocaleLowerCase("tr").includes(term),
      ),
  );

  const links = (data?.linkler ?? []).filter(
    (item) =>
      !term ||
      item.yonlendiren.ad.toLocaleLowerCase("tr").includes(term) ||
      item.hedefler.some((target) =>
        target.ad.toLocaleLowerCase("tr").includes(term),
      ),
  );

  return (
    <div className="admin-section-stack">
      <Status loading={loading} error={error} retry={retry} />

      {data && (
        <>
          <div
            className="admin-kpi-strip"
            aria-label="Danışan yönlendirme özeti"
          >
            <div>
              <span>Oluşturulan bağlantı</span>
              <strong>{data.ozet.toplam_link}</strong>
            </div>
            <div>
              <span>Aktif bağlantı</span>
              <strong>{data.ozet.aktif_link}</strong>
            </div>
            <div>
              <span>Yönlendiren uzman</span>
              <strong>{data.ozet.yonlendiren_uzman_sayisi}</strong>
            </div>
            <div>
              <span>Yönlendirilen tercih</span>
              <strong>{data.ozet.toplam_yonlendirilen_hedef}</strong>
            </div>
            <div>
              <span>Bağlantı görüntülenmesi</span>
              <strong>{data.ozet.toplam_goruntulenme}</strong>
            </div>
            <div>
              <span>Profil tıklaması</span>
              <strong>{data.ozet.toplam_profil_tiklamasi}</strong>
            </div>
          </div>

          <div className="admin-filter-toolbar">
            <label className="admin-inline-search">
              <span className="sr-only">Yönlendirmelerde ara</span>
              <input
                type="search"
                placeholder="Yönlendiren veya hedef uzman adına göre filtrele…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {data.neden_dagilimi.length > 0 && (
              <div
                className="admin-pill-row"
                aria-label="Yönlendirme nedenleri"
              >
                {data.neden_dagilimi.map((reason) => (
                  <span className="status-badge" key={reason.neden}>
                    {reasonLabels[reason.neden] ?? reason.neden}: {reason.sayi}
                  </span>
                ))}
              </div>
            )}
          </div>

          <section
            className="admin-panel-card"
            aria-labelledby="admin-referral-creators-heading"
          >
            <div className="admin-card-header">
              <div>
                <span className="eyebrow">UZMAN BAZLI DAĞILIM</span>
                <h3 id="admin-referral-creators-heading">
                  Uzmanların oluşturduğu bağlantılar ve yönlendirmeler
                </h3>
              </div>
              <strong>{creators.length} uzman</strong>
            </div>

            {creators.length === 0 ? (
              <div className="empty-state">
                <Share2 size={30} aria-hidden="true" />
                <p>Eşleşen yönlendirme kaydı bulunamadı.</p>
              </div>
            ) : (
              <div className="admin-referral-leaderboard">
                {creators.map((item) => (
                  <article
                    className="admin-referral-creator-card"
                    key={item.uzman.id}
                  >
                    <div className="admin-referral-creator-top">
                      <div>
                        <h4>
                          {item.uzman.kullanici_adi ? (
                            <Link to={`/${item.uzman.kullanici_adi}`}>
                              {item.uzman.ad}
                            </Link>
                          ) : (
                            item.uzman.ad
                          )}
                        </h4>
                        <p className="muted">
                          {item.uzman.sehir || "Şehir belirtilmemiş"}
                        </p>
                      </div>
                      <div className="admin-referral-metrics">
                        <span>
                          <strong>{item.link_sayisi}</strong> bağlantı (
                          {item.aktif_link_sayisi} aktif)
                        </span>
                        <span>
                          <strong>{item.toplam_hedef_gosterimi}</strong>{" "}
                          yönlendirme tercihi
                        </span>
                        <span>
                          <strong>{item.toplam_goruntulenme}</strong>{" "}
                          görüntülenme
                        </span>
                        <span>
                          <strong>{item.toplam_profil_tiklamasi}</strong> profil
                          tıkı
                        </span>
                      </div>
                    </div>

                    <div className="admin-referral-targets">
                      <span className="admin-targets-label">
                        Yönlendirilen meslektaşlar:
                      </span>
                      <div className="admin-pill-row">
                        {item.hedefler.map((target) => (
                          <span
                            className="admin-target-chip"
                            key={target.uzman_id}
                          >
                            {target.kullanici_adi ? (
                              <Link to={`/${target.kullanici_adi}`}>
                                {target.ad}
                              </Link>
                            ) : (
                              target.ad
                            )}
                            <strong>×{target.sayi}</strong>
                            {target.tiklama_sayisi > 0 && (
                              <small>({target.tiklama_sayisi} tıklama)</small>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="admin-panel-card"
            aria-labelledby="admin-referral-recipients-heading"
          >
            <div className="admin-card-header">
              <div>
                <span className="eyebrow">ALICI ÖZETİ</span>
                <h3 id="admin-referral-recipients-heading">
                  En çok yönlendirme alan uzmanlar
                </h3>
              </div>
              <strong>{recipients.length} uzman</strong>
            </div>
            {recipients.length === 0 ? (
              <p className="muted">
                Henüz yönlendirme alan terapist kaydı yok.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Hedef uzman</th>
                      <th>Alınan yönlendirme</th>
                      <th>Profil tıklaması</th>
                      <th>Yönlendiren uzmanlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((rec) => (
                      <tr key={rec.uzman.id}>
                        <td>
                          <strong>{rec.uzman.ad}</strong>
                          {rec.uzman.sehir && (
                            <span className="muted"> · {rec.uzman.sehir}</span>
                          )}
                        </td>
                        <td>{rec.alinan_yonlendirme_sayisi}</td>
                        <td>{rec.profil_tiklama_sayisi}</td>
                        <td>
                          <div className="admin-pill-row">
                            {rec.yonlendirenler.map((src) => (
                              <span
                                className="admin-target-chip"
                                key={src.uzman_id}
                              >
                                {src.ad} <strong>×{src.sayi}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="admin-panel-card"
            aria-labelledby="admin-referral-links-heading"
          >
            <div className="admin-card-header">
              <div>
                <span className="eyebrow">BAĞLANTI DÖKÜMÜ</span>
                <h3 id="admin-referral-links-heading">
                  Oluşturulan yönlendirme bağlantıları
                </h3>
              </div>
              <strong>{links.length} bağlantı</strong>
            </div>
            {links.length === 0 ? (
              <p className="muted">Listelenecek yönlendirme bağlantısı yok.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Yönlendiren</th>
                      <th>Neden</th>
                      <th>Önerilen terapistler</th>
                      <th>Görüntülenme / tıklama</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr key={link.id}>
                        <td>
                          {tarih(new Date(link.olusturma * 1000).toISOString())}
                        </td>
                        <td>
                          <strong>{link.yonlendiren.ad}</strong>
                        </td>
                        <td>{reasonLabels[link.neden] ?? link.neden}</td>
                        <td>
                          <div className="admin-pill-row">
                            {link.hedefler.map((target) => (
                              <span
                                className="admin-target-chip"
                                key={target.id}
                              >
                                {target.ad}
                                {target.tiklama_sayisi > 0 && (
                                  <small>
                                    ({target.tiklama_sayisi} tıklama)
                                  </small>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {link.goruntulenme_sayisi} gör. /{" "}
                          {link.profil_tiklamasi} tıklama
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              link.durum === "active"
                                ? "onaylandi"
                                : link.durum === "expired"
                                  ? "bekliyor"
                                  : "reddedildi"
                            }`}
                          >
                            {linkStatusLabels[link.durum] ?? link.durum}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function AdminClientReferrals() {
  const referrals = useApi<YonetimYonlendirmeler>("/yonetim/yonlendirmeler");
  return (
    <AdminClientReferralsView
      data={referrals.data}
      loading={referrals.loading}
      error={referrals.error}
      retry={referrals.reload}
    />
  );
}
