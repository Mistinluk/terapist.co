import { useEffect, useRef, useState } from "react";
import { api, type Profil } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";
import "./DeleteTherapist.css";

export type TherapistDeletionSummary = {
  uzman_id: string;
  kullanici_adi: string;
  silinebilir: boolean;
  engeller: string[];
};

type Props = {
  profile: Profil;
  summary?: TherapistDeletionSummary | null;
  confirmation: string;
  busy: boolean;
  onConfirmation: (value: string) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** Önizleme yüklenmeden veya hedef adı yazılmadan silme düğmesi açılmaz. */
export function DeleteTherapistView({
  profile,
  summary,
  confirmation,
  busy,
  onConfirmation,
  onDelete,
  onClose,
}: Props) {
  const allowed =
    summary?.silinebilir === true &&
    summary.uzman_id === profile.id &&
    summary.kullanici_adi === profile.kullanici_adi &&
    confirmation === profile.kullanici_adi;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (allowed && !busy) onDelete();
      }}
    >
      <p>
        <strong>{profile.ad}</strong> için profil ve giriş hesabı kalıcı olarak
        silinir. Profil kaynakları, mesleki bağlantıları, davetleri ve profil
        ölçümleri de kaldırılır. Bu işlem geri alınamaz. Denetim kayıtları
        korunur.
      </p>
      <p>
        Randevu geçmişi (iptal edilenler dâhil) varsa kalıcı silme yapılamaz.
        Kayıtları korumak için Arşivle seçeneğini kullanın.
      </p>
      {summary?.engeller.length ? (
        <ul aria-label="Silme engelleri">
          {summary.engeller.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {summary?.silinebilir && (
        <label>
          <span>
            Onaylamak için <strong>{profile.kullanici_adi}</strong> yazın
          </span>
          <input
            aria-label="Silinecek uzmanın kullanıcı adı"
            value={confirmation}
            onChange={(event) => onConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
        </label>
      )}
      <div className="actions">
        <button
          type="submit"
          className="button danger"
          disabled={!allowed || busy}
        >
          {busy ? "Siliniyor…" : "Kalıcı olarak silmeyi onayla"}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onClose}
          disabled={busy}
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

/** Önizleme yalnız bilgilendirir; sunucu silme anında engelleri tekrar denetler. */
export function DeleteTherapist({
  profile,
  onDeleted,
  onClose,
}: {
  profile: Profil;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const endpoint = `/yonetim/uzmanlar/${profile.id}/kalici-sil`;
  const preview = useApi<TherapistDeletionSummary>(endpoint);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  async function remove() {
    if (
      !preview.data?.silinebilir ||
      confirmation !== profile.kullanici_adi ||
      busy
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(endpoint, {
        method: "DELETE",
        body: JSON.stringify({ kullanici_adi: confirmation, kalici_sil: true }),
      });
      onDeleted();
    } catch (cause) {
      setError((cause as Error).message);
      setConfirmation("");
      preview.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="admin-row admin-delete-panel"
      aria-labelledby="therapist-deletion-title"
    >
      <div>
        <h2 id="therapist-deletion-title" tabIndex={-1} ref={heading}>
          Uzmanı kalıcı olarak sil
        </h2>
        <Status
          loading={preview.loading}
          error={preview.error}
          retry={preview.reload}
        />
        {error && <p role="alert">{error}</p>}
        <DeleteTherapistView
          profile={profile}
          summary={preview.loading || preview.error ? undefined : preview.data}
          confirmation={confirmation}
          busy={busy}
          onConfirmation={setConfirmation}
          onDelete={remove}
          onClose={onClose}
        />
      </div>
    </section>
  );
}
