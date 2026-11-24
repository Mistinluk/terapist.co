import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, tarih } from "../lib/api";
import { appointmentToken, PrivateAppointment } from "../lib/appointments";
import { useApi } from "../lib/useApi";
import { PatientAppointmentCard } from "../components/PatientAppointmentCard";
import { PrivateAppointmentLink } from "../components/AppointmentLink";
import { Status } from "../components/Status";

/** Üyelik ve çerez olmadan, yalnız URL parçasındaki anahtarla tek randevu. */
export function AppointmentDetails() {
  const { id } = useParams();
  const { hash } = useLocation();
  // Link değiştiğinde açık form ve eski randevu bilgileri de sıfırlanır.
  return (
    <AppointmentDetailsContent
      key={`${id}:${hash}`}
      id={id ?? ""}
      hash={hash}
    />
  );
}

function AppointmentDetailsContent({ id, hash }: { id: string; hash: string }) {
  const token = appointmentToken(hash);
  const base = `/danisan/randevu/${encodeURIComponent(id)}`;
  const body = JSON.stringify({ anahtar: token });
  const booking = useApi<PrivateAppointment>(
    token ? `${base}/goruntule` : null,
    body,
    undefined,
    30000,
  );
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const slots = useApi<{ saatler: string[] }>(
    token && editing ? `${base}/saatler` : null,
    body,
  );
  useEffect(() => {
    document.title = "Özel randevu takibi · terapist.co";
  }, []);

  async function cancel() {
    setBusy(true);
    setMessage("");
    try {
      await api(`${base}/iptal`, { method: "POST", body });
      setMessage(
        "Randevu iptal edildi. Kendi Google Takvim kopyanızı da kaldırın.",
      );
      setConfirmCancel(false);
      setEditing(false);
      booking.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`${base}/tarih`, {
        method: "POST",
        body: JSON.stringify({ anahtar: token, baslangic: selected }),
      });
      setMessage(
        "Yeni saat talebiniz iletildi; uzman onayı bekleniyor. Kendi Google Takvim kopyanızı da güncelleyin.",
      );
      setEditing(false);
      setSelected("");
      booking.reload();
    } catch (error) {
      setMessage((error as Error).message);
      setSelected("");
      slots.reload();
      booking.reload();
    } finally {
      setBusy(false);
    }
  }

  const current = booking.data;
  const mutable =
    current &&
    ["bekliyor", "onaylandi"].includes(current.durum) &&
    new Date(current.baslangic).getTime() > Date.now();

  return (
    <section className="patient-appointments private-appointment">
      <header>
        <span className="eyebrow">ÜYELİKSİZ RANDEVU TAKİBİ</span>
        <h1>Randevunuz</h1>
      </header>
      <p>Güncel durumu buradan takip edin. Sayfa 30 saniyede bir yenilenir.</p>
      {!token ? (
        <p role="alert" className="notice">
          Bağlantı eksik veya geçersiz. Size verilen özel bağlantının tamamını
          açın. Bağlantınızı kaybettiyseniz uzmanınızdan yenisini isteyin.
        </p>
      ) : (
        <Status
          loading={booking.loading && !current}
          error={booking.error}
          retry={booking.reload}
        />
      )}
      {token && !booking.error && current && (
        <>
          <PatientAppointmentCard booking={current} />
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          {mutable ? (
            <>
              <div className="actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(!editing);
                    setConfirmCancel(false);
                    setSelected("");
                  }}
                >
                  Tarihi değiştir
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setConfirmCancel(true);
                    setEditing(false);
                  }}
                >
                  Randevuyu iptal et
                </button>
              </div>
              {editing && (
                <form
                  className="appointment-change-form"
                  onSubmit={(event) => void reschedule(event)}
                >
                  <h2>Yeni randevu saati</h2>
                  <p>
                    Yeni saat uzman onayına gönderilir. Mevcut saatiniz,
                    değişiklik başarıyla tamamlanana kadar korunur. Tüm saatler
                    Türkiye saatine göredir.
                  </p>
                  <Status
                    loading={slots.loading}
                    error={slots.error}
                    retry={slots.reload}
                  />
                  <label htmlFor="appointment-new-time">Uygun saat seçin</label>
                  <select
                    id="appointment-new-time"
                    required
                    value={selected}
                    disabled={busy || slots.loading || Boolean(slots.error)}
                    onChange={(event) => setSelected(event.target.value)}
                  >
                    <option value="">Saat seçin</option>
                    {slots.data?.saatler.map((slot) => (
                      <option key={slot} value={slot}>
                        {tarih(slot)}
                      </option>
                    ))}
                  </select>
                  {!slots.loading && slots.data?.saatler.length === 0 && (
                    <p>
                      Şu anda uygun saat yok. Daha sonra tekrar deneyin veya
                      uzmanınızla iletişime geçin.
                    </p>
                  )}
                  <div className="actions">
                    <button
                      className="button"
                      type="submit"
                      disabled={busy || !selected || Boolean(slots.error)}
                    >
                      {busy ? "Gönderiliyor…" : "Yeni saati talep et"}
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => setEditing(false)}
                    >
                      Vazgeç
                    </button>
                  </div>
                </form>
              )}
              {confirmCancel && (
                <div className="appointment-cancel-confirm">
                  <p>
                    Bu randevuyu iptal etmek istiyor musunuz? İptal edilen saat
                    başkaları tarafından seçilebilir.
                  </p>
                  <div className="actions">
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => void cancel()}
                    >
                      İptali onayla
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setConfirmCancel(false)}
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>
              Bu randevunun tarihi artık değiştirilemez veya randevu iptal
              edilemez. Yeni bir randevu için{" "}
              <Link to={`/uzman/${current.uzman_id}`}>
                uzman profilini açın
              </Link>
              .
            </p>
          )}
          <PrivateAppointmentLink
            link={{
              takip_yolu: `/randevularim/${encodeURIComponent(id)}${hash}`,
              takip_son_kullanim: current.takip_son_kullanim,
            }}
          />
          <p className="muted">
            Google düğmesi kişisel takviminize ayrı bir kopya ekler. Tarih, onay
            ve iptal değişiklikleri bu kopyaya otomatik aktarılmaz. Güncel bilgi
            bu sayfadadır.
          </p>
        </>
      )}
    </section>
  );
}
