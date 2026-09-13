import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ProfileForm } from "../components/ProfileForm";
import { api } from "../lib/api";

export function Apply() {
  const [result, setResult] = useState<{
    mesaj: string;
    mfa_anahtari: string;
    mfa_uri: string;
  }>();
  if (result)
    return (
      <section className="auth-card">
        <span className="eyebrow">BAŞVURUNUZ ALINDI</span>
        <h1>Son bir adım.</h1>
        <p>{result.mesaj}</p>
        <h2>İki adımlı doğrulamayı kurun</h2>
        <p className="muted">
          Google Authenticator'da + → QR kodu tara seçeneğini açın ve aşağıdaki
          kodu tarayın. Bu QR kod yalnızca sizin hesabınıza aittir.
        </p>
        <div className="mfa-qr">
          <QRCodeSVG
            value={result.mfa_uri}
            size={240}
            marginSize={4}
            level="M"
            title="Hesabınızın doğrulama uygulaması kurulum QR kodu"
            role="img"
          />
        </div>
        <details>
          <summary>QR kodu tarayamıyorum</summary>
          <p className="muted small">
            Doğrulama uygulamasında kurulum anahtarı girme seçeneğini açın.
            Hesap adı olarak e-posta adresinizi, anahtar olarak aşağıdaki değeri
            kullanın. Türü zaman tabanlı seçin.
          </p>
          <code className="secret">{result.mfa_anahtari}</code>
        </details>
        <p className="muted small">
          Kurulum bilgileri yalnızca bu ekranda gösterilir. Sayfadan ayrılmadan
          kurulumu tamamlayın; QR kodu ve anahtarı paylaşmayın.
        </p>
        <p className="muted">
          Sonraki adımda e-posta adresiniz, parolanız ve uygulamada görünen 6
          haneli kodla giriş yapın. Kod 30 saniyede bir yenilenir.
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
          const data = await api<{
            mesaj: string;
            mfa_anahtari: string;
            mfa_uri: string;
          }>("/oturum/basvuru", {
            method: "POST",
            body: JSON.stringify({
              profil,
              email: form.get("email"),
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
