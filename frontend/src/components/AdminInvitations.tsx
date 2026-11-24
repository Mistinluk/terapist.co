import { useState } from "react";
import { XCircle } from "lucide-react";
import { api, tarih, YonetimReferansYaniti } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

const invitationStatusLabels: Record<string, string> = {
  pending: "Kabul bekliyor",
  accepted: "Kabul edildi",
  expired: "Süresi doldu",
  revoked: "İptal edildi",
};

export function AdminInvitationsView({
  data,
  loading,
  error,
  retry,
  search,
  busy,
  message,
  onSearchChange,
  onRevokeInvite,
}: {
  data?: YonetimReferansYaniti;
  loading: boolean;
  error: string;
  retry: () => void;
  search: string;
  busy: string;
  message: string;
  onSearchChange: (val: string) => void;
  onRevokeInvite: (id: string, targetLabel: string) => Promise<void>;
}) {
  const term = search.trim().toLocaleLowerCase("tr");
  const quotas = (data?.davet_ozetleri ?? []).filter(
    (item) =>
      !term ||
      item.ad.toLocaleLowerCase("tr").includes(term) ||
      item.kabul_edenler.some((k) =>
        k.ad.toLocaleLowerCase("tr").includes(term),
      ),
  );
  const invites = (data?.davetler ?? []).filter(
    (inv) =>
      !term ||
      inv.davet_eden.ad.toLocaleLowerCase("tr").includes(term) ||
      inv.davet_edilen.ad.toLocaleLowerCase("tr").includes(term) ||
      inv.davet_edilen.email.toLocaleLowerCase("tr").includes(term),
  );

  return (
    <div className="admin-section-stack">
      <Status loading={loading} error={error} retry={retry} />

      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      {data && (
        <>
          <div className="admin-kpi-strip" aria-label="Davet ve öneri özeti">
            <div>
              <span>Toplam davet</span>
              <strong>{data.ozet.toplam_davet}</strong>
            </div>
            <div>
              <span>Kabul edilen</span>
              <strong>{data.ozet.kabul_edilen_davet}</strong>
            </div>
            <div>
              <span>Bekleyen</span>
              <strong>{data.ozet.bekleyen_davet}</strong>
            </div>
            <div>
              <span>Süresi dolan / iptal</span>
              <strong>
                {data.ozet.suresi_dolan_davet + data.ozet.iptal_davet}
              </strong>
            </div>
            <div>
              <span>Meslektaş önerisi</span>
              <strong>{data.ozet.toplam_oneri}</strong>
            </div>
          </div>

          <div className="admin-filter-toolbar">
            <label className="admin-inline-search">
              <span className="sr-only">Davetlerde ara</span>
              <input
                type="search"
                placeholder="Davet edenin veya davet edilenin adı ya da e-postasıyla ara…"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
          </div>

          <section
            className="admin-panel-card"
            aria-labelledby="admin-invite-quotas-title"
          >
            <div className="admin-card-header">
              <div>
                <span className="eyebrow">DAVET KOTALARI VE DÖNÜŞÜM</span>
                <h3 id="admin-invite-quotas-title">
                  Uzman bazlı davet performansı
                </h3>
              </div>
              <strong>{quotas.length} uzman</strong>
            </div>
            {quotas.length === 0 ? (
              <p className="empty-state">Henüz davet gönderen uzman yok.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Davet eden uzman</th>
                      <th>Gönderilen</th>
                      <th>Kabul edilen</th>
                      <th>Bekleyen</th>
                      <th>Kota / kalan hak</th>
                      <th>Platforma kazandırılan uzmanlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotas.map((item) => (
                      <tr key={item.uzman_id}>
                        <td>
                          <strong>{item.ad}</strong>
                        </td>
                        <td>{item.toplam_gonderilen}</td>
                        <td>{item.kabul_edilen}</td>
                        <td>{item.bekleyen}</td>
                        <td>
                          {item.davet_limiti} limit ·{" "}
                          <strong>{item.kalan_hak} kalan</strong>
                        </td>
                        <td>
                          {item.kabul_edenler.length === 0 ? (
                            <span className="muted">—</span>
                          ) : (
                            <div className="admin-pill-row">
                              {item.kabul_edenler.map((acc) => (
                                <span
                                  className="admin-target-chip"
                                  key={acc.id}
                                >
                                  {acc.ad}
                                </span>
                              ))}
                            </div>
                          )}
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
            aria-labelledby="admin-invites-list-title"
          >
            <div className="admin-card-header">
              <div>
                <span className="eyebrow">KATILIM KAYNAĞI</span>
                <h3 id="admin-invites-list-title">Referanslı davetler</h3>
              </div>
              <strong>{invites.length}</strong>
            </div>
            {invites.length === 0 ? (
              <p className="empty-state">Henüz davet oluşturulmadı.</p>
            ) : (
              <div className="admin-reference-list">
                {invites.map((invitation) => {
                  const targetLabel =
                    invitation.davet_edilen.ad || invitation.davet_edilen.email;
                  return (
                    <article key={invitation.id}>
                      <div>
                        <h3>
                          {invitation.davet_eden.ad} → {targetLabel}
                        </h3>
                        <p>{invitation.davet_edilen.email}</p>
                        <p>
                          {invitation.uzmanlik
                            ? `Önerilen alan: ${invitation.uzmanlik}`
                            : "Genel katılım daveti"}
                        </p>
                      </div>
                      <div className="admin-reference-meta">
                        <span
                          className={`status-badge ${
                            invitation.durum === "accepted"
                              ? "onaylandi"
                              : invitation.durum === "pending"
                                ? "bekliyor"
                                : "reddedildi"
                          }`}
                        >
                          {invitationStatusLabels[invitation.durum] ??
                            invitation.durum}
                        </span>
                        <time
                          dateTime={new Date(
                            invitation.olusturma * 1000,
                          ).toISOString()}
                        >
                          {tarih(
                            new Date(invitation.olusturma * 1000).toISOString(),
                          )}
                        </time>
                        {invitation.durum === "pending" && (
                          <button
                            className="button secondary admin-compact-btn"
                            type="button"
                            disabled={busy === invitation.id}
                            onClick={() =>
                              onRevokeInvite(invitation.id, targetLabel)
                            }
                          >
                            <XCircle size={14} aria-hidden="true" />
                            {busy === invitation.id
                              ? "İptal ediliyor…"
                              : "Daveti iptal et"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="admin-panel-card"
            aria-labelledby="admin-recommendations-list-title"
          >
            <div className="admin-card-header">
              <div>
                <span className="eyebrow">MESLEKİ ÖNERİLER</span>
                <h3 id="admin-recommendations-list-title">
                  Terapist önerileri
                </h3>
              </div>
              <strong>{data.oneriler.length}</strong>
            </div>
            {data.oneriler.length === 0 ? (
              <p className="empty-state">Henüz öneri kaydı bulunmuyor.</p>
            ) : (
              <div className="admin-reference-list">
                {data.oneriler.map((recommendation) => (
                  <article
                    key={`${recommendation.veren.id}-${recommendation.onerilen.id}`}
                  >
                    <div>
                      <h3>
                        {recommendation.veren.ad} → {recommendation.onerilen.ad}
                      </h3>
                      <p>Önerilen alan: {recommendation.uzmanlik}</p>
                    </div>
                    <time
                      dateTime={new Date(
                        recommendation.olusturma * 1000,
                      ).toISOString()}
                    >
                      {tarih(
                        new Date(recommendation.olusturma * 1000).toISOString(),
                      )}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function AdminInvitations({ onChanged }: { onChanged?: () => void }) {
  const references = useApi<YonetimReferansYaniti>("/yonetim/referanslar");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function revokeInvite(id: string, targetLabel: string) {
    if (
      !window.confirm(
        `${targetLabel} için bekleyen davet iptal edilsin mi? Uzmanın davet hakkı iade edilir.`,
      )
    ) {
      return;
    }
    setBusy(id);
    setMessage("");
    try {
      await api(`/yonetim/davetler/${id}`, { method: "DELETE" });
      references.reload();
      onChanged?.();
      setMessage("Bekleyen davet iptal edildi.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <AdminInvitationsView
      data={references.data}
      loading={references.loading}
      error={references.error}
      retry={references.reload}
      search={search}
      busy={busy}
      message={message}
      onSearchChange={setSearch}
      onRevokeInvite={revokeInvite}
    />
  );
}
