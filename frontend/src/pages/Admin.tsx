import { useState } from "react";
import { api, Profil, tarih } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import { ProfileForm } from "../components/ProfileForm";

type Audit = {
  id: string;
  zaman: number;
  islem: string;
  kullanici_id: string;
  kaynak_id: string;
};
export function Admin() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("uzmanlar");
  const profiles = useApi<Profil[]>(`/yonetim/uzmanlar?sayfa=${page}`);
  const summary = useApi<{ uzman: number; bekleyen: number; randevu: number }>(
    "/yonetim/ozet",
  );
  const audit = useApi<Audit[]>(`/yonetim/denetim?sayfa=${page}`);
  const [editing, setEditing] = useState<Profil>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  async function update(p: Profil, archive = false) {
    if (
      archive &&
      !window.confirm(
        `${p.ad} arşivlensin mi? Hesabın erişimi kapatılır; kayıtlar silinmez.`,
      )
    )
      return;
    setBusy(p.id);
    setMessage("");
    try {
      await api(`/yonetim/uzmanlar/${p.id}`, {
        method: archive ? "DELETE" : "PATCH",
        body: JSON.stringify(archive ? {} : { onayli: !p.onayli }),
      });
      profiles.reload();
      summary.reload();
      audit.reload();
      setMessage("İşlem kaydedildi.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="dashboard">
      <div className="page-heading">
        <span className="eyebrow">YÖNETİM ALANI</span>
        <h1>Uzman ağını yönetin.</h1>
        <p className="muted">
          Profil başvurularını inceleyin ve işlem kayıtlarını takip edin.
        </p>
      </div>
      <div className="stats">
        {[
          ["Uzman", summary.data?.uzman],
          ["İnceleme bekleyen", summary.data?.bekleyen],
          ["Toplam randevu", summary.data?.randevu],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <div className="tabs" role="tablist" aria-label="Yönetim bölümleri">
        {[
          ["uzmanlar", "Uzmanlar"],
          ["denetim", "İşlem kayıtları"],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setPage(1);
              setEditing(undefined);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {editing ? (
        <div className="narrow-content">
          <button
            className="button secondary"
            onClick={() => setEditing(undefined)}
          >
            Listeye dön
          </button>
          <ProfileForm
            profile={editing}
            onSubmit={async (p) => {
              await api(`/yonetim/uzmanlar/${editing.id}`, {
                method: "PUT",
                body: JSON.stringify(p),
              });
              setEditing(undefined);
              profiles.reload();
              audit.reload();
            }}
          />
        </div>
      ) : tab === "uzmanlar" ? (
        <>
          <Status
            loading={profiles.loading}
            error={profiles.error}
            retry={profiles.reload}
          />
          {profiles.data?.length === 0 && (
            <p className="empty-state">İncelenecek uzman bulunmuyor.</p>
          )}
          <div className="admin-list">
            {profiles.data?.map((p) => (
              <article className="admin-row" key={p.id}>
                <div>
                  <h2>{p.ad}</h2>
                  <p>
                    {p.sehir} · {p.ilce}
                  </p>
                </div>
                <span
                  className={`status-badge ${p.onayli ? "onaylandi" : "bekliyor"}`}
                >
                  {p.onayli ? "Yayında" : "İnceleme bekliyor"}
                </span>
                <div className="actions">
                  <button
                    className="button"
                    disabled={busy === p.id}
                    onClick={() => update(p)}
                  >
                    {p.onayli ? "Yayından kaldır" : "Onayla"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setEditing(p)}
                  >
                    İncele / düzenle
                  </button>
                  <button
                    className="button danger"
                    disabled={busy === p.id}
                    onClick={() => update(p, true)}
                  >
                    Arşivle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <Status
            loading={audit.loading}
            error={audit.error}
            retry={audit.reload}
          />
          <div className="table-wrap">
            <table>
              <caption>
                Son işlemler · Danışan adları ve iletişim bilgileri kayıtlara
                yazılmaz.
              </caption>
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>İşlem</th>
                  <th>Hesap kimliği</th>
                </tr>
              </thead>
              <tbody>
                {audit.data?.map((row) => (
                  <tr key={row.id}>
                    <td>{tarih(new Date(row.zaman * 1000).toISOString())}</td>
                    <td>{row.islem}</td>
                    <td>
                      <code>{row.kullanici_id || "Ziyaretçi"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!editing && (
        <nav className="pagination" aria-label="Yönetim sayfaları">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Önceki
          </button>
          <span>{page}. sayfa</span>
          <button
            className="button secondary"
            disabled={
              (tab === "uzmanlar"
                ? profiles.data?.length
                : audit.data?.length) !== 50
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </button>
        </nav>
      )}
    </section>
  );
}
