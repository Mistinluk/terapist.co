import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../lib/auth";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const u = await login(
        String(form.get("email")),
        String(form.get("parola")),
        String(form.get("kod")),
      );
      navigate(u.rol === "yonetici" ? "/yonetim" : "/panel");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card">
      <span className="auth-icon">
        <LockKeyhole />
      </span>
      <span className="eyebrow">UZMAN ÇALIŞMA ALANI</span>
      <h1>Hoş geldiniz.</h1>
      <p className="muted">Profilinizi ve randevu taleplerinizi yönetin.</p>
      <form onSubmit={submit}>
        <label className="field">
          E-posta adresi
          <input
            type="email"
            name="email"
            autoComplete="username"
            maxLength={254}
            required
          />
        </label>
        <label className="field">
          Parola
          <input
            type="password"
            name="parola"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
        <label className="field">
          Doğrulama uygulamasındaki kod
          <input
            name="kod"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6 haneli kod"
            aria-describedby="mfa-yardim"
          />
        </label>
        <p id="mfa-yardim" className="muted small">
          Hesabınızın kurulum anahtarını doğrulama uygulamanıza zaman tabanlı
          hesap olarak ekleyin. Uygulamanın ürettiği 6 haneli kodu buraya
          yazın; kod 30 saniyede bir yenilenir. SMS veya e-posta gönderilmez.
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button full-width" disabled={busy}>
          {busy ? "Giriş yapılıyor…" : "Güvenli giriş yap"}
        </button>
      </form>
      <p className="auth-bottom">
        Henüz hesabınız yok mu? <Link to="/basvuru">Başvurun</Link>
      </p>
      <p className="muted small">
        Parolanızı veya doğrulama uygulamanızı kaybettiyseniz hesabınızı açan
        platform yöneticisine başvurun.
      </p>
    </section>
  );
}
