import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  ChevronRight,
  Link2,
  Lock,
  Palette,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, Profil, ProfilGirdi, YonetimUzmanDetayi } from "../lib/api";
import { useApi } from "../lib/useApi";
import { ProfileForm } from "./ProfileForm";
import { Status } from "./Status";
import {
  BUTTON_STYLES,
  DESIGN_STYLES,
  FONT_PAIRINGS,
  SURFACE_STYLES,
  THEME_PRESETS,
} from "./ThemeCustomizer";

const verificationLabels: Record<string, string> = {
  verified: "Doğrulandı",
  pending: "İnceleme bekliyor",
  rejected: "Reddedildi",
};

export function AdminTherapistInspectorView({
  profile,
  detail,
  loading,
  error,
  retry,
  inviteLimit,
  busy,
  busyAction,
  message,
  onInviteLimitChange,
  onSaveInviteLimit,
  onToggleFounding,
  onToggleApproval,
  onToggleThemeEntitlement,
  onSaveProfile,
  onBack,
}: {
  profile: Profil;
  detail?: YonetimUzmanDetayi;
  loading: boolean;
  error: string;
  retry: () => void;
  inviteLimit: string;
  busy: string;
  busyAction: string;
  message: string;
  onInviteLimitChange: (val: string) => void;
  onSaveInviteLimit: (e: FormEvent) => Promise<void>;
  onToggleFounding: () => Promise<void>;
  onToggleApproval: () => Promise<void>;
  onToggleThemeEntitlement?: (enabled: boolean) => Promise<void>;
  onSaveProfile: (payload: ProfilGirdi) => Promise<void>;
  onBack: () => void;
}) {
  const effectiveLimit =
    inviteLimit !== "" ? inviteLimit : String(detail?.davet_limiti ?? "");

  return (
    <div className="admin-section-stack">
      <div className="admin-inspector-topbar">
        <button className="button secondary" type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Uzman listesine dön
        </button>

        <div className="admin-inspector-actions">
          {profile.onayli && (
            <Link className="button secondary" to={`/${profile.kullanici_adi}`}>
              Açık profili görüntüle
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          )}
          <button
            className="button"
            type="button"
            disabled={busyAction === profile.id}
            onClick={onToggleApproval}
          >
            {profile.onayli ? "Yayından kaldır" : "Onayla ve yayımla"}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      <Status loading={loading} error={error} retry={retry} />

      {detail && (
        <>
          <div className="admin-inspector-grid">
            <article className="admin-panel-card">
              <div className="analytics-metric-heading">
                <Award size={18} aria-hidden="true" />
                <h3>Doğrulama ve kurucu üyelik</h3>
              </div>
              <p className="admin-detail-main">
                {verificationLabels[detail.dogrulama_durumu]}
              </p>
              <p className="muted">
                {detail.kurucu_no !== null
                  ? `Kurucu terapist #${String(detail.kurucu_no).padStart(4, "0")}`
                  : "Kurucu programına henüz dâhil değil"}
              </p>
              {(detail.kurucu_no !== null || profile.onayli) && (
                <button
                  className={`button admin-compact-btn admin-inline-mt ${
                    detail.kurucu_no !== null ? "danger" : "secondary"
                  }`}
                  type="button"
                  disabled={busy === "founding"}
                  onClick={onToggleFounding}
                >
                  {busy === "founding"
                    ? "Güncelleniyor…"
                    : detail.kurucu_no !== null
                      ? "Kurucu programından çıkar"
                      : "Kurucu programına ekle"}
                </button>
              )}
            </article>

            <article className="admin-panel-card">
              <div className="analytics-metric-heading">
                <CalendarDays size={18} aria-hidden="true" />
                <h3>Takvim ve randevular</h3>
              </div>
              <p className="admin-detail-main">
                {detail.takvim.bagli
                  ? detail.takvim.durum === "aktif"
                    ? "Google Takvim aktif"
                    : "Takvim bağlantısı kopuk"
                  : "Takvim bağlı değil"}
              </p>
              <p className="muted">
                {detail.takvim.webhook_kanal_sayisi} webhook kanalı ·{" "}
                {detail.randevu_ozeti.toplam} randevu (
                {detail.randevu_ozeti.bekliyor} bekliyor)
              </p>
              {detail.bekleme_ozeti && (
                <p className="muted small admin-waitlist-counts">
                  Bekleme listesi: {detail.bekleme_ozeti.bekliyor} bekliyor ·{" "}
                  {detail.bekleme_ozeti.iletisime_gecildi} dönüş yapıldı (
                  {detail.bekleme_ozeti.toplam} toplam)
                </p>
              )}
            </article>

            {detail.tema && (
              <article className="admin-panel-card">
                <div className="analytics-metric-heading">
                  <Palette size={18} aria-hidden="true" />
                  <h3>Tema ve marka görünürlüğü</h3>
                </div>
                <p className="admin-detail-main">
                  Tarz:{" "}
                  {DESIGN_STYLES.find(
                    (item) => item.id === detail.tema?.tasarim_tarzi,
                  )?.label ?? "Belirtilmemiş"}{" "}
                  · Renk:{" "}
                  {detail.tema.tema_stili === "ozel"
                    ? "Özel renk"
                    : (THEME_PRESETS.find(
                        (item) => item.id === detail.tema?.tema_stili,
                      )?.label ?? "Belirtilmemiş")}{" "}
                  · Düğme:{" "}
                  {BUTTON_STYLES.find(
                    (item) => item.id === detail.tema?.buton_stili,
                  )?.label ?? "Belirtilmemiş"}
                </p>
                <p className="muted">
                  Yazı tipi:{" "}
                  {FONT_PAIRINGS.find(
                    (item) => item.id === detail.tema?.yazi_tipi,
                  )?.label ?? "Belirtilmemiş"}{" "}
                  · Zemin:{" "}
                  {SURFACE_STYLES.find(
                    (item) => item.id === detail.tema?.yuzey_stili,
                  )?.label ?? "Belirtilmemiş"}{" "}
                  · Renk kodu: <code>{detail.tema.vurgu_rengi}</code> · Marka
                  gizleme:{" "}
                  {detail.tema.marka_gizleme_etkin ? "Aktif" : "Kapalı"} ·
                  Yetki:{" "}
                  {detail.tema.premium_etkin
                    ? detail.tema.ozel_tema_yetkisi
                      ? "Yönetici tarafından tanımlandı"
                      : "Kurucu"
                    : "Standart"}
                </p>
                {onToggleThemeEntitlement && (
                  <button
                    className={`button admin-compact-btn admin-inline-mt ${
                      detail.tema.ozel_tema_yetkisi ? "danger" : "secondary"
                    }`}
                    type="button"
                    disabled={busy === "theme"}
                    onClick={() =>
                      void onToggleThemeEntitlement(
                        !detail.tema?.ozel_tema_yetkisi,
                      )
                    }
                  >
                    {busy === "theme"
                      ? "Güncelleniyor…"
                      : detail.tema.ozel_tema_yetkisi
                        ? "Özel tema yetkisini kaldır"
                        : "Özel tema ve marka gizleme yetkisi ver"}
                  </button>
                )}
              </article>
            )}

            <article className="admin-panel-card">
              <div className="analytics-metric-heading">
                <ShieldCheck size={18} aria-hidden="true" />
                <h3>Rozet ve kaynaklar</h3>
              </div>
              <p className="admin-detail-main">
                {detail.rozet.aktif ? "Rozet aktif" : "Rozet yok"} ·{" "}
                {detail.kaynaklar.length} kaynak
              </p>
              <p className="muted">
                Rozet: {detail.rozet.tiklama_sayisi} tıklama · Yönlendirme:{" "}
                {detail.yonlendirme_ozeti.olusturulan_link} bağlantı /{" "}
                {detail.yonlendirme_ozeti.alinan_yonlendirme} alınan
              </p>
            </article>

            <article className="admin-panel-card">
              <div className="analytics-metric-heading">
                <UsersRound size={18} aria-hidden="true" />
                <h3>Mesleki ağ</h3>
              </div>
              <p className="admin-detail-main">
                {detail.ag.baglanti_sayisi} bağlantı
              </p>
              <p className="muted">
                {detail.ag.uzmanlik_iliskisi_sayisi} uzmanlık sinyali ·{" "}
                {detail.ag.tavsiye_verilen} öneri verdi /{" "}
                {detail.ag.tavsiye_alinan} aldı
              </p>
            </article>
          </div>

          <div className="admin-stats-columns">
            <section className="admin-panel-card">
              <span className="eyebrow">DAVET KOTASI</span>
              <h3>Uzman davet limiti</h3>
              <p className="muted">
                Gönderilen: {detail.davet_ozeti.gonderilen} · Kabul:{" "}
                {detail.davet_ozeti.kabul_edilen} · Bekleyen:{" "}
                {detail.davet_ozeti.bekleyen}
              </p>
              <form className="admin-limit-form" onSubmit={onSaveInviteLimit}>
                <label className="field">
                  Toplam davet hakkı (0–100)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={effectiveLimit}
                    onChange={(event) =>
                      onInviteLimitChange(event.target.value)
                    }
                    required
                  />
                </label>
                <button
                  className="button"
                  type="submit"
                  disabled={busy === "limit"}
                >
                  {busy === "limit" ? "Kaydediliyor…" : "Limiti kaydet"}
                </button>
              </form>
            </section>

            <section className="admin-panel-card">
              <span className="eyebrow">PROFİL GÖRÜNÜRLÜĞÜ VE KAYNAKLAR</span>
              <h3>Gizlilik tercihleri ve bağlantılar</h3>
              <div className="admin-pill-row">
                <span className="status-badge">
                  Davet eden:{" "}
                  {detail.gizlilik.davet_edeni_goster ? "Açık" : "Gizli"}
                </span>
                <span className="status-badge">
                  Mesleki ağ:{" "}
                  {detail.gizlilik.mesleki_agi_goster ? "Açık" : "Gizli"}
                </span>
                <span className="status-badge">
                  Uzmanlık sinyali:{" "}
                  {detail.gizlilik.uzmanlik_iliskilerini_goster
                    ? "Açık"
                    : "Gizli"}
                </span>
                <span className="status-badge">
                  Tavsiyeler:{" "}
                  {detail.gizlilik.tavsiyeleri_goster ? "Açık" : "Gizli"}
                </span>
                <span className="status-badge">
                  Yönlendirme ağı:{" "}
                  {detail.gizlilik.yonlendirme_agini_goster ? "Açık" : "Gizli"}
                </span>
                <span className="status-badge">
                  Kurucu rozeti:{" "}
                  {detail.gizlilik.kurucu_durumunu_goster ? "Açık" : "Gizli"}
                </span>
              </div>
              {detail.kaynaklar.length > 0 && (
                <ul className="admin-resource-summary">
                  {detail.kaynaklar.map((res) => (
                    <li key={res.id}>
                      <Link2 size={14} aria-hidden="true" />
                      {res.url ? (
                        <a href={res.url} target="_blank" rel="noreferrer">
                          {res.baslik}
                        </a>
                      ) : (
                        <span>{res.baslik}</span>
                      )}
                      <span className="admin-resource-badges">
                        {res.vurgulu && (
                          <em className="admin-mini-pill">Vurgulu</em>
                        )}
                        {res.kilitli && (
                          <em className="admin-mini-pill">
                            <Lock size={11} aria-hidden="true" /> Şifreli
                          </em>
                        )}
                        {res.medya_turu && res.medya_turu !== "none" && (
                          <em className="admin-mini-pill">
                            {res.medya_turu === "spotify"
                              ? "Spotify"
                              : "YouTube"}
                          </em>
                        )}
                        {res.zaman_durumu && res.zaman_durumu !== "aktif" && (
                          <em className="admin-mini-pill">
                            {res.zaman_durumu === "planli"
                              ? "Planlı"
                              : "Süresi doldu"}
                          </em>
                        )}
                      </span>
                      <span>{res.tiklama_sayisi} tıklama</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <ProfileForm
        profile={profile}
        onSubmit={onSaveProfile}
        label="Uzman profilini kaydet"
      />
    </div>
  );
}

export function AdminTherapistInspector({
  profile,
  onBack,
  onSaved,
  onProfileUpdated,
  onToggleApproval,
  busyAction,
}: {
  profile: Profil;
  onBack: () => void;
  onSaved: () => void;
  onProfileUpdated: (updated: Profil) => void;
  onToggleApproval: (profile: Profil) => Promise<void>;
  busyAction: string;
}) {
  const detail = useApi<YonetimUzmanDetayi>(
    `/yonetim/uzmanlar/${profile.id}/ozet`,
  );
  const [inviteLimit, setInviteLimit] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function saveInviteLimit(event: FormEvent) {
    event.preventDefault();
    const numeric = Number(
      inviteLimit !== "" ? inviteLimit : (detail.data?.davet_limiti ?? 3),
    );
    setBusy("limit");
    setMessage("");
    try {
      await api(`/yonetim/uzmanlar/${profile.id}/davet-limiti`, {
        method: "PATCH",
        body: JSON.stringify({ davet_limiti: numeric }),
      });
      detail.reload();
      onSaved();
      setMessage(`Davet limiti ${numeric} olarak güncellendi.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function toggleFounding() {
    const isFounding = detail.data?.kurucu_no !== null;
    if (
      isFounding &&
      !window.confirm(`${profile.ad} kurucu programından çıkarılsın mı?`)
    ) {
      return;
    }
    setBusy("founding");
    setMessage("");
    try {
      if (isFounding) {
        await api(`/yonetim/kurucu-programi/uyeler/${profile.id}`, {
          method: "DELETE",
        });
        onProfileUpdated({ ...profile, kurucu_no: null });
        setMessage(`${profile.ad} kurucu programından çıkarıldı.`);
      } else {
        const result = await api<{ eklenen: { kurucu_no: number } }>(
          "/yonetim/kurucu-programi/uyeler",
          {
            method: "POST",
            body: JSON.stringify({ uzman_id: profile.id }),
          },
        );
        onProfileUpdated({ ...profile, kurucu_no: result.eklenen.kurucu_no });
        setMessage(
          `${profile.ad} #${String(result.eklenen.kurucu_no).padStart(4, "0")} numarasıyla kurucu programına eklendi.`,
        );
      }
      detail.reload();
      onSaved();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function saveProfile(payload: ProfilGirdi) {
    const updated = await api<Profil>(`/yonetim/uzmanlar/${profile.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    detail.reload();
    onProfileUpdated(updated);
    onSaved();
  }

  async function toggleThemeEntitlement(enabled: boolean) {
    setBusy("theme");
    setMessage("");
    try {
      await api(`/yonetim/uzmanlar/${profile.id}/tema-yetkisi`, {
        method: "PATCH",
        body: JSON.stringify({ ozel_tema_yetkisi: enabled }),
      });
      detail.reload();
      onSaved();
      setMessage(
        enabled
          ? `${profile.ad} için Özel Tema ve marka görünürlüğü yetkisi verildi.`
          : `${profile.ad} için Özel Tema ve marka görünürlüğü yetkisi kaldırıldı.`,
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <AdminTherapistInspectorView
      profile={profile}
      detail={detail.data}
      loading={detail.loading}
      error={detail.error}
      retry={detail.reload}
      inviteLimit={inviteLimit}
      busy={busy}
      busyAction={busyAction}
      message={message}
      onInviteLimitChange={setInviteLimit}
      onSaveInviteLimit={saveInviteLimit}
      onToggleFounding={toggleFounding}
      onToggleApproval={async () => {
        await onToggleApproval(profile);
        detail.reload();
      }}
      onToggleThemeEntitlement={toggleThemeEntitlement}
      onSaveProfile={saveProfile}
      onBack={onBack}
    />
  );
}
