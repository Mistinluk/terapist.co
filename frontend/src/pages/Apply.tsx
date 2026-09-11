import { useState } from "react";
import { Link } from "react-router-dom";
import { ProfileForm } from "../components/ProfileForm";
import { api } from "../lib/api";

export function Apply() {
  const [result, setResult] = useState<{
    mesaj: string;
    mfa_anahtari: string;
  }>();
  if (result)
    return (
      <section className="auth-card">
        <span className="eyebrow">BAŞVURUNUZ ALINDI</span>
        <h1>Son bir adım.</h1>
        <p>{result.mesaj}</p>
        <h2>İki adımlı doğrulamayı kurun</h2>
        <p className="muted">
          Doğrulama uygulamanızda yeni bir hesap ekleyin. Hesap adı olarak
          e-posta adresinizi, anahtar olarak aşağıdaki kodu kullanın. Tür:
          zamana dayalı (TOTP).
        </p>
        <code className="secret">{result.mfa_anahtari}</code>
        <p className="muted small">
          Bu anahtar yalnızca şimdi gösterilir. Güvenli bir yerde saklayın ve
          paylaşmayın.
        </p>
        <Link className="button" to="/giris">
          Kurulumu yaptım, giriş yap
        </Link>
      </section>
    );
  return (
    <section className="narrow-page">
      <div className="page-heading">
        <span className="eyebrow">UZMAN AĞINA KATILIN</span>
        <h1>Birlikte, daha erişilebilir.</h1>
        <p className="muted">
          Mesleki bilgilerinizi paylaşın. Profiliniz, yönetici incelemesi ve
          onayından sonra görünür olur.
        </p>
      </div>
      <ProfileForm
        label="Başvuruyu gönder"
        onSubmit={async (profil, form) => {
          if (!profil.formatlar.length)
            throw new Error("En az bir görüşme şekli seçin.");
          const data = await api<{ mesaj: string; mfa_anahtari: string }>(
            "/oturum/basvuru",
            {
              method: "POST",
              body: JSON.stringify({
                profil,
                email: form.get("email"),
                parola: form.get("parola"),
              }),
            },
          );
          setResult(data);
          window.scrollTo(0, 0);
        }}
      >
        <section className="form-section">
          <h2>Hesap bilgileriniz</h2>
          <div className="form-grid">
            <label className="field">
              E-posta adresi
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
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
            E-posta adresiniz giriş için kullanılır; herkese açık profilinizde
            gösterilmez.
          </p>
        </section>
      </ProfileForm>
    </section>
  );
}
