import { useState } from "react";
import { CalendarDays, UserRound } from "lucide-react";
import { api, Profil, Randevu, tarih } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import { ProfileForm } from "../components/ProfileForm";

const statuses: Record<string, string> = {
  bekliyor: "Onay bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal edildi",
};
export function Dashboard() {
  const [tab, setTab] = useState("randevular");
  const [page, setPage] = useState(1);
  const profile = useApi<Profil>("/uzman/profil");
  const bookings = useApi<Randevu[]>(`/uzman/randevular?sayfa=${page}`);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  async function change(id: string, durum: string) {
    if (
      durum === "iptal" &&
      !window.confirm("Bu randevuyu iptal etmek istiyor musunuz?")
    )
      return;
    setBusy(id);
    setMessage("");
    try {
      await api(`/uzman/randevular/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ durum }),
      });
      bookings.reload();
      setMessage("Randevu durumu güncellendi.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="dashboard">
      <div className="page-heading">
        <span className="eyebrow">UZMAN ÇALIŞMA ALANI</span>
        <h1>Gününüzü planlayın.</h1>
        <p className="muted">
          {profile.data?.ad} · Randevu talepleriniz ve profiliniz bir arada.
        </p>
      </div>
      <div className="tabs" role="tablist" aria-label="Çalışma alanı">
        <button
          role="tab"
          aria-selected={tab === "randevular"}
          onClick={() => setTab("randevular")}
        >
          <CalendarDays size={17} />
          Randevularım
        </button>
        <button
          role="tab"
          aria-selected={tab === "profil"}
          onClick={() => setTab("profil")}
        >
          <UserRound size={17} />
          Profilim
        </button>
      </div>
      {profile.data && !profile.data.onayli && (
        <p className="notice">
          Profiliniz inceleme aşamasında. Onaylandıktan sonra uzman dizininde
          görünecektir.
        </p>
      )}
      {tab === "profil" ? (
        <div className="narrow-content">
          <Status
            loading={profile.loading}
            error={profile.error}
            retry={profile.reload}
          />
          {profile.data && (
            <ProfileForm
              profile={profile.data}
              onSubmit={async (p) => {
                await api("/uzman/profil", {
                  method: "PUT",
                  body: JSON.stringify(p),
                });
                profile.reload();
              }}
            />
          )}
        </div>
      ) : (
        <>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <Status
            loading={bookings.loading}
            error={bookings.error}
            retry={bookings.reload}
          />
          {bookings.data?.length === 0 && (
            <div className="empty-state">
              <CalendarDays size={34} />
              <h2>Henüz randevu talebi yok</h2>
              <p>Profilinizden gönderilen talepler burada görünecek.</p>
            </div>
          )}
          <div className="appointments">
            {bookings.data?.map((b) => (
              <article key={b.id} className="appointment">
                <div className="appointment-date">
                  <CalendarDays size={19} />
                  <strong>{tarih(b.baslangic)}</strong>
                </div>
                <div>
                  <h2>{b.ad}</h2>
                  <a href={`tel:${b.telefon.replace(/[^+0-9]/g, "")}`}>
                    {b.telefon}
                  </a>
                </div>
                <span className={`status-badge ${b.durum}`}>
                  {statuses[b.durum]}
                </span>
                <div className="actions">
                  {b.durum === "bekliyor" && (
                    <>
                      <button
                        className="button"
                        disabled={busy === b.id}
                        onClick={() => change(b.id, "onaylandi")}
                      >
                        Onayla
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy === b.id}
                        onClick={() => change(b.id, "reddedildi")}
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  {b.durum === "onaylandi" && (
                    <button
                      className="button danger"
                      disabled={busy === b.id}
                      onClick={() => change(b.id, "iptal")}
                    >
                      İptal et
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <nav className="pagination" aria-label="Randevu sayfaları">
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
              disabled={!bookings.data || bookings.data.length < 50}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
