/** Danışan kartı, istatistikler ve kişisel Google bağlantısının sözleşmesi. */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { AppointmentStats } from "./components/AppointmentStats";
import { googleCalendarUrl, PatientAppointment } from "./lib/appointments";
import { PatientAppointmentCard } from "./pages/PatientAppointments";

const booking: PatientAppointment = {
  id: "private-id",
  uzman_id: "uzman-id",
  uzman_adi: "Örnek Uzman",
  baslangic: "2030-06-10T14:00:00+03:00",
  bitis: "2030-06-10T14:50:00+03:00",
  durum: "onaylandi",
};

it("Google bağlantısına yalnız başlık ve doğru UTC zamanlarını koyar", () => {
  const url = new URL(googleCalendarUrl(booking)!);
  expect(url.origin).toBe("https://calendar.google.com");
  expect(url.searchParams.get("dates")).toBe(
    "20300610T110000Z/20300610T115000Z",
  );
  expect(url.searchParams.get("text")).toBe("Randevu");
  expect(url.toString()).not.toContain(booking.id);
  expect(url.toString()).not.toContain(encodeURIComponent(booking.uzman_adi));
  expect(googleCalendarUrl({ ...booking, durum: "iptal" })).toBeNull();
  expect(googleCalendarUrl({ ...booking, durum: "tamamlandi" })).toBeNull();
});

it("bekleyen talebi onaylı göstermeden güvenli takvim bağlantısı sunar", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PatientAppointmentCard booking={{ ...booking, durum: "bekliyor" }} />
    </MemoryRouter>,
  );
  expect(html).toContain("Onay bekliyor");
  expect(html).toContain("noopener noreferrer");
  expect(html).toContain("Randevuyu iptal et");
});

it("API toplamlarını tamamlanmış ve iptal edilmiş kayıtlarla gösterir", () => {
  const html = renderToStaticMarkup(
    <AppointmentStats
      data={{
        toplam: 160,
        bekliyor: 10,
        onaylandi: 30,
        tamamlandi: 100,
        iptal: 15,
        reddedildi: 5,
      }}
    />,
  );
  expect(html).toContain("160");
  expect(html).toContain("Tamamlandı");
  expect(html).toContain("100");
  expect(html).toContain("İptal edildi");
});
