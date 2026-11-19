import { Link } from "react-router-dom";
import { tarih } from "../lib/api";
import {
  appointmentStatuses,
  googleCalendarUrl,
  PatientAppointment,
} from "../lib/appointments";

/** Yalnız özel bağlantıyla açılan tek randevunun durumunu gösterir. */
export function PatientAppointmentCard({
  booking,
}: {
  booking: PatientAppointment;
}) {
  const url = googleCalendarUrl(booking);
  return (
    <article className="appointment-card">
      <h2>
        <Link to={`/uzman/${booking.uzman_id}`}>{booking.uzman_adi}</Link>
      </h2>
      <p>{tarih(booking.baslangic)} · Türkiye saati</p>
      <p className="status-badge">{appointmentStatuses[booking.durum]}</p>
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
    </article>
  );
}
