import {
  AppointmentStats as Stats,
  appointmentStatuses,
} from "../lib/appointments";
import "./AppointmentStats.css";

/** Sayfa uzunluğunu değil, API'nin bütün yetkili kayıtlardan aldığı toplamı gösterir. */
export function AppointmentStats({ data }: { data?: Stats }) {
  if (!data) return null;
  return (
    <section className="appointment-stats" aria-label="Randevu istatistikleri">
      {Object.entries({ toplam: "Toplam talep", ...appointmentStatuses }).map(
        ([key, label]) => (
          <div key={key} className="appointment-stat">
            <span>{label}</span>
            <strong>{data[key as keyof Stats]}</strong>
          </div>
        ),
      )}
    </section>
  );
}
