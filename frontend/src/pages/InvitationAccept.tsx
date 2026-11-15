import { useParams } from "react-router-dom";
import { MfaSetup } from "../components/MfaSetup";
import { ProfileForm } from "../components/ProfileForm";
import { Status } from "../components/Status";
import { api, MfaSonucu } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useState } from "react";

type DavetDetayi = {
  email: string;
  ad: string;
  davet_eden: string;
  sure_bitimi: number;
};

export function InvitationAccept() {
  const { token = "" } = useParams();
  const invitation = useApi<DavetDetayi>(`/davetler/${token}`);
  const [result, setResult] = useState<MfaSonucu>();
  if (result) return <MfaSetup result={result} />;
  return (
    <section className="narrow-page">
      <div className="page-heading">
        <span className="eyebrow">MESLEKİ AĞ DAVETİ</span>
        <h1>Terapist.co ağına katılın.</h1>
        {invitation.data && (
          <p className="muted">
            {invitation.data.davet_eden} sizi meslektaşı olarak davet etti.
            Hesabınız doğrulama incelemesinden sonra yayınlanır.
          </p>
        )}
      </div>
      <Status
        loading={invitation.loading}
        error={invitation.error}
        retry={invitation.reload}
      />
      {invitation.data && (
        <ProfileForm
          wizardMode
          label="Daveti kabul et ve hesabı oluştur"
          onSubmit={async (profil, form) => {
            if (!profil.formatlar.length)
              throw new Error("En az bir görüşme şekli seçin.");
            const data = await api<MfaSonucu>(`/davetler/${token}/kabul`, {
              method: "POST",
              body: JSON.stringify({
                profil,
                parola: form.get("parola"),
              }),
            });
            setResult(data);
            window.scrollTo(0, 0);
          }}
        >
          <section className="form-section">
            <h2>Hesap bilgileriniz</h2>
            <div className="form-grid">
              <label className="field">
                Davet edilen e-posta adresi
                <input
                  value={invitation.data.email}
                  type="email"
                  readOnly
                  aria-readonly="true"
                />
              </label>
              <label className="field">
                Parola (en az 14 karakter)
                <input
                  name="parola"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={14}
                  maxLength={128}
                />
              </label>
            </div>
            <p className="muted small">
              Davet yalnız bu e-posta adresi için geçerlidir ve bir kez
              kullanılabilir.
            </p>
          </section>
        </ProfileForm>
      )}
    </section>
  );
}
