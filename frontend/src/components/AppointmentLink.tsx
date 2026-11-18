import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { api, tarih } from "../lib/api";
import { AppointmentLink as LinkData } from "../lib/appointments";
import "./AppointmentLink.css";

/** Bağlantı yalnız oluşturulurken gösterilir; ham anahtar sunucuda saklanmaz. */
export function PrivateAppointmentLink({ link }: { link: LinkData }) {
  const id = useId();
  const [message, setMessage] = useState("");
  const url =
    typeof window === "undefined"
      ? link.takip_yolu
      : new URL(link.takip_yolu, window.location.origin).href;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Bağlantı kopyalandı. Güvenli bir yerde saklayın.");
    } catch {
      setMessage("Aşağıdaki bağlantıyı seçip elle kopyalayabilirsiniz.");
    }
  }

  return (
    <div className="private-appointment-link">
      <label htmlFor={id}>Randevunuza özel bağlantı</label>
      <input
        id={id}
        type="text"
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
        autoComplete="off"
      />
      <div className="actions">
        <Link className="button" to={link.takip_yolu} rel="nofollow noreferrer">
          Randevuyu yönet
        </Link>
        <button
          className="button secondary"
          type="button"
          onClick={() => void copy()}
        >
          Bağlantıyı kopyala
        </button>
      </div>
      <p>
        Üyelik gerekmez. Bu bağlantıyı bilen kişi randevunuzu görebilir, iptal
        edebilir veya tarihini değiştirebilir. Güvenli saklayın.
      </p>
      <small>
        Geçerlilik: {tarih(link.takip_son_kullanim)} · Türkiye saati
      </small>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

/** Eski randevular için hasta tarayıcısı veya ilgili uzman yeni link verebilir. */
export function AppointmentLinkButton({
  bookingId,
  therapist = false,
}: {
  bookingId: string;
  therapist?: boolean;
}) {
  const [link, setLink] = useState<LinkData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    try {
      setLink(
        await api<LinkData>(
          `/${therapist ? "uzman" : "danisan"}/randevular/${bookingId}/baglanti`,
          { method: "POST", body: "{}" },
        ),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="appointment-link-control">
      {link ? (
        <PrivateAppointmentLink link={link} />
      ) : (
        <>
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={() => void create()}
          >
            {busy ? "Oluşturuluyor…" : "Özel bağlantı oluştur / yenile"}
          </button>
          <small>
            Yeni bağlantı oluşturmak önceki bağlantıyı geçersiz kılar.
          </small>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
