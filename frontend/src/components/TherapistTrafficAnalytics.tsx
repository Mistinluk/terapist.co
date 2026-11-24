import { useState } from "react";
import {
  ArrowRight,
  BellPlus,
  CalendarDays,
  Check,
  Copy,
  Eye,
  KeyRound,
  Link2,
  MapPin,
  MousePointerClick,
  PlayCircle,
  QrCode,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { type UzmanTrafikAnalitigi } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";
import { AnalyticsBarList, DailyTrendChart } from "./AnalyticsBarList";

const resourceCategoryLabels: Record<string, string> = {
  yazi: "Yazı",
  kitap: "Kitap",
  podcast: "Podcast",
  diger: "Diğer",
};

export function TherapistTrafficAnalytics({
  onEditProfile,
  onOpenBadge,
}: {
  onEditProfile: () => void;
  onOpenBadge: () => void;
}) {
  const [gun, setGun] = useState<7 | 30 | 90>(30);
  const [copied, setCopied] = useState(false);
  const analytics = useApi<UzmanTrafikAnalitigi>(
    `/uzman/trafik-analitigi?gun=${gun}`,
  );

  const data = analytics.data;
  const profileUrl =
    typeof window !== "undefined" && data?.profil_adresi
      ? `${window.location.origin}${data.profil_adresi}`
      : data?.profil_adresi || "";

  function copyLink() {
    if (!profileUrl) return;
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  }

  return (
    <div className="admin-section-stack">
      <div className="analytics-toolbar-card">
        <div
          className="admin-filter-pills"
          role="group"
          aria-label="Zaman aralığı seçimi"
        >
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              className={`admin-pill-btn ${gun === days ? "is-active" : ""}`}
              onClick={() => setGun(days)}
            >
              Son {days} gün
            </button>
          ))}
        </div>

        {profileUrl && (
          <div className="analytics-profile-share">
            <span className="muted small">Profil adresiniz:</span>
            <code>{data?.profil_adresi}</code>
            <button
              type="button"
              className="button secondary admin-compact-btn"
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden="true" /> Kopyalandı
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" /> Bağlantıyı kopyala
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <Status
        loading={analytics.loading}
        error={analytics.error}
        retry={analytics.reload}
      />

      {data && (
        <TherapistTrafficAnalyticsView
          data={data}
          onEditProfile={onEditProfile}
          onOpenBadge={onOpenBadge}
        />
      )}
    </div>
  );
}

export function TherapistTrafficAnalyticsView({
  data,
  onEditProfile,
  onOpenBadge,
}: {
  data: UzmanTrafikAnalitigi;
  onEditProfile: () => void;
  onOpenBadge: () => void;
}) {
  return (
    <>
      <section className="analytics-grid" aria-label="Profil performans özeti">
        <div className="analytics-metric analytics-metric-static">
          <div className="analytics-metric-heading">
            <Eye size={19} aria-hidden="true" />
            <h3>Profil ziyaretçileri</h3>
          </div>
          <strong className="tabular-num">{data.ozet.tekil_ziyaretci}</strong>
          <p>tekil ziyaretçi (son {data.gun} gün)</p>
          <span>{data.ozet.profil_goruntuleme} profil görüntülenmesi</span>
        </div>

        <div className="analytics-metric analytics-metric-static">
          <div className="analytics-metric-heading">
            <CalendarDays size={19} aria-hidden="true" />
            <h3>Randevu ilgisi</h3>
          </div>
          <strong className="tabular-num">{data.ozet.randevu_talebi}</strong>
          <p>randevu talebi oluşturuldu</p>
          <span>
            %{data.ozet.donusum_orani_yuzde.toLocaleString("tr-TR")} dönüşüm ·{" "}
            {data.ozet.randevu_cekmece_acilisi} saat seçimi
          </span>
        </div>

        <div className="analytics-metric analytics-metric-static">
          <div className="analytics-metric-heading">
            <Share2 size={19} aria-hidden="true" />
            <h3>Başlıca ziyaret kaynağı</h3>
          </div>
          <strong>{data.ozet.en_yuksek_kaynak || "Henüz veri yok"}</strong>
          <p>ziyaretçilerin sizi en çok bulduğu yer</p>
          <span>
            {data.ozet.kaynak_ve_rozet_tiklamasi} toplam bağlantı / rozet
            tıklaması
          </span>
        </div>
      </section>

      <DailyTrendChart
        title={`Son ${data.gun} gündeki profil ziyaretleri`}
        eyebrow="GÜNLÜK GÖRÜNÜRLÜK"
        headingId="therapist-daily-trend-heading"
        primaryLabel="Profil görüntüleme"
        secondaryLabel="Randevu talebi"
        points={data.gunluk_egilim.map((item) => ({
          tarih: item.tarih,
          birincil: item.goruntuleme,
          ikincil: item.randevu_talebi,
        }))}
      />

      <div className="admin-stats-columns">
        <AnalyticsBarList
          title="Ziyaretçiler profilinize nereden geldi?"
          eyebrow="YÖNLENDİRME KAYNAKLARI"
          headingId="therapist-sources-heading"
          valueLabel="Ziyaretçi"
          emptyText="Profil bağlantınızı paylaştıkça ziyaretçilerin Google, Instagram, YouTube veya Terapist.co rehberinden geliş oranı burada görünür."
          items={data.gelis_kaynaklari.map((item) => ({
            key: `${item.anahtar}:${item.etiket}`,
            label: item.etiket,
            value: item.ziyaretci,
            sharePct: item.pay_yuzde,
          }))}
        />

        <section
          className="admin-panel-card"
          aria-labelledby="therapist-engagement-heading"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">ETKİLEŞİMLER VE KONUM</span>
              <h3 id="therapist-engagement-heading">
                Profilinizdeki ziyaretçi hareketleri
              </h3>
            </div>
          </div>

          <div className="admin-stat-list">
            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <Link2 size={16} aria-hidden="true" />
                <span>Bilgi kaynakları tıklaması</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.profil_etkilesimleri.bilgi_kaynagi_tiklama}
                </strong>
                <small>yazı / bağlantı açılışı</small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Web sitesi rozeti tıklaması</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.profil_etkilesimleri.website_rozet_tiklama}
                </strong>
                <small>dış siteden gelen ziyaret</small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <MousePointerClick size={16} aria-hidden="true" />
                <span>Randevu saati seçimi</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.profil_etkilesimleri.randevu_form_acilisi}
                </strong>
                <small>son {data.gun} gün</small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <BellPlus size={16} aria-hidden="true" />
                <span>Bekleme listesi başvurusu</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.profil_etkilesimleri.bekleme_listesi_basvurusu ?? 0}
                </strong>
                <small>
                  {data.bekleme_ozeti
                    ? `${data.bekleme_ozeti.bekleyen} aktif bekliyor`
                    : `son ${data.gun} gün`}
                </small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <PlayCircle size={16} aria-hidden="true" />
                <span>Gömülü medya oynatma</span>
              </div>
              <div className="admin-stat-values">
                <strong>{data.profil_etkilesimleri.medya_oynatma ?? 0}</strong>
                <small>Spotify / YouTube</small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <QrCode size={16} aria-hidden="true" />
                <span>QR kart taraması</span>
              </div>
              <div className="admin-stat-values">
                <strong>{data.profil_etkilesimleri.qr_ziyaret ?? 0}</strong>
                <small>masa kartı ve paylaşım</small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <KeyRound size={16} aria-hidden="true" />
                <span>Şifreli bağlantı açılışı</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.profil_etkilesimleri.kilitli_link_acilisi ?? 0}
                </strong>
                <small>erişim koduyla açılış</small>
              </div>
            </div>
          </div>

          {data.ziyaretci_konumlari.length > 0 && (
            <div className="admin-distribution-block">
              <h4>
                <MapPin size={14} aria-hidden="true" /> Ziyaretçilerin bulunduğu
                bölgeler
              </h4>
              <div className="admin-pill-row">
                {data.ziyaretci_konumlari.map((loc) => (
                  <span className="analytics-location-chip" key={loc.konum}>
                    {loc.konum} · %{loc.pay_yuzde.toLocaleString("tr-TR")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {data.baglanti_performansi && data.baglanti_performansi.length > 0 && (
        <section
          className="admin-panel-card analytics-link-performance-card"
          aria-labelledby="link-performance-title"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">BAĞLANTI BAZLI DÖNÜŞÜM</span>
              <h3 id="link-performance-title">
                Bağlantı tıklama ve dönüşüm oranları
              </h3>
            </div>
            <span className="muted small">
              T.O. = profil görüntülenmesine göre tıklama dönüşümü
            </span>
          </div>
          <div className="analytics-link-table">
            {data.baglanti_performansi.map((row) => (
              <div className="analytics-link-row" key={row.id}>
                <div className="analytics-link-main">
                  <div className="analytics-link-title-row">
                    <strong>{row.baslik}</strong>
                    <div className="analytics-link-pills">
                      <span className="analytics-link-cat">
                        {resourceCategoryLabels[row.kategori] ?? "Diğer"}
                      </span>
                      {row.vurgulu && (
                        <span className="analytics-link-flag is-highlight">
                          Vurgulu
                        </span>
                      )}
                      {row.kilitli && (
                        <span className="analytics-link-flag is-locked">
                          Şifreli
                        </span>
                      )}
                      {row.medya_turu !== "none" && (
                        <span className="analytics-link-flag">
                          {row.medya_turu === "spotify" ? "Spotify" : "YouTube"}
                        </span>
                      )}
                      {row.zaman_durumu !== "aktif" && (
                        <span className="analytics-link-flag is-muted">
                          {row.zaman_durumu === "planli"
                            ? "Planlı"
                            : "Süresi doldu"}
                        </span>
                      )}
                    </div>
                  </div>
                  <progress
                    className="analytics-link-progress"
                    value={Math.max(0, Math.min(100, row.tiklama_payi_yuzde))}
                    max={100}
                    aria-label={`${row.baslik} tıklama payı yüzde ${row.tiklama_payi_yuzde.toLocaleString("tr-TR")}`}
                  />
                </div>
                <div className="analytics-link-metrics tabular-num">
                  <strong>{row.tiklama_sayisi} tıklama</strong>
                  <span>
                    %{row.tiklama_payi_yuzde.toLocaleString("tr-TR")} pay · %
                    {row.to_orani_yuzde.toLocaleString("tr-TR")} T.O.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className="growth-next"
        aria-labelledby="therapist-analytics-tip"
      >
        <div>
          <span className="eyebrow">ÖNERİLEN ADIM</span>
          <h3 id="therapist-analytics-tip">{data.oneri.baslik}</h3>
          <p>{data.oneri.aciklama}</p>
        </div>
        <div className="actions">
          <button className="button" type="button" onClick={onEditProfile}>
            Profili ve saatleri düzenle{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={onOpenBadge}
          >
            Rozet ekle
          </button>
        </div>
      </section>
    </>
  );
}
