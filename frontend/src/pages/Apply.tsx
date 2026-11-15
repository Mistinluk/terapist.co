import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Avatar } from "../components/Avatar";
import { MfaSetup } from "../components/MfaSetup";
import { ProfileForm } from "../components/ProfileForm";
import { slugifyTurkishName, UsernameField } from "../components/UsernameField";
import { api, MfaSonucu, ProfilGirdi } from "../lib/api";
import { usePageMetadata } from "../lib/seoMetadata";

export function Apply() {
  usePageMetadata({
    title: "Uzman Olarak Katıl · Profil Adresini Sahiplen | terapist.co",
    description:
      "terapist.co/adiniz biçiminde doğrulanmış klinik profilinizi, randevu takviminizi ve şifreli değerlendirme formlarınızı dakikalar içinde oluşturun.",
    path: "/basvuru",
  });
  const [params] = useSearchParams();
  const initialSlug = slugifyTurkishName(params.get("kullanici_adi") || "");
  const [username, setUsername] = useState(initialSlug);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [draft, setDraft] = useState<ProfilGirdi>();
  const [result, setResult] = useState<MfaSonucu>();

  if (result) return <MfaSetup result={result} />;

  const checks = [
    {
      label: "Özel profil adresi (terapist.co/…)",
      done: Boolean(username && usernameAvailable),
    },
    {
      label: "Ad, unvan, şehir ve hakkınızda yazısı",
      done: Boolean(
        draft &&
        draft.ad.length >= 3 &&
        draft.sehir.length >= 2 &&
        draft.biyografi.length >= 20,
      ),
    },
    {
      label: "Görüşme ücreti ve görüşme şekli",
      done: Boolean(
        draft && draft.ucret > 0 && (draft.formatlar?.length ?? 0) > 0,
      ),
    },
    {
      label: "Destek alanları ve terapi yaklaşımı",
      done: Boolean(
        draft &&
        (draft.uzmanliklar?.length ?? 0) > 0 &&
        (draft.ekoller?.length ?? 0) > 0,
      ),
    },
    {
      label: "Haftalık görüşme saatleri",
      done: Boolean(draft && (draft.calisma_saatleri?.length ?? 0) > 0),
    },
  ];
  const completedCount = checks.filter((c) => c.done).length;
  const completionPct = Math.round((completedCount / checks.length) * 100);

  return (
    <section className="apply-onboarding">
      <div className="apply-hero">
        <div className="apply-hero-copy">
          <span className="eyebrow">UZMAN AĞINA KATILIN</span>
          <h1>Mesleki profilinizi adım adım oluşturun.</h1>
          <p className="muted">
            Kendi özel adresinizi seçin, çalışma alanlarınızı işaretleyin ve
            sağdaki canlı önizlemede profilinizin nasıl görüneceğini anında
            takip edin.
          </p>
        </div>
        <div className="apply-trust-pills" aria-label="Başvuru güvenceleri">
          <span>
            <Clock size={15} aria-hidden="true" /> ~3 dakikada adım adım kurulum
          </span>
          <span>
            <ShieldCheck size={15} aria-hidden="true" /> Yönetici incelemesi
            sonrası yayın
          </span>
          <span>
            <Sparkles size={15} aria-hidden="true" /> Hazır etiketlerle hızlı
            seçim
          </span>
        </div>
      </div>

      <div className="apply-workspace">
        <div className="apply-form-col">
          <ProfileForm
            wizardMode
            onDraftChange={setDraft}
            label="Başvuruyu tamamla ve gönder"
            onSubmit={async (profil, form) => {
              if (!profil.formatlar.length)
                throw new Error("En az bir görüşme şekli seçin.");
              const status = await api<{ musait: boolean }>(
                `/oturum/kullanici-adi/${encodeURIComponent(username)}`,
              );
              if (!status.musait)
                throw new Error(
                  "Bu profil adresi alındı. Başka bir adres seçin.",
                );
              const data = await api<MfaSonucu>("/oturum/basvuru", {
                method: "POST",
                body: JSON.stringify({
                  profil,
                  email: form.get("email"),
                  parola: form.get("parola"),
                  kullanici_adi: username,
                }),
              });
              setResult(data);
              window.scrollTo(0, 0);
            }}
          >
            <section className="form-section apply-account-section">
              <div className="apply-section-head">
                <div>
                  <h2>1. Profil adresiniz ve hesap bilgileriniz</h2>
                  <p className="muted">
                    Danışanlarla paylaşacağınız kalıcı adresinizi belirleyin ve
                    giriş bilgilerinizi oluşturun.
                  </p>
                </div>
                {draft?.ad && !username && (
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => setUsername(slugifyTurkishName(draft.ad))}
                  >
                    <Sparkles size={14} aria-hidden="true" /> Adımdan adres üret
                  </button>
                )}
              </div>

              {initialSlug && username === initialSlug && (
                <div className="apply-claimed-banner" role="status">
                  <Sparkles size={16} aria-hidden="true" />
                  <span>
                    Seçtiğiniz <strong>terapist.co/{initialSlug}</strong> adresi
                    başvurunuza aktarıldı.
                  </span>
                </div>
              )}

              <UsernameField
                value={username}
                onChange={setUsername}
                onAvailabilityChange={setUsernameAvailable}
              />

              <div className="form-grid">
                <label className="field">
                  <span>
                    E-posta adresi{" "}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="ornek@eposta.com"
                    required
                    maxLength={254}
                  />
                </label>
                <div className="field">
                  <label htmlFor="apply-password-input">
                    Parola (en az 14 karakter){" "}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="password-input-wrap">
                    <input
                      id="apply-password-input"
                      name="parola"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="En az 14 karakterli güçlü parola"
                      required
                      minLength={14}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      aria-label={
                        showPassword ? "Parolayı gizle" : "Parolayı göster"
                      }
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <div className="password-meter" aria-live="polite">
                    <progress
                      className={`lt-progress-bar${password.length >= 14 ? " is-strong" : ""}`}
                      max={100}
                      value={Math.min(
                        100,
                        Math.round((password.length / 14) * 100),
                      )}
                    />
                    <small>
                      {password.length === 0
                        ? "Güvenliğiniz için en az 14 karakter kullanın."
                        : password.length < 14
                          ? `${14 - password.length} karakter daha ekleyin (${password.length}/14)`
                          : "Parola uzunluğu uygun ✓"}
                    </small>
                  </div>
                </div>
              </div>
              <p className="muted small">
                E-posta adresiniz yalnızca giriş ve bildirimler için kullanılır;
                herkese açık profilinizde gösterilmez.
              </p>
            </section>
          </ProfileForm>
        </div>

        <aside
          className="apply-preview-col"
          aria-label="Canlı profil önizlemesi"
        >
          <div className="apply-preview-sticky">
            <div className="apply-preview-card">
              <div className="apply-preview-urlbar">
                <Globe size={14} aria-hidden="true" />
                <span>
                  terapist.co/
                  <strong>{username || "ardaekintuncay"}</strong>
                </span>
                <span
                  className={`preview-live-pill${usernameAvailable ? " ok" : ""}`}
                >
                  {usernameAvailable ? "Adres Müsait" : "Canlı Önizleme"}
                </span>
              </div>

              <div className="apply-preview-identity">
                <Avatar
                  ad={draft?.ad || "Uzman"}
                  src={draft?.profil_fotografi_url || ""}
                  large
                />
                <div className="apply-preview-titles">
                  <span className="preview-verified-tag">
                    <CheckCircle2 size={12} aria-hidden="true" /> Doğrulanmış
                    Uzman Önizlemesi
                  </span>
                  <h3>{draft?.ad || "Adınız ve Soyadınız"}</h3>
                  <p className="preview-role">
                    {draft?.unvan || "Mesleki Unvanınız (Örn. Klinik Psikolog)"}
                  </p>
                  <p className="preview-loc">
                    <MapPin size={13} aria-hidden="true" />
                    {draft?.sehir
                      ? `${draft.sehir}${draft.ilce ? ` · ${draft.ilce}` : ""}`
                      : "Şehir · İlçe"}
                  </p>
                </div>
              </div>

              <p className="apply-preview-bio">
                {draft?.biyografi
                  ? draft.biyografi.slice(0, 160) +
                    (draft.biyografi.length > 160 ? "…" : "")
                  : "Hakkınızda bölümü burada görünür. Danışanların çalışma biçiminizi ve uzmanlık odağınızı ilk bakışta anlamasına yardımcı olur."}
              </p>

              <div className="apply-preview-chips">
                {(draft?.uzmanliklar?.length
                  ? draft.uzmanliklar.slice(0, 4)
                  : ["Kaygı / Anksiyete", "İlişki Sorunları", "Özdeğer"]
                ).map((tag) => (
                  <span key={tag} className="preview-chip">
                    {tag}
                  </span>
                ))}
                {(draft?.ekoller?.length
                  ? draft.ekoller.slice(0, 2)
                  : ["BDT", "Şema Terapi"]
                ).map((ekol) => (
                  <span key={ekol} className="preview-chip subtle">
                    {ekol}
                  </span>
                ))}
              </div>

              <div className="apply-preview-footer">
                <div>
                  <small>Görüşme Ücreti</small>
                  <strong className="tabular-num">
                    {draft?.ucret ? `₺${draft.ucret}` : "₺—"}
                  </strong>
                  <span> · {draft?.seans_suresi_dakika || 60} dk</span>
                </div>
                <div className="preview-schedule-pill">
                  <CalendarCheck2 size={14} aria-hidden="true" />
                  <span>
                    {draft?.calisma_saatleri?.length
                      ? `Haftada ${draft.calisma_saatleri.length} gün açık`
                      : "Takvim bekleniyor"}
                  </span>
                </div>
              </div>
            </div>

            <div className="apply-Checklist-card">
              <div className="apply-checklist-head">
                <strong>Profil Tamamlanma Durumu</strong>
                <span className="tabular-num">%{completionPct}</span>
              </div>
              <progress
                className="lt-progress-bar is-strong"
                max={100}
                value={completionPct}
                aria-hidden="true"
              />
              <ul className="apply-checklist-items">
                {checks.map((item) => (
                  <li key={item.label} className={item.done ? "done" : ""}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
