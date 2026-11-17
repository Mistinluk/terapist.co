import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Copy,
  Eye,
  Globe2,
  KeyRound,
  Link2,
  MapPin,
  RefreshCw,
  Settings2,
  Share2,
  SlidersHorizontal,
  Unlink,
  UserRound,
  UsersRound,
} from "lucide-react";
import { api, tarih, type YonetimTrafikAnalitigi } from "../lib/api";
import { analitikYapilandirmaGetir } from "../lib/analytics";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";
import { AnalyticsBarList, DailyTrendChart } from "./AnalyticsBarList";

const gaCallbackMessages: Record<string, string> = {
  bagli: "Google Analytics (GA4) hesabınız başarıyla bağlandı.",
  iptal: "Google Analytics yetkilendirme işlemi iptal edildi.",
  gecersiz: "Yetkilendirme oturumu doğrulanamadı; yeniden deneyin.",
  hata: "Google Analytics bağlantısı kurulurken bir sorun oluştu.",
};

export function AdminTrafficAnalytics({
  gaCallback,
  onClearGaCallback,
  onOpenTherapist,
}: {
  gaCallback?: string | null;
  onClearGaCallback?: () => void;
  onOpenTherapist?: (uzmanId: string) => void;
}) {
  const [gun, setGun] = useState<7 | 30 | 90>(30);
  const [kaynak, setKaynak] = useState<"karma" | "site_ici" | "ga4">("karma");
  const [yenileTick, setYenileTick] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);

  const query = `/yonetim/trafik-analitigi?gun=${gun}&kaynak=${kaynak}${
    yenileTick > 0 ? "&yenile=true" : ""
  }`;
  const report = useApi<YonetimTrafikAnalitigi>(query);

  const [measurementId, setMeasurementId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!report.data?.ga4_durumu) return;
    const g = report.data.ga4_durumu;
    setMeasurementId(g.olcum_kimligi || "");
    setPropertyId(g.mulk_kimligi || "");
    setTrackingEnabled(g.olcum_etkin);
  }, [report.data?.ga4_durumu]);

  useEffect(() => {
    if (!gaCallback) return;
    const notice = gaCallbackMessages[gaCallback];
    if (notice) {
      if (gaCallback === "bagli") setMessage(notice);
      else setErrorMsg(notice);
      setConfigOpen(true);
    }
    onClearGaCallback?.();
  }, [gaCallback, onClearGaCallback]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMsg("");
    try {
      const payload: Record<string, unknown> = {
        ga_olcum_kimligi: measurementId.trim(),
        ga4_mulk_kimligi: propertyId.trim(),
        olcum_etkin: trackingEnabled,
      };
      if (serviceAccountJson.trim()) {
        payload.hizmet_hesabi_json = serviceAccountJson.trim();
      }
      await api("/yonetim/analitik-ayarlar", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await analitikYapilandirmaGetir(true);
      setServiceAccountJson("");
      setMessage("Site içi ölçüm ve GA4 rapor bağlantısı ayarları kaydedildi.");
      report.reload();
    } catch (error) {
      setErrorMsg((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function connectGoogleOAuth() {
    setBusy(true);
    setMessage("");
    setErrorMsg("");
    try {
      const result = await api<{ yonlendirme_url: string }>(
        "/yonetim/analitik/google/baglanti",
        { method: "POST", body: "{}" },
      );
      window.location.assign(result.yonlendirme_url);
    } catch (error) {
      setErrorMsg((error as Error).message);
      setBusy(false);
    }
  }

  async function disconnectGoogle() {
    if (
      !window.confirm(
        "Google Analytics API bağlantısı kesilsin mi? Site içi ölçüm çalışmaya devam eder.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    setErrorMsg("");
    try {
      await api("/yonetim/analitik/google/baglanti", { method: "DELETE" });
      setMessage("Google Analytics API bağlantısı kaldırıldı.");
      report.reload();
    } catch (error) {
      setErrorMsg((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyRedirectUri(uri: string) {
    navigator.clipboard
      .writeText(uri)
      .then(() => setMessage("Yönlendirme adresi kopyalandı."))
      .catch(() => setErrorMsg("Adresi seçip elle kopyalayın."));
  }

  const data = report.data;
  const ga4Status = data?.ga4_durumu;
  const isGaConnected =
    ga4Status?.baglanti_durumu === "oauth_bagli" ||
    ga4Status?.baglanti_durumu === "hizmet_hesabi";

  return (
    <div className="admin-section-stack">
      <div className="analytics-toolbar-card">
        <div className="analytics-toolbar-left">
          <div
            className="admin-filter-pills"
            role="group"
            aria-label="Zaman aralığı"
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
          <div
            className="admin-filter-pills"
            role="group"
            aria-label="Veri kaynağı"
          >
            <button
              type="button"
              className={`admin-pill-btn ${kaynak === "karma" || kaynak === "ga4" ? "is-active" : ""}`}
              onClick={() => setKaynak("karma")}
            >
              Otomatik (GA4 + Site)
            </button>
            <button
              type="button"
              className={`admin-pill-btn ${kaynak === "site_ici" ? "is-active" : ""}`}
              onClick={() => setKaynak("site_ici")}
            >
              Site içi ölçüm
            </button>
          </div>
        </div>
        <div className="analytics-toolbar-actions">
          <span
            className={`analytics-source-pill ${
              data?.aktif_kaynak === "ga4" ? "is-ga4" : "is-internal"
            }`}
          >
            <Activity size={14} aria-hidden="true" />
            {data?.aktif_kaynak === "ga4"
              ? "Google Analytics (GA4) verisi"
              : "Site içi ölçüm verisi"}
          </span>
          <button
            type="button"
            className="button secondary admin-compact-btn"
            onClick={() => {
              setYenileTick((prev) => prev + 1);
              report.reload();
            }}
            disabled={report.loading}
          >
            <RefreshCw size={15} aria-hidden="true" /> Yenile
          </button>
          <button
            type="button"
            className="button secondary admin-compact-btn"
            aria-expanded={configOpen}
            onClick={() => setConfigOpen((open) => !open)}
          >
            <Settings2 size={15} aria-hidden="true" />
            {ga4Status?.olcum_kimligi
              ? `GA4: ${ga4Status.olcum_kimligi}`
              : "GA4 rapor bağlantısı"}
          </button>
        </div>
      </div>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {errorMsg && (
        <p className="notice error" role="alert">
          {errorMsg}
        </p>
      )}
      {ga4Status?.hata && (
        <p className="notice error" role="alert">
          Google Analytics uyarısı: {ga4Status.hata} (Şu anda site içi ölçüm
          verileri gösteriliyor.)
        </p>
      )}

      {configOpen && ga4Status && (
        <section
          className="admin-panel-card analytics-config-card"
          aria-labelledby="ga4-config-heading"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">GOOGLE ANALYTICS 4 (GA4) AYARLARI</span>
              <h3 id="ga4-config-heading">
                Site içi ölçüm ve Google Analytics rapor bağlantısı
              </h3>
            </div>
            {isGaConnected && (
              <span className="analytics-source-pill is-ga4">
                <CheckCircle2 size={14} aria-hidden="true" />
                {ga4Status.baglanti_durumu === "hizmet_hesabi"
                  ? "Hizmet hesabı bağlı"
                  : "Google hesabı bağlı"}
              </span>
            )}
          </div>

          <p className="muted small">
            Site içi ölçüm yalnızca herkese açık sayfalarda çalışır. Özel
            bağlantıları korumak için tarayıcıdan Google Analytics'e yeni olay
            gönderilmez. Mevcut GA4 raporlarını görüntülemek için Mülk Kimliğini
            girip Google hesabınızı veya hizmet hesabınızı bağlayın.
          </p>

          <form className="analytics-config-form" onSubmit={saveSettings}>
            <div className="analytics-config-grid">
              <label className="field">
                GA4 Ölçüm Kimliği (Measurement ID)
                <input
                  type="text"
                  placeholder="G-XXXXXXXXXX"
                  value={measurementId}
                  onChange={(e) => setMeasurementId(e.target.value)}
                />
                <span className="muted small">
                  Kayıtlı GA4 kimliğidir; tarayıcıda izlemeyi etkinleştirmez.
                </span>
              </label>

              <label className="field">
                GA4 Mülk Kimliği (Property ID)
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456789"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                />
                <span className="muted small">
                  Google Analytics yönetici panelindeki rakamsal Mülk Kimliği.
                </span>
              </label>
            </div>

            <label className="analytics-switch-row">
              <input
                type="checkbox"
                checked={trackingEnabled}
                onChange={(e) => setTrackingEnabled(e.target.checked)}
              />
              <span>
                Herkese açık sayfalarda site içi trafik ölçümünü etkin tut
              </span>
            </label>

            <details className="analytics-sa-details">
              <summary>
                <KeyRound size={15} aria-hidden="true" />
                <span>
                  Hizmet Hesabı (Service Account) JSON ile bağla (isteğe bağlı)
                </span>
              </summary>
              <div className="analytics-sa-body">
                <label className="field">
                  Service Account JSON içeriği
                  <textarea
                    rows={4}
                    placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                    value={serviceAccountJson}
                    onChange={(e) => setServiceAccountJson(e.target.value)}
                  />
                </label>
                <span className="muted small">
                  Hizmet hesabını GA4 mülkünüzde &ldquo;Görüntüleyen&rdquo;
                  olarak eklemeniz yeterlidir; anahtar sunucuda Fernet ile
                  şifrelenir.
                </span>
              </div>
            </details>

            <div className="analytics-config-actions">
              <button className="button" type="submit" disabled={busy}>
                <SlidersHorizontal size={16} aria-hidden="true" />
                {busy ? "Kaydediliyor…" : "Ölçüm ayarlarını kaydet"}
              </button>

              {ga4Status.oauth_etkin && (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={connectGoogleOAuth}
                >
                  <Globe2 size={16} aria-hidden="true" />
                  {isGaConnected
                    ? "Google hesabını değiştir"
                    : "Google Analytics hesabını bağla (OAuth)"}
                </button>
              )}

              {isGaConnected && (
                <button
                  className="button secondary danger-ghost"
                  type="button"
                  disabled={busy}
                  onClick={disconnectGoogle}
                >
                  <Unlink size={16} aria-hidden="true" />
                  Bağlantıyı kes
                </button>
              )}
            </div>

            <div className="analytics-oauth-hint">
              <span className="muted small">
                {ga4Status.hesap_etiketi && (
                  <>
                    Bağlı hesap: <strong>{ga4Status.hesap_etiketi}</strong>
                    {ga4Status.son_senkron &&
                      ` · Son eşitleme: ${tarih(new Date(ga4Status.son_senkron * 1000).toISOString())}`}
                    {" · "}
                  </>
                )}
                Google Cloud OAuth yetkili yönlendirme adresi:
              </span>
              <div className="analytics-uri-chip">
                <code>{ga4Status.geri_donus_adresi}</code>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => copyRedirectUri(ga4Status.geri_donus_adresi)}
                >
                  <Copy size={14} aria-hidden="true" /> Kopyala
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <Status
        loading={report.loading}
        error={report.error}
        retry={report.reload}
      />

      {data && (
        <AdminTrafficAnalyticsView
          data={data}
          onOpenTherapist={onOpenTherapist}
        />
      )}
    </div>
  );
}

export function AdminTrafficAnalyticsView({
  data,
  onOpenTherapist,
}: {
  data: YonetimTrafikAnalitigi;
  onOpenTherapist?: (uzmanId: string) => void;
}) {
  const topProfile = data.en_cok_ziyaret_edilen_uzmanlar[0];
  const topSource = data.yonlendiren_kaynaklar[0];
  const topLocation = data.ziyaretci_konumlari[0];

  return (
    <>
      <section
        className="analytics-grid analytics-grid-two-by-two"
        aria-label="Ana ziyaretçi ve trafik metrikleri"
      >
        <div className="analytics-metric analytics-metric-static">
          <div className="analytics-metric-heading">
            <UsersRound size={19} aria-hidden="true" />
            <h3>Kaç Kişi Girdi</h3>
          </div>
          <strong className="tabular-num">{data.ozet.ziyaretci}</strong>
          <p>tekil ziyaretçi (son {data.gun} gün)</p>
          <span>{data.ozet.sayfa_goruntuleme} toplam sayfa görüntüleme</span>
        </div>

        <div className="analytics-metric analytics-metric-static">
          <div className="analytics-metric-heading">
            <Share2 size={19} aria-hidden="true" />
            <h3>En Fazla Yönlendiren</h3>
          </div>
          <strong>{topSource?.etiket || "Henüz veri yok"}</strong>
          <p>
            {topSource
              ? `${topSource.ziyaretci} ziyaretçi (%${topSource.pay_yuzde})`
              : "Instagram, YouTube, Google veya Doğrudan"}
          </p>
          <span>
            {data.yonlendiren_kaynaklar.length} farklı yönlendirme kaynağı
          </span>
        </div>

        {topProfile ? (
          <button
            type="button"
            className="analytics-metric"
            onClick={() => onOpenTherapist?.(topProfile.uzman_id)}
          >
            <div className="analytics-metric-heading">
              <UserRound size={19} aria-hidden="true" />
              <h3>En Çok Ziyaret Edilen Profil</h3>
            </div>
            <strong>{topProfile.ad}</strong>
            <p>
              /{topProfile.kullanici_adi} · {topProfile.sehir}
            </p>
            <span>
              {topProfile.profil_goruntuleme} görüntülenme ·{" "}
              {topProfile.randevu_talebi} randevu
            </span>
          </button>
        ) : (
          <div className="analytics-metric analytics-metric-static">
            <div className="analytics-metric-heading">
              <UserRound size={19} aria-hidden="true" />
              <h3>En Çok Ziyaret Edilen Profil</h3>
            </div>
            <strong>Henüz yok</strong>
            <p>Son {data.gun} günde profil ziyareti bekleniyor</p>
            <span>Ziyaretler geldikçe burada öne çıkar</span>
          </div>
        )}

        <div className="analytics-metric analytics-metric-static">
          <div className="analytics-metric-heading">
            <MapPin size={19} aria-hidden="true" />
            <h3>En Yoğun Konum</h3>
          </div>
          <strong>{topLocation?.sehir || "Henüz veri yok"}</strong>
          <p>
            {topLocation
              ? `${topLocation.ulke} · ${topLocation.ziyaretci} ziyaretçi`
              : "Ziyaretçi şehir ve ülke dağılımı"}
          </p>
          <span>
            {topLocation
              ? `Toplam trafiğin %${topLocation.pay_yuzde}'i`
              : "Konum sinyalleri bekleniyor"}
          </span>
        </div>
      </section>

      <DailyTrendChart
        title={`Günlük ziyaretçi ve sayfa trafiği (Son ${data.gun} gün)`}
        eyebrow="ZAMAN ÇİZELGESİ"
        headingId="admin-daily-trend-heading"
        primaryLabel="Sayfa görüntüleme"
        secondaryLabel="Tekil ziyaretçi"
        points={data.gunluk_egilim.map((item) => ({
          tarih: item.tarih,
          birincil: item.sayfa_goruntuleme,
          ikincil: item.ziyaretci,
        }))}
      />

      <div className="admin-stats-columns">
        <AnalyticsBarList
          title="En fazla siteye yönlendirme yapan adresler"
          eyebrow="INSTAGRAM · YOUTUBE · GOOGLE · DOĞRUDAN"
          headingId="admin-referrers-heading"
          valueLabel="Ziyaretçi"
          emptyText="Bu dönemde yönlendiren kaynak verisi henüz oluşmadı."
          items={data.yonlendiren_kaynaklar.map((item) => ({
            key: `${item.anahtar}:${item.etiket}`,
            label: item.etiket,
            value: item.ziyaretci,
            sharePct: item.pay_yuzde,
            secondaryValue: `${item.sayfa_goruntuleme} görüntüleme`,
          }))}
        />

        <AnalyticsBarList
          title="En fazla ziyaretçinin geldiği konumlar"
          eyebrow="COĞRAFİ DAĞILIM"
          headingId="admin-locations-heading"
          valueLabel="Ziyaretçi"
          emptyText="Bu dönemde konum dağılımı henüz oluşmadı."
          items={data.ziyaretci_konumlari.map((item) => ({
            key: `${item.sehir}:${item.ulke}`,
            label:
              item.ulke && item.ulke !== "TR"
                ? `${item.sehir} (${item.ulke})`
                : item.sehir,
            value: item.ziyaretci,
            sharePct: item.pay_yuzde,
            secondaryValue: `${item.sayfa_goruntuleme} görüntüleme`,
          }))}
        />
      </div>

      <section
        className="admin-panel-card"
        aria-labelledby="admin-top-therapists-heading"
      >
        <div className="admin-card-header">
          <div>
            <span className="eyebrow">TERAPİST PROFİL TRAFİĞİ</span>
            <h3 id="admin-top-therapists-heading">
              En çok ziyaret edilen terapist profilleri
            </h3>
          </div>
          <span className="muted small">Son {data.gun} gün</span>
        </div>
        {data.en_cok_ziyaret_edilen_uzmanlar.length === 0 ? (
          <p className="muted small">
            Henüz terapist profili ziyareti kaydedilmedi. Profiller ziyaret
            edildikçe sıralama burada güncellenir.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">
                En çok ziyaret edilen terapist profilleri listesi
              </caption>
              <thead>
                <tr>
                  <th>Sıra</th>
                  <th>Terapist</th>
                  <th>Şehir</th>
                  <th>Görüntülenme</th>
                  <th>Tekil ziyaretçi</th>
                  <th>Randevu talebi</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.en_cok_ziyaret_edilen_uzmanlar.map((item, idx) => (
                  <tr key={item.uzman_id}>
                    <td className="tabular-num">#{idx + 1}</td>
                    <td>
                      <strong>{item.ad}</strong>
                      <div className="muted small">/{item.kullanici_adi}</div>
                    </td>
                    <td>{item.sehir}</td>
                    <td className="tabular-num">
                      <strong>{item.profil_goruntuleme}</strong>
                    </td>
                    <td className="tabular-num">{item.tekil_ziyaretci}</td>
                    <td className="tabular-num">{item.randevu_talebi}</td>
                    <td>
                      <div className="actions">
                        {onOpenTherapist && (
                          <button
                            type="button"
                            className="button secondary admin-compact-btn"
                            onClick={() => onOpenTherapist(item.uzman_id)}
                          >
                            <Eye size={14} aria-hidden="true" /> İncele
                          </button>
                        )}
                        <a
                          className="button secondary admin-compact-btn"
                          href={`/${item.kullanici_adi}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Link2 size={14} aria-hidden="true" /> Profil
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-stats-columns">
        <AnalyticsBarList
          title="Sayfa türlerine göre görüntülenme"
          eyebrow="İÇERİK BÖLÜMLERİ"
          headingId="admin-page-types-heading"
          valueLabel="Görüntülenme"
          emptyText="Henüz sayfa türü ölçümü oluşmadı."
          items={data.sayfa_turleri.map((item) => ({
            key: item.tur,
            label: item.etiket,
            value: item.goruntuleme,
          }))}
        />

        <section
          className="admin-panel-card"
          aria-labelledby="admin-funnel-heading"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">ETKİLEŞİM VE DÖNÜŞÜM HUNİSİ</span>
              <h3 id="admin-funnel-heading">
                Rehberden randevuya ziyaretçi yolculuğu
              </h3>
            </div>
          </div>
          <div className="admin-stat-list">
            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <span>Terapist rehberi aramaları</span>
              </div>
              <div className="admin-stat-values">
                <strong>{data.donusum_hunisi.dizin_aramasi} arama</strong>
              </div>
            </div>
            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <span>Terapist profili ziyaretleri</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.donusum_hunisi.profil_goruntuleme} görüntülenme
                </strong>
              </div>
            </div>
            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <span>Randevu saati seçimleri</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {data.donusum_hunisi.randevu_cekmecesi} etkileşim
                </strong>
              </div>
            </div>
            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <span>Gönderilen randevu talepleri</span>
              </div>
              <div className="admin-stat-values">
                <strong>{data.donusum_hunisi.randevu_talebi} talep</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
