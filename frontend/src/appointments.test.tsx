/** Danışan kartı, istatistikler ve kişisel Google bağlantısının sözleşmesi. */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { AppointmentStats } from "./components/AppointmentStats";
import {
  appointmentToken,
  googleCalendarUrl,
  PatientAppointment,
} from "./lib/appointments";
import { PrivateAppointmentLink } from "./components/AppointmentLink";
import { PatientAppointmentCard } from "./components/PatientAppointmentCard";
import { AppointmentDetails } from "./pages/AppointmentDetails";

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
  expect(html).not.toContain("Toplam");
});

it("yalnız eksiksiz fragment anahtarını kabul eder", () => {
  const token = "a".repeat(43);
  expect(appointmentToken(`#anahtar=${token}`)).toBe(token);
  for (const hash of [
    "",
    `?anahtar=${token}`,
    `#anahtar=${token}x`,
    `#anahtar=${token}&extra=1`,
    "#anahtar=short",
    `#anahtar=${"%".repeat(43)}`,
  ]) {
    expect(appointmentToken(hash)).toBe("");
  }
});

it("özel bağlantıda erişim uyarısı ve süreyi gösterir", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PrivateAppointmentLink
        link={{
          takip_yolu: `/randevularim/private-id#anahtar=${"a".repeat(43)}`,
          takip_son_kullanim: "2030-07-10T14:00:00Z",
        }}
      />
    </MemoryRouter>,
  );
  expect(html).toContain("Randevuyu yönet");
  expect(html).toContain("Bağlantıyı kopyala");
  expect(html).toContain("Üyelik gerekmez");
  expect(html).toContain("Geçerlilik:");
  expect(html).toContain("nofollow noreferrer");
});

it("iptal edilmiş kartta iptal ve Google kopyası eylemleri bulunmaz", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <PatientAppointmentCard booking={{ ...booking, durum: "iptal" }} />
    </MemoryRouter>,
  );
  expect(html).toContain("İptal edildi");
  expect(html).not.toContain("Randevuyu iptal et");
  expect(html).not.toContain("calendar.google.com");
});

it("anahtarsız özel sayfada randevu veya istatistik göstermez", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/randevularim/private-id"]}>
      <AppointmentDetails />
    </MemoryRouter>,
  );
  expect(html).toContain("Bağlantı eksik veya geçersiz");
  expect(html).not.toContain("appointment-card");
  expect(html).not.toContain("appointment-stats");
  expect(html).not.toContain("Tarihi değiştir");
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
