import { FormEvent, useEffect, useRef, useState } from "react";
import { BellPlus, CheckCircle2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { olayBildir } from "../lib/analytics";

export function WaitlistModal({
  open,
  onClose,
  therapistId,
  therapistName,
  therapistUsername,
  legalText,
  legalVersion,
}: {
  open: boolean;
  onClose: () => void;
  therapistId: string;
  therapistName: string;
  therapistUsername?: string;
  legalText?: string;
  legalVersion?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSuccess("");
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!legalVersion) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await api<{ mesaj: string }>("/bekleme-listesi", {
        method: "POST",
        body: JSON.stringify({
          uzman_id: therapistId,
          ad: data.get("ad"),
          telefon: data.get("telefon"),
          email: data.get("email") || null,
          tercih_format: data.get("tercih_format") || "farketmez",
          tercih_zaman: data.get("tercih_zaman") || "esnek",
          aydinlatma_okundu: data.get("okundu") === "on",
          aydinlatma_surumu: legalVersion,
        }),
      });
      olayBildir("waitlist_submitted", {
        uzman_id: therapistId,
        uzman_kullanici_adi: therapistUsername,
      });
      setSuccess(response.mesaj);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tp-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tp-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tp-modal-header">
          <div>
            <span className="eyebrow">BEKLEME LİSTESİ VE ÖN KAYIT</span>
            <h3 id="waitlist-modal-title">{therapistName}</h3>
          </div>
          <button
            type="button"
            className="tp-modal-close"
            aria-label="Kapat"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {success ? (
          <div className="waitlist-success-box" role="status">
            <CheckCircle2 size={28} aria-hidden="true" />
            <p>{success}</p>
            <button type="button" className="button" onClick={onClose}>
              Profil sayfasına dön
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="tp-modal-form">
            <p className="muted small">
              Takvim şu an dolu görünüyor veya farklı bir zaman aralığı
              arıyorsunuz. Bilgilerinizi bırakın, boşluk açıldığında uzmanınız
              size doğrudan ulaşsın.
            </p>
            <label className="field">
              Adınız ve soyadınız
              <input
                ref={firstInputRef}
                name="ad"
                autoComplete="name"
                minLength={3}
                maxLength={150}
                required
              />
            </label>
            <div className="resource-schedule-grid">
              <label className="field">
                Telefon numaranız
                <input
                  name="telefon"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="05XX XXX XX XX"
                  pattern="\+?[0-9 \(\)\-]{10,20}"
                  maxLength={20}
                  required
                />
              </label>
              <label className="field">
                E-posta (isteğe bağlı)
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@eposta.com"
                />
              </label>
            </div>
            <div className="resource-schedule-grid">
              <label className="field">
                Görüşme şekli tercihi
                <select name="tercih_format" defaultValue="farketmez">
                  <option value="farketmez">Fark etmez</option>
                  <option value="cevrim_ici">Çevrim içi</option>
                  <option value="yuz_yuze">Yüz yüze</option>
                </select>
              </label>
              <label className="field">
                Uygun zaman aralığı
                <select name="tercih_zaman" defaultValue="esnek">
                  <option value="esnek">Esnek saatler</option>
                  <option value="sabah">Sabah (09:00 – 12:00)</option>
                  <option value="ogleden_sonra">
                    Öğleden sonra (12:00 – 17:00)
                  </option>
                  <option value="aksam">Akşam (17:00 sonrası)</option>
                  <option value="hafta_sonu">Hafta sonu</option>
                </select>
              </label>
            </div>
            <details className="legal-details">
              <summary>Kişisel verilerin işlenmesi hakkında</summary>
              <p>{legalText || "Metin yükleniyor…"}</p>
              <Link to="/aydinlatma">Metnin tamamı</Link>
            </details>
            <label className="consent">
              <input type="checkbox" name="okundu" required /> Aydınlatma
              metnini okudum.
            </label>
            <p className="muted small">
              KVKK gereği bu formda tanı, şikâyet veya klinik sağlık bilgisi
              alınmaz.
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button full-width"
              type="submit"
              disabled={busy || !legalVersion}
            >
              <BellPlus size={16} aria-hidden="true" />
              {busy ? "Kaydediliyor…" : "Bekleme listesine katıl"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
