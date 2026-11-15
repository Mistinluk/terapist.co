import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { MfaSonucu } from "../lib/api";

export function MfaSetup({ result }: { result: MfaSonucu }) {
  return (
    <section className="auth-card">
      <span className="eyebrow">HESABINIZ OLUŞTURULDU</span>
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
          Doğrulama uygulamasında kurulum anahtarı girme seçeneğini açın. Hesap
          adı olarak e-posta adresinizi, anahtar olarak aşağıdaki değeri
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
}
