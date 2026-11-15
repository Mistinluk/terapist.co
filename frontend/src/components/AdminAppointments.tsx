import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  YonetimRandevuDetay,
  YonetimRandevularYaniti,
  api,
  tarih,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

const statusLabels: Record<string, string> = {
  tumu: "Tümü",
  bekliyor: "Yanıt bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal edildi",
};

const statusOptions = [
  "tumu",
  "bekliyor",
  "onaylandi",
  "reddedildi",
  "iptal",
] as const;

const slaOptions = [
  { value: 12, label: "12 saat" },
  { value: 24, label: "24 saat" },
  { value: 48, label: "48 saat" },
  { value: 72, label: "72 saat" },
] as const;

const notificationTemplates = [
  {
    label: "Yanıt hatırlatması",
    text: "Danışan randevu talebiniz için yanıt bekliyor. Lütfen müsaitliğinizi onaylayın veya reddedin.",
  },
  {
    label: "Süre aşımı uyarısı",
    text: "Randevu talebinizin yanıt süresi dolmak üzere. Lütfen en kısa sürede işlem yapın.",
  },
] as const;

const auditLabels: Record<string, string> = {
  "randevular.detay": "Yönetici detayı inceledi",
  "randevu.bildirim_gonder": "Terapiste bildirim gönderildi",
  "randevu.yonetim_tamamla": "Yanıtsız işlem yönetici tarafından tamamlandı",
  "randevu.yonetim_onaylandi": "Yönetici durumu Onaylandı yaptı",
  "randevu.yonetim_reddedildi": "Yönetici durumu Reddedildi yaptı",
  "randevu.yonetim_iptal": "Yönetici durumu İptal edildi yaptı",
  "randevu.yonetim_bekliyor": "Yönetici durumu Yanıt bekliyor yaptı",
  "randevu.onaylandi": "Terapist randevuyu onayladı",
  "randevu.reddedildi": "Terapist randevuyu reddetti",
  "randevu.iptal": "Terapist randevuyu iptal etti",
};

function unixFormat(unixSec: number): string {
  return tarih(new Date(unixSec * 1000).toISOString());
}

export function AdminAppointmentsView({
  data,
  loading,
  error,
  retry,
  statusFilter,
  therapistFilter,
  overdueOnly = false,
  slaHours = 24,
  page,
  onStatusChange,
  onTherapistChange,
  onOverdueToggle,
  onSlaHoursChange,
  onPageChange,
  onReload,
}: {
  data?: YonetimRandevularYaniti;
  loading: boolean;
  error: string;
  retry: () => void;
  statusFilter: string;
  therapistFilter: string;
  overdueOnly?: boolean;
  slaHours?: number;
  page: number;
  onStatusChange: (status: string) => void;
  onTherapistChange: (therapistId: string) => void;
  onOverdueToggle?: (next: boolean) => void;
  onSlaHoursChange?: (hours: number) => void;
  onPageChange: (page: number) => void;
  onReload?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<YonetimRandevuDetay | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [notifText, setNotifText] = useState("");
  const [notifType, setNotifType] = useState<"hatirlatma" | "eskalasyon">(
    "hatirlatma",
  );
  const [statusNote, setStatusNote] = useState("");
  const [notifyTherapist, setNotifyTherapist] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");

  async function loadDetail(randevuId: string) {
    setSelectedId(randevuId);
    setDetailLoading(true);
    setDetailError("");
    setActionFeedback("");
    try {
      const payload = await api<YonetimRandevuDetay>(
        `/yonetim/randevular/${randevuId}?yanit_suresi_saat=${slaHours}`,
      );
      setDetail(payload);
      setNotifType(payload.yanit_gecikti ? "eskalasyon" : "hatirlatma");
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function sendNotification(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || notifText.trim().length < 5) return;
    setActionBusy(true);
    setDetailError("");
    setActionFeedback("");
    try {
      await api(`/yonetim/randevular/${selectedId}/bildirim`, {
        method: "POST",
        body: JSON.stringify({
          mesaj: notifText.trim(),
          tur: notifType,
        }),
      });
      setNotifText("");
      setActionFeedback("Terapiste bildirim gönderildi.");
      await loadDetail(selectedId);
      onReload?.();
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function updateBookingStatus(
    nextStatus: "bekliyor" | "onaylandi" | "reddedildi" | "iptal",
    escalated: boolean,
  ) {
    if (!selectedId) return;
    setActionBusy(true);
    setDetailError("");
    setActionFeedback("");
    try {
      await api(`/yonetim/randevular/${selectedId}/durum`, {
        method: "PATCH",
        body: JSON.stringify({
          durum: nextStatus,
          not_metni: statusNote.trim(),
          eskalasyon_tamamla: escalated,
          terapiste_bildir: notifyTherapist,
        }),
      });
      setStatusNote("");
      setActionFeedback(
        escalated
          ? `Yanıtsız randevu işlemi "${statusLabels[nextStatus]}" olarak tamamlandı.`
          : `Randevu durumu "${statusLabels[nextStatus]}" olarak güncellendi.`,
      );
      await loadDetail(selectedId);
      onReload?.();
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="admin-section-stack">
      <div className="admin-kvkk-note" role="note">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          KVKK koruması: Danışan adları ve telefon numaraları şifreli tutulur ve
          listede çözülmez. Yönetici olarak operasyonel detayları inceleyebilir,
          terapiste bildirim gönderebilir ve yanıt süresi dolan randevuların
          durumunu tamamlayabilirsiniz.
        </span>
      </div>

      {data && (
        <div className="admin-kpi-strip" aria-label="Randevu özeti">
          <div>
            <span>Toplam talep</span>
            <strong>{data.ozet.toplam}</strong>
          </div>
          <div>
            <span>Bekleyen</span>
            <strong>{data.ozet.bekliyor}</strong>
          </div>
          <div>
            <span>Yanıt süresi dolan</span>
            <strong>{data.ozet.gecikmis_bekleyen ?? 0}</strong>
          </div>
          <div>
            <span>Onaylanan</span>
            <strong>{data.ozet.onaylandi}</strong>
          </div>
          <div>
            <span>Yaklaşan aktif</span>
            <strong>{data.ozet.gelecek_aktif}</strong>
          </div>
        </div>
      )}

      <div className="admin-filter-toolbar">
        <div
          className="admin-filter-pills"
          role="group"
          aria-label="Durum filtresi"
        >
          {statusOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`admin-pill-btn ${!overdueOnly && statusFilter === option ? "is-active" : ""}`}
              onClick={() => {
                onOverdueToggle?.(false);
                onStatusChange(option);
              }}
            >
              {statusLabels[option]}
            </button>
          ))}
          {onOverdueToggle && (
            <button
              type="button"
              className={`admin-pill-btn ${overdueOnly ? "is-active" : ""}`}
              onClick={() => onOverdueToggle(!overdueOnly)}
            >
              <Clock size={14} aria-hidden="true" />
              <span>
                Yanıt süresi dolanlar ({data?.ozet.gecikmis_bekleyen ?? 0})
              </span>
            </button>
          )}
        </div>

        <div className="admin-appointment-filters">
          {onSlaHoursChange && (
            <label className="admin-select-filter">
              <span>Yanıt süresi eşiği</span>
              <select
                value={slaHours}
                onChange={(event) =>
                  onSlaHoursChange(Number(event.target.value))
                }
              >
                {slaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="admin-select-filter">
            <span>Uzman filtresi</span>
            <select
              value={therapistFilter}
              onChange={(event) => onTherapistChange(event.target.value)}
            >
              <option value="">Tüm terapistler</option>
              {data?.uzmanlar_filtre.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.ad} ({therapist.sehir})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Status loading={loading} error={error} retry={retry} />

      {selectedId && (
        <section
          className="admin-panel-card admin-appointment-detail"
          aria-label="Randevu detayı ve yönetici işlemleri"
        >
          <div className="admin-card-header">
            <div>
              <span className="eyebrow">RANDEVU DETAYI &amp; MÜDAHALE</span>
              <h3>
                {detail
                  ? `${detail.uzman.ad} · ${unixFormat(detail.baslangic)}`
                  : "Randevu detayları yükleniyor"}
              </h3>
            </div>
            <button
              type="button"
              className="button secondary admin-compact-btn"
              onClick={() => {
                setSelectedId(null);
                setDetail(null);
              }}
            >
              <X size={15} aria-hidden="true" />
              <span>Kapat</span>
            </button>
          </div>

          {detailLoading && (
            <p className="muted">Randevu detayları getiriliyor...</p>
          )}
          {detailError && (
            <p className="error" role="alert">
              {detailError}
            </p>
          )}
          {actionFeedback && (
            <p className="notice" role="status">
              <CheckCircle2 size={16} aria-hidden="true" /> {actionFeedback}
            </p>
          )}

          {detail && (
            <div className="admin-detail-grid">
              <div className="admin-detail-summary">
                <dl className="admin-detail-dl">
                  <div>
                    <dt>Durum</dt>
                    <dd>
                      <span className={`status-badge ${detail.durum}`}>
                        {statusLabels[detail.durum] ?? detail.durum}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Seans Zamanı</dt>
                    <dd>{unixFormat(detail.baslangic)}</dd>
                  </div>
                  <div>
                    <dt>Talep Tarihi</dt>
                    <dd>{unixFormat(detail.olusturma)}</dd>
                  </div>
                  <div>
                    <dt>Yanıt Bekleme</dt>
                    <dd>
                      {detail.durum === "bekliyor"
                        ? `${detail.bekleme_suresi_saat} saat (Eşik: ${detail.yanit_suresi_saat} saat)`
                        : "Yanıtlandı / Kapandı"}
                    </dd>
                  </div>
                  <div>
                    <dt>Uzman İletişim</dt>
                    <dd>
                      {detail.uzman.eposta || "E-posta yok"} ·{" "}
                      {detail.uzman.sehir || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Danışan (Maskeli)</dt>
                    <dd>
                      {detail.danisan_maskeli.ad} ·{" "}
                      {detail.danisan_maskeli.telefon}
                    </dd>
                  </div>
                </dl>

                {detail.yanit_gecikti && detail.durum === "bekliyor" && (
                  <div className="admin-escalation-banner" role="alert">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div>
                      <strong>
                        Terapist {detail.bekleme_suresi_saat} saattir yanıt
                        vermedi
                      </strong>
                      <p>
                        Belirlenen {detail.yanit_suresi_saat} saatlik yanıt
                        süresi aşıldı. Yönetici olarak terapist adına randevu
                        işlemini aşağıdan tamamlayabilirsiniz.
                      </p>
                    </div>
                  </div>
                )}

                <div className="admin-status-control-box">
                  <h4>
                    {detail.yanit_gecikti && detail.durum === "bekliyor"
                      ? "Süre dolan işlemi terapist adına tamamla"
                      : "Randevu durumunu değiştir"}
                  </h4>
                  <label className="field">
                    <span>İşlem notu (isteğe bağlı)</span>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Örn. 24 saat yanıt gelmediği için yönetici tarafından tamamlandı"
                      maxLength={500}
                    />
                  </label>
                  <label className="analytics-switch-row">
                    <input
                      type="checkbox"
                      checked={notifyTherapist}
                      onChange={(e) => setNotifyTherapist(e.target.checked)}
                    />
                    <span>Terapiste durum değişikliği bildirimi bırak</span>
                  </label>
                  <div className="actions">
                    {detail.durum !== "onaylandi" && (
                      <button
                        type="button"
                        className="button"
                        disabled={actionBusy}
                        onClick={() =>
                          updateBookingStatus(
                            "onaylandi",
                            detail.yanit_gecikti && detail.durum === "bekliyor",
                          )
                        }
                      >
                        {detail.yanit_gecikti && detail.durum === "bekliyor"
                          ? "Terapist yerine onayla"
                          : "Onayla"}
                      </button>
                    )}
                    {detail.durum !== "reddedildi" && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={actionBusy}
                        onClick={() =>
                          updateBookingStatus(
                            "reddedildi",
                            detail.yanit_gecikti && detail.durum === "bekliyor",
                          )
                        }
                      >
                        {detail.yanit_gecikti && detail.durum === "bekliyor"
                          ? "Terapist yerine reddet"
                          : "Reddet"}
                      </button>
                    )}
                    {detail.durum !== "iptal" && (
                      <button
                        type="button"
                        className="button danger"
                        disabled={actionBusy}
                        onClick={() =>
                          updateBookingStatus(
                            "iptal",
                            detail.yanit_gecikti && detail.durum === "bekliyor",
                          )
                        }
                      >
                        İptal et
                      </button>
                    )}
                    {detail.durum !== "bekliyor" && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={actionBusy}
                        onClick={() => updateBookingStatus("bekliyor", false)}
                      >
                        Yanıt bekliyor&apos;a al
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-detail-comms">
                <form className="admin-notify-form" onSubmit={sendNotification}>
                  <h4>
                    <Bell size={16} aria-hidden="true" /> Terapiste Bildirim
                    Gönder
                  </h4>
                  <div className="admin-template-chips">
                    {notificationTemplates.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        className="admin-pill-btn"
                        onClick={() => setNotifText(tpl.text)}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>Bildirim türü</span>
                    <select
                      value={notifType}
                      onChange={(e) =>
                        setNotifType(
                          e.target.value as "hatirlatma" | "eskalasyon",
                        )
                      }
                    >
                      <option value="hatirlatma">Yanıt hatırlatması</option>
                      <option value="eskalasyon">
                        Acil / Süre aşımı uyarısı
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Mesaj</span>
                    <textarea
                      rows={3}
                      value={notifText}
                      onChange={(e) => setNotifText(e.target.value)}
                      placeholder="Terapistin panelinde göreceği mesajı yazın..."
                      maxLength={500}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    className="button"
                    disabled={actionBusy || notifText.trim().length < 5}
                  >
                    <Send size={15} aria-hidden="true" />
                    <span>Terapiste bildirim gönder</span>
                  </button>
                </form>

                <div className="admin-notif-history">
                  <h4>Bildirim geçmişi ({detail.bildirimler.length})</h4>
                  {detail.bildirimler.length === 0 ? (
                    <p className="muted">Henüz bildirim gönderilmemiş.</p>
                  ) : (
                    <ul className="admin-history-list">
                      {detail.bildirimler.map((item) => (
                        <li key={item.id}>
                          <div>
                            <strong>{item.mesaj}</strong>
                            <span>
                              {unixFormat(item.olusturma)} ·{" "}
                              {item.okundu ? "Terapist okudu" : "Okunmadı"}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {detail.islem_gecmisi.length > 0 && (
                  <div className="admin-notif-history">
                    <h4>Denetim geçmişi</h4>
                    <ul className="admin-history-list">
                      {detail.islem_gecmisi.map((log) => (
                        <li key={log.id}>
                          <div>
                            <strong>
                              {auditLabels[log.islem] ?? log.islem}
                            </strong>
                            <span>{unixFormat(log.zaman)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {data && data.kayitlar.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={32} aria-hidden="true" />
          <h3>Seçili filtrede randevu bulunamadı</h3>
          <p>Durum veya uzman filtresini genişleterek yeniden deneyin.</p>
        </div>
      ) : (
        data && (
          <>
            <div className="admin-panel-card">
              <div className="admin-card-header">
                <div>
                  <span className="eyebrow">ANONİM RANDEVU AKIŞI</span>
                  <h3>Toplam {data.toplam_kayit} kayıt listeleniyor</h3>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Seans Zamanı</th>
                      <th>Uzman</th>
                      <th>Şehir</th>
                      <th>Durum</th>
                      <th>Bildirim</th>
                      <th>Talep Tarihi</th>
                      <th>Aydınlatma</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kayitlar.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.yanit_gecikti ? "is-overdue-row" : undefined
                        }
                      >
                        <td>
                          <strong>{unixFormat(row.baslangic)}</strong>
                        </td>
                        <td>
                          {row.uzman.kullanici_adi ? (
                            <Link to={`/${row.uzman.kullanici_adi}`}>
                              {row.uzman.ad}
                            </Link>
                          ) : (
                            row.uzman.ad
                          )}
                        </td>
                        <td>{row.uzman.sehir || "—"}</td>
                        <td>
                          <div className="admin-status-cell">
                            <span className={`status-badge ${row.durum}`}>
                              {statusLabels[row.durum] ?? row.durum}
                            </span>
                            {row.yanit_gecikti && row.durum === "bekliyor" && (
                              <span className="admin-overdue-chip">
                                <Clock size={12} aria-hidden="true" />
                                {row.bekleme_suresi_saat ?? 0} saattir yanıt yok
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {(row.bildirim_sayisi ?? 0) > 0 ? (
                            <span className="admin-notif-chip">
                              <Bell size={12} aria-hidden="true" />
                              {row.bildirim_sayisi} bildirim
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>{unixFormat(row.olusturma)}</td>
                        <td>
                          <code>{row.aydinlatma_surumu}</code>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button secondary admin-compact-btn"
                            onClick={() => void loadDetail(row.id)}
                          >
                            Detay &amp; İşlem
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <nav className="pagination" aria-label="Randevu sayfaları">
              <button
                className="button secondary"
                type="button"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
              >
                Önceki
              </button>
              <span>
                {page}. sayfa · toplam {data.toplam_kayit} kayıt
              </span>
              <button
                className="button secondary"
                type="button"
                disabled={page * 50 >= data.toplam_kayit}
                onClick={() => onPageChange(page + 1)}
              >
                Sonraki
              </button>
            </nav>
          </>
        )
      )}
    </div>
  );
}

export function AdminAppointments() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("tumu");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [slaHours, setSlaHours] = useState(24);
  const params = new URLSearchParams({
    sayfa: String(page),
    durum: statusFilter,
    yanit_suresi_saat: String(slaHours),
  });
  if (overdueOnly) params.set("gecikmis", "true");
  if (therapistFilter) params.set("uzman_id", therapistFilter);

  const query = useApi<YonetimRandevularYaniti>(
    `/yonetim/randevular?${params.toString()}`,
  );

  return (
    <AdminAppointmentsView
      data={query.data}
      loading={query.loading}
      error={query.error}
      retry={query.reload}
      statusFilter={statusFilter}
      therapistFilter={therapistFilter}
      overdueOnly={overdueOnly}
      slaHours={slaHours}
      page={page}
      onStatusChange={(nextStatus) => {
        setStatusFilter(nextStatus);
        setPage(1);
      }}
      onTherapistChange={(nextTherapist) => {
        setTherapistFilter(nextTherapist);
        setPage(1);
      }}
      onOverdueToggle={(nextOverdue) => {
        setOverdueOnly(nextOverdue);
        setPage(1);
      }}
      onSlaHoursChange={(hours) => {
        setSlaHours(hours);
        setPage(1);
      }}
      onPageChange={setPage}
      onReload={query.reload}
    />
  );
}
