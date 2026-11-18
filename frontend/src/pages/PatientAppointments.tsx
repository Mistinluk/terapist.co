import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, tarih } from "../lib/api";
import { useApi } from "../lib/useApi";
import {
  appointmentStatuses,
  AppointmentStats as Stats,
  googleCalendarUrl,
  PatientAppointment,
} from "../lib/appointments";
import { AppointmentStats } from "../components/AppointmentStats";
import { Status } from "../components/Status";
import { AppointmentLinkButton } from "../components/AppointmentLink";

export function PatientAppointmentCard({
  booking,
  busy,
  onCancel,
}: {
  booking: PatientAppointment;
  busy?: boolean;
  onCancel?: () => void;
}) {
  const url = googleCalendarUrl(booking);
  return (
    <article className="appointment-card">
      <h2>
        <Link to={`/uzman/${booking.uzman_id}`}>{booking.uzman_adi}</Link>
      </h2>
      <p>{tarih(booking.baslangic)} · Türkiye saati</p>
      <p className="status-badge">{appointmentStatuses[booking.durum]}</p>
      <div className="actions">
        {url && (
          <a
            className="button secondary"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            Google Takvim'e ekle
          </a>
        )}
        {onCancel &&
          url &&
          new Date(booking.baslangic).getTime() > Date.now() && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={onCancel}
            >
              Randevuyu iptal et
            </button>
          )}
      </div>
    </article>
  );
}

export function PatientAppointments() {
  useEffect(() => {
    document.title = "Randevularım · terapist.co";
  }, []);
  const [page, setPage] = useState(1);
  const bookings = useApi<PatientAppointment[]>(
    `/danisan/randevular?sayfa=${page}`,
    undefined,
    undefined,
    30000,
  );
  const stats = useApi<Stats>(
    "/danisan/randevu-ozeti",
    undefined,
    undefined,
    30000,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const reload = () => {
    bookings.reload();
    stats.reload();
  };

  async function cancel(id: string) {
    if (!window.confirm("Bu randevuyu iptal etmek istiyor musunuz?")) return;
    setBusy(id);
    try {
      await api(`/danisan/randevular/${id}/iptal`, {
        method: "POST",
        body: "{}",
      });
      setMessage(
        "Randevu iptal edildi. Kendi Google Takvim kopyanızı da kaldırın.",
      );
      reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function forget() {
    if (
      !window.confirm(
        "Önce özel randevu bağlantılarınızı saklayın. Bu cihazdaki liste erişimi kapanır; özel bağlantılar geçerli kalır ve randevular iptal edilmez. Devam edilsin mi?",
      )
    )
      return;
    try {
      await api("/danisan/oturum", { method: "DELETE" });
      reload();
      setMessage("Bu cihazdaki randevu erişimi kapatıldı.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <section className="patient-appointments">
      <header>
        <span className="eyebrow">DANIŞAN ALANI</span>
        <h1>Randevularım</h1>
      </header>
      <p>
        Bu tarayıcıdan oluşturduğunuz talepleri kayıt olmadan takip edin. Onay
        ve iptal durumu 30 saniyede bir yenilenir.
      </p>
      <p className="notice">
        Bu listeye erişim tarayıcıda 90 gün saklanır. Her randevu için özel
        bağlantı oluşturup saklayın; başka cihazdan da takip edebilir, tarihini
        değiştirebilir veya iptal edebilirsiniz. Paylaşılan cihazda işiniz
        bitince aşağıdaki erişimi kapatma düğmesini kullanın.
      </p>
      <AppointmentStats data={stats.data} />
      <Status
        loading={bookings.loading && !bookings.data}
        error={bookings.error || stats.error}
        retry={reload}
      />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="actions">
        <button className="button secondary" onClick={reload}>
          Yenile
        </button>
        <button className="text-button" onClick={() => void forget()}>
          Bu cihazdaki erişimi kapat
        </button>
      </div>
      {bookings.data?.length === 0 && (
        <p>
          Bu tarayıcıya ait randevu bulunmuyor.{" "}
          <Link to="/kesfet">Uzmanları keşfedin</Link>.
        </p>
      )}
      {bookings.data?.map((booking) => (
        <div key={booking.id}>
          <PatientAppointmentCard
            booking={booking}
            busy={busy === booking.id}
            onCancel={() => void cancel(booking.id)}
          />
          <AppointmentLinkButton bookingId={booking.id} />
        </div>
      ))}
      <div className="actions">
        <button
          className="button secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Önceki
        </button>
        <span>Sayfa {page}</span>
        <button
          className="button secondary"
          disabled={page * 50 >= (stats.data?.toplam ?? 0)}
          onClick={() => setPage(page + 1)}
        >
          Sonraki
        </button>
      </div>
      <p className="muted">
        Google düğmesi kişisel takviminizde ayrı bir kopya açar. Kaydetmeniz
        gerekir; sonraki onay ve iptal değişiklikleri bu kopyaya otomatik
        aktarılmaz. Güncel durum bu sayfadadır.
      </p>
    </section>
  );
}
