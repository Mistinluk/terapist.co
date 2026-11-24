import {
  ArrowRight,
  Award,
  CalendarDays,
  Link2,
  MousePointerClick,
  Share2,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { YonetimAnalitik } from "../lib/api";
import { Status } from "./Status";

export type AdminAnalitikSekme =
  | "analitik"
  | "trafik"
  | "randevular"
  | "mesajlar"
  | "uzmanlar"
  | "kurucu"
  | "yonlendirmeler"
  | "referanslar"
  | "moderasyon"
  | "denetim";

export function AdminAnalyticsOverview({
  data,
  onNavigate,
}: {
  data: YonetimAnalitik;
  onNavigate: (tab: AdminAnalitikSekme) => void;
}) {
  const { ozet, ag_ve_profil, buyume_ve_yonlendirme } = data;
  const maxCity = Math.max(
    1,
    ...data.sehir_dagilimi.map((item) => item.toplam),
  );
  const formatTotal = Math.max(
    1,
    data.format_dagilimi.cevrim_ici + data.format_dagilimi.yuz_yuze,
  );
  const nextTab = (data.siradaki_adim.sekme ||
    "uzmanlar") as AdminAnalitikSekme;

  return (
    <div className="admin-analytics-stack">
      <section
        className="analytics-grid"
        aria-label="Platform yönetim özet metrikleri"
      >
        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("uzmanlar")}
        >
          <div className="analytics-metric-heading">
            <UsersRound size={19} aria-hidden="true" />
            <h3>Uzman ağı</h3>
          </div>
          <strong>{ozet.toplam_uzman}</strong>
          <p>aktif kayıtlı uzman</p>
          <span>
            {ozet.yayindaki_uzman} yayında · {ozet.bekleyen_uzman} incelemede
          </span>
          <span className="analytics-action">
            Uzmanları incele <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("randevular")}
        >
          <div className="analytics-metric-heading">
            <CalendarDays size={19} aria-hidden="true" />
            <h3>Genel randevular</h3>
          </div>
          <strong>{ozet.randevular.toplam}</strong>
          <p>anonim randevu talebi</p>
          <span>
            Son 30 günde {ozet.randevular.son_30_gun} · %
            {ozet.randevular.onay_orani_yuzde.toLocaleString("tr-TR")} onay
          </span>
          <span className="analytics-action">
            Randevu akışını aç <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("kurucu")}
        >
          <div className="analytics-metric-heading">
            <Award size={19} aria-hidden="true" />
            <h3>Kurucu programı</h3>
          </div>
          <strong>
            {ozet.kurucu_programi.atanmis_uye} /{" "}
            {ozet.kurucu_programi.azami_uye}
          </strong>
          <p>atanmış kurucu üye</p>
          <span>{ozet.kurucu_programi.kalan} boş kontenjan kaldı</span>
          <span className="analytics-action">
            Üyeleri yönet <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("yonlendirmeler")}
        >
          <div className="analytics-metric-heading">
            <Share2 size={19} aria-hidden="true" />
            <h3>Danışan yönlendirme</h3>
          </div>
          <strong>{buyume_ve_yonlendirme.toplam_yonlendirme_linki}</strong>
          <p>oluşturulan yönlendirme bağlantısı</p>
          <span>
            {buyume_ve_yonlendirme.yonlendirme_hedef_atamasi} tercih ·{" "}
            {buyume_ve_yonlendirme.yonlendirme_profil_tiklamasi} profil
            tıklaması
          </span>
          <span className="analytics-action">
            Yönlendirmeleri gör <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>
      </section>

      <section
        className="analytics-next-step"
        aria-labelledby="admin-next-step-title"
      >
        <span className="eyebrow">SIRADAKİ EN YARARLI ADIM</span>
        <h3 id="admin-next-step-title">{data.siradaki_adim.baslik}</h3>
        <p>{data.siradaki_adim.aciklama}</p>
        <button
          className="button"
          type="button"
          onClick={() => onNavigate(nextTab)}
        >
          İlgili alana git <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>

      <div className="admin-stats-columns">
        <section
          className="admin-panel-card"
          aria-labelledby="admin-feature-usage-heading"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">PROFİL VE AĞ ÖZELLİKLERİ</span>
              <h3 id="admin-feature-usage-heading">
                Terapist araçlarının kullanım durumu
              </h3>
            </div>
          </div>
          <div className="admin-stat-list">
            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <CalendarDays size={16} aria-hidden="true" />
                <span>Google Takvim entegrasyonu</span>
              </div>
              <div className="admin-stat-values">
                <strong>{ag_ve_profil.takvim_bagli_uzman} aktif</strong>
                <small>
                  {ag_ve_profil.takvim_koptu_uzman} kopuk ·{" "}
                  {ag_ve_profil.takvim_webhook_aktif_kanal} webhook kanalı
                </small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Web sitesi doğrulama rozeti</span>
              </div>
              <div className="admin-stat-values">
                <strong>{ag_ve_profil.rozet_olusturan_uzman} rozet</strong>
                <small>{ag_ve_profil.rozet_toplam_tiklama} dış tıklama</small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <Link2 size={16} aria-hidden="true" />
                <span>Profil bilgi kaynakları</span>
              </div>
              <div className="admin-stat-values">
                <strong>{ag_ve_profil.profil_kaynagi_sayisi} bağlantı</strong>
                <small>
                  {ag_ve_profil.profil_kaynagi_tiklama} toplam tıklama
                </small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <UsersRound size={16} aria-hidden="true" />
                <span>Mesleki ağ ve uzmanlık sinyalleri</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {ag_ve_profil.aktif_profesyonel_baglanti} bağlantı
                </strong>
                <small>
                  {ag_ve_profil.uzmanlik_iliskisi_sayisi} alan ·{" "}
                  {ag_ve_profil.tavsiye_sayisi} öneri ·{" "}
                  {ag_ve_profil.acik_moderasyon_raporu} açık rapor
                </small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <UserPlus size={16} aria-hidden="true" />
                <span>Terapist davet dönüşümü</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {buyume_ve_yonlendirme.kabul_edilen_davet} /{" "}
                  {buyume_ve_yonlendirme.toplam_davet} kabul
                </strong>
                <small>
                  {buyume_ve_yonlendirme.bekleyen_davet} bekleyen davet
                </small>
              </div>
            </div>

            <div className="admin-stat-item">
              <div className="admin-stat-label">
                <MousePointerClick size={16} aria-hidden="true" />
                <span>Yönlendirme bağlantısı etkileşimi</span>
              </div>
              <div className="admin-stat-values">
                <strong>
                  {buyume_ve_yonlendirme.yonlendirme_goruntulenme} görüntülenme
                </strong>
                <small>
                  {buyume_ve_yonlendirme.aktif_yonlendirme_linki} aktif bağlantı
                </small>
              </div>
            </div>
          </div>
        </section>

        <section
          className="admin-panel-card"
          aria-labelledby="admin-distribution-heading"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">DAĞILIM VE DURUMLAR</span>
              <h3 id="admin-distribution-heading">
                Randevular, görüşme şekilleri ve şehirler
              </h3>
            </div>
          </div>

          <div className="admin-distribution-block">
            <h4>Randevu durum dağılımı</h4>
            <div className="admin-pill-row">
              <span className="status-badge bekliyor">
                Bekleyen: {ozet.randevular.bekliyor}
              </span>
              <span className="status-badge onaylandi">
                Onaylı: {ozet.randevular.onaylandi}
              </span>
              <span className="status-badge reddedildi">
                Reddedilen: {ozet.randevular.reddedildi}
              </span>
              <span className="status-badge">
                İptal: {ozet.randevular.iptal}
              </span>
              <span className="status-badge">
                Yaklaşan aktif: {ozet.randevular.gelecek_aktif}
              </span>
            </div>
          </div>

          <div className="admin-distribution-block">
            <h4>Görüşme şekilleri</h4>
            <div className="admin-bar-list">
              <div className="admin-bar-row">
                <div className="admin-bar-meta">
                  <span>Çevrim içi</span>
                  <strong>{data.format_dagilimi.cevrim_ici}</strong>
                </div>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar-fill"
                    style={{
                      width: `${Math.round((data.format_dagilimi.cevrim_ici / formatTotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="admin-bar-row">
                <div className="admin-bar-meta">
                  <span>Yüz yüze</span>
                  <strong>{data.format_dagilimi.yuz_yuze}</strong>
                </div>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar-fill"
                    style={{
                      width: `${Math.round((data.format_dagilimi.yuz_yuze / formatTotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-distribution-block">
            <h4>Şehir dağılımı (yayında / toplam)</h4>
            {data.sehir_dagilimi.length === 0 ? (
              <p className="muted">Henüz şehir kaydı bulunmuyor.</p>
            ) : (
              <div className="admin-bar-list">
                {data.sehir_dagilimi.map((city) => (
                  <div className="admin-bar-row" key={city.sehir}>
                    <div className="admin-bar-meta">
                      <span>{city.sehir}</span>
                      <strong>
                        {city.yayinda} / {city.toplam}
                      </strong>
                    </div>
                    <div className="admin-bar-track">
                      <div
                        className="admin-bar-fill"
                        style={{
                          width: `${Math.round((city.toplam / maxCity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function AdminAnalytics({
  data,
  loading,
  error,
  retry,
  onNavigate,
}: {
  data?: YonetimAnalitik;
  loading: boolean;
  error: string;
  retry: () => void;
  onNavigate: (tab: AdminAnalitikSekme) => void;
}) {
  return (
    <div className="analytics-panel">
      <Status loading={loading} error={error} retry={retry} />
      {data && <AdminAnalyticsOverview data={data} onNavigate={onNavigate} />}
    </div>
  );
}
