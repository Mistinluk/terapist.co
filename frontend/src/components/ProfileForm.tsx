import { FormEvent, ReactNode, useState } from "react";
import { ProfilGirdi } from "../lib/api";

export const days = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
export function readProfile(form: FormData): ProfilGirdi {
  const text = (key: string) => String(form.get(key) || "").trim();
  const list = (key: string) =>
    text(key)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    ad: text("ad"),
    sehir: text("sehir"),
    ilce: text("ilce"),
    biyografi: text("biyografi"),
    ucret: Number(form.get("ucret")),
    deneyim_yili: Number(form.get("deneyim_yili")),
    adres: text("adres"),
    ekoller: list("ekoller"),
    kitle: list("kitle"),
    uzmanliklar: list("uzmanliklar"),
    egitim: list("egitim"),
    kurumlar: list("kurumlar"),
    formatlar: form.getAll("formatlar").map(String),
    calisma_saatleri: days.flatMap((_, gun) =>
      form.has(`gun_${gun}`)
        ? [
            {
              gun,
              baslangic: Number(form.get(`bas_${gun}`)),
              bitis: Number(form.get(`bit_${gun}`)),
            },
          ]
        : [],
    ),
  };
}
export function ProfileForm({
  profile,
  children,
  onSubmit,
  label = "Değişiklikleri kaydet",
}: {
  profile?: ProfilGirdi;
  children?: ReactNode;
  onSubmit: (profile: ProfilGirdi, data: FormData) => Promise<void>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      await onSubmit(readProfile(form), form);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof ProfilGirdi,
    label: string,
    required = false,
    maxLength = 100,
  ) => (
    <label className="field">
      {label}
      <input
        name={key}
        required={required}
        maxLength={maxLength}
        defaultValue={
          Array.isArray(profile?.[key])
            ? (profile[key] as string[]).join(", ")
            : String(profile?.[key] || "")
        }
      />
    </label>
  );
  return (
    <form onSubmit={submit} className="profile-form">
      {children}
      <section className="form-section">
        <h2>Profil bilgileri</h2>
        <p className="muted">
          Bu bölümdeki bilgiler onaydan sonra herkese açık profilinizde görünür.
        </p>
        {field("ad", "Ad, soyad ve mesleki unvan", true, 150)}
        <div className="form-grid">
          {field("sehir", "Şehir", true, 80)}
          {field("ilce", "İlçe", true, 80)}
        </div>
        <label className="field">
          Hakkınızda
          <textarea
            name="biyografi"
            rows={5}
            minLength={20}
            maxLength={5000}
            required
            defaultValue={profile?.biyografi}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Görüşme ücreti (₺)
            <input
              name="ucret"
              type="number"
              min="0"
              max="100000"
              required
              defaultValue={profile?.ucret ?? ""}
            />
          </label>
          <label className="field">
            Mesleki deneyim (yıl)
            <input
              name="deneyim_yili"
              type="number"
              min="0"
              max="70"
              required
              defaultValue={profile?.deneyim_yili ?? 0}
            />
          </label>
        </div>
        {field("adres", "Görüşme adresi (isteğe bağlı)", false, 500)}
      </section>
      <section className="form-section">
        <h2>Çalışma alanlarınız</h2>
        <p className="muted">Birden fazla bilgiyi virgülle ayırın.</p>
        <div className="form-grid">
          {field(
            "uzmanliklar",
            "Destek alanları (örn. Kaygı, Yas / kayıp)",
            true,
            1000,
          )}
          {field("ekoller", "Terapi yaklaşımları (örn. BDT, EMDR)", true, 1000)}
          {field("kitle", "Danışan grupları (örn. Yetişkin, Ergen)", true, 500)}
          {field("egitim", "Eğitim bilgileri", false, 1000)}
        </div>
        {field("kurumlar", "Çalıştığınız kurumlar", false, 1000)}
        <fieldset>
          <legend>Görüşme şekli (en az birini seçin)</legend>
          <div className="inline-fields">
            {["Çevrim içi", "Yüz yüze"].map((value) => (
              <label className="radio" key={value}>
                <input
                  type="checkbox"
                  name="formatlar"
                  value={value}
                  defaultChecked={
                    profile?.formatlar.includes(value) ?? value === "Çevrim içi"
                  }
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      <section className="form-section">
        <h2>Haftalık görüşme saatleri</h2>
        <p className="muted">
          Türkiye saatiyle, birer saatlik görüşmeler. Kapalı günleri
          işaretlemeyin. Değişiklikler mevcut randevuları iptal etmez.
        </p>
        {days.map((day, index) => {
          const hours = profile?.calisma_saatleri.find((h) => h.gun === index);
          return (
            <div className="schedule-row" key={day}>
              <label className="radio">
                <input
                  type="checkbox"
                  name={`gun_${index}`}
                  defaultChecked={!!hours}
                />
                {day}
              </label>
              <label>
                <span className="sr-only">{day} başlangıç</span>
                <select
                  name={`bas_${index}`}
                  defaultValue={hours?.baslangic ?? 9}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
              <span>—</span>
              <label>
                <span className="sr-only">{day} bitiş</span>
                <select name={`bit_${index}`} defaultValue={hours?.bitis ?? 17}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {String(i + 1).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </section>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          Bilgiler kaydedildi.
        </p>
      )}
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Kaydediliyor…" : label}
      </button>
    </form>
  );
}
