/** Randevu ekranlarının ortak Türkçe durumları ve kişisel takvim bağlantısı. */
export const appointmentStatuses: Record<string, string> = {
  bekliyor: "Onay bekliyor",
  onaylandi: "Onaylandı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal edildi",
  reddedildi: "Reddedildi",
};

export type AppointmentStats = Record<
  "toplam" | "bekliyor" | "onaylandi" | "tamamlandi" | "iptal" | "reddedildi",
  number
>;

export type PatientAppointment = {
  id: string;
  uzman_id: string;
  uzman_adi: string;
  baslangic: string;
  bitis: string;
  durum: string;
};

/** Kullanıcı tıklamadan Google'a istek gitmez; ad/telefon/link gönderilmez. */
export function googleCalendarUrl(booking: PatientAppointment): string | null {
  if (!["bekliyor", "onaylandi"].includes(booking.durum)) return null;
  const format = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text:
      booking.durum === "bekliyor"
        ? "Randevu talebi (onay bekliyor)"
        : "Randevu",
    dates: `${format(booking.baslangic)}/${format(booking.bitis)}`,
    ctz: "Europe/Istanbul",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
