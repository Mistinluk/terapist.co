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

export type AppointmentLink = {
  takip_yolu: string;
  takip_son_kullanim: string;
};

export type PrivateAppointment = PatientAppointment & {
  takip_son_kullanim: string;
};

/** Anahtar URL sorgusuna, analitiğe veya kalıcı tarayıcı deposuna taşınmaz. */
export function appointmentToken(hash: string): string {
  return /^#anahtar=([A-Za-z0-9_-]{43})$/.exec(hash)?.[1] ?? "";
}

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
