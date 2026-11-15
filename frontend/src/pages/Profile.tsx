import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  Globe2,
  GraduationCap,
  Instagram,
  Linkedin,
  MapPin,
  MessageSquare,
  Network,
  Palette,
  Pencil,
  QrCode,
  ShieldCheck,
  Tags,
  UserPlus,
  Video,
  X,
  Youtube,
} from "lucide-react";
import {
  AlinanTavsiyeler,
  api,
  Aydinlatma,
  BaglantiDurumu,
  BaglantiTuru,
  MeslekiAg,
  MeslektasBaglami,
  MeslektasUzmanlikOzeti,
  Profil,
  PublicTavsiyeler,
  TemaAyarlari,
  para,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../lib/auth";
import { Status } from "../components/Status";
import { Avatar } from "../components/Avatar";
import { ProfileLocation } from "../components/ProfileLocation";
import { ProfileResources } from "../components/ProfileResources";
import { AppointmentCalendar } from "../components/AppointmentCalendar";
import { WaitlistModal } from "../components/WaitlistModal";
import { ProfileQrCard } from "../components/ProfileQrCard";
import { olayBildir, profilGoruntulemeBildir } from "../lib/analytics";

const peerContexts: Array<{ value: MeslektasBaglami; label: string }> = [
  { value: "worked_together", label: "Birlikte çalıştık" },
  { value: "same_training_program", label: "Aynı eğitim programındaydık" },
  {
    value: "supervision_context",
    label: "Süpervizyon ortamından tanıyorum",
  },
  { value: "referred_client_to", label: "Kendisine danışan yönlendirdim" },
  { value: "received_client_referral", label: "Bana danışan yönlendirdi" },
  {
    value: "follows_professional_work",
    label: "Profesyonel çalışmalarını takip ediyorum",
  },
];

function PeerSpecialtyAction({
  therapistId,
  specialties,
  onCreated,
}: {
  therapistId: string;
  specialties: string[];
  onCreated: () => void;
}) {
  const ownProfile = useApi<Profil>("/uzman/profil");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [context, setContext] = useState<MeslektasBaglami>();
  const [specialty, setSpecialty] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (
    ownProfile.loading ||
    ownProfile.error ||
    ownProfile.data?.id === therapistId
  )
    return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || !specialty) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/uzmanlar/${therapistId}/meslektas-uzmanliklari`, {
        method: "POST",
        body: JSON.stringify({
          profesyonel_baglam: context,
          uzmanlik: specialty,
        }),
      });
      setStep(0);
      setContext(undefined);
      setSpecialty("");
      setMessage("Alan ilişkilendirmeniz kaydedildi.");
      onCreated();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="peer-specialty-action">
      {step === 0 && (
        <button
          className="button secondary"
          type="button"
          onClick={() => setStep(1)}
        >
          <Tags size={17} /> Mesleki ilişkilendirme ekle
        </button>
      )}
      {step > 0 && (
        <form onSubmit={submit}>
          {step === 1 ? (
            <fieldset className="peer-contexts">
              <legend>Bu terapisti hangi bağlamda tanıyorsunuz?</legend>
              <p className="muted small">
                Bu kayıt bir kalite değerlendirmesi değildir; yalnız mesleki
                ilişkinizin bağlamını belirtir.
              </p>
              {peerContexts.map((item) => (
                <label key={item.value}>
                  <input
                    type="radio"
                    name="peer-context"
                    checked={context === item.value}
                    onChange={() => setContext(item.value)}
                  />
                  {item.label}
                </label>
              ))}
              <div className="peer-action-buttons">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setStep(0)}
                >
                  Vazgeç
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={!context}
                  onClick={() => setStep(2)}
                >
                  Alan seç
                </button>
              </div>
            </fieldset>
          ) : (
            <div>
              <label className="field">
                Hangi çalışma alanıyla ilişkilendirirsiniz?
                <select
                  value={specialty}
                  onChange={(event) => setSpecialty(event.target.value)}
                  required
                >
                  <option value="">Alan seçin</option>
                  {specialties.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="peer-action-buttons">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  Geri
                </button>
                <button className="button" type="submit" disabled={busy}>
                  {busy ? "Kaydediliyor…" : "İlişkilendir"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function ConnectionAction({ therapistId }: { therapistId: string }) {
  const types = useApi<BaglantiTuru[]>("/baglanti-turleri");
  const connection = useApi<BaglantiDurumu>(
    `/uzmanlar/${therapistId}/baglanti-durumu`,
  );
  const [open, setOpen] = useState(false);
  const [relation, setRelation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (connection.loading) return <Status loading />;
  if (connection.error)
    return <Status error={connection.error} retry={connection.reload} />;
  if (connection.data?.durum === "self") return null;
  if (connection.data?.durum === "accepted")
    return <p className="notice">Bu terapistle mesleki bağlantınız var.</p>;
  if (connection.data?.durum === "pending")
    return (
      <p className="notice">
        {connection.data.baglanti?.yon === "incoming"
          ? "Bu terapistin bağlantı isteği panelinizde yanıt bekliyor."
          : "Mesleki bağlantı isteğiniz yanıt bekliyor."}
      </p>
    );
  if (connection.data?.durum === "rejected")
    return <p className="muted small">Bu bağlantı isteği kabul edilmedi.</p>;
  return (
    <div className="connection-action">
      {!open ? (
        <button className="button secondary" onClick={() => setOpen(true)}>
          <UserPlus size={17} /> Mesleki bağlantı kur
        </button>
      ) : (
        <form
          className="connection-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!relation) return;
            setBusy(true);
            setMessage("");
            try {
              await api(`/uzmanlar/${therapistId}/baglanti`, {
                method: "POST",
                body: JSON.stringify({ iliski_turu: relation }),
              });
              setOpen(false);
              setMessage("Mesleki bağlantı isteği gönderildi.");
              connection.reload();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Bu terapisti hangi bağlamda tanıyorsunuz?
            <select
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              required
            >
              <option value="">İlişki türü seçin</option>
              {types.data?.map((type) => (
                <option value={type.slug} key={type.slug}>
                  {type.ad}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-fields">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Gönderiliyor…" : "İstek gönder"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => setOpen(false)}
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function OwnerEmpty({
  title,
  children,
  to = "/panel?sekme=profil",
  action = "Bilgilerimi düzenle",
}: {
  title: string;
  children: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="bento-owner-empty">
      <strong>{title}</strong>
      <p>{children}</p>
      <Link className="button secondary" to={to}>
        <Pencil size={16} aria-hidden="true" /> {action}
      </Link>
    </div>
  );
}

const socialLabels: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  website: "Web sitesi",
};

function SocialIcon({ kind }: { kind: string }) {
  if (kind === "instagram") return <Instagram size={20} aria-hidden="true" />;
  if (kind === "linkedin") return <Linkedin size={20} aria-hidden="true" />;
  if (kind === "youtube") return <Youtube size={20} aria-hidden="true" />;
  if (kind === "website") return <Globe2 size={20} aria-hidden="true" />;
  return (
    <span aria-hidden="true" className="social-x">
      X
    </span>
  );
}

export function ProfileHeroIdentity({
  profile: p,
  endorsedBy,
  isOwner,
  hideBrand = false,
  onOpenQr,
  onOpenEndorsed,
}: {
  profile: Profil;
  endorsedBy?: AlinanTavsiyeler;
  isOwner: boolean;
  hideBrand?: boolean;
  onOpenQr: () => void;
  onOpenEndorsed?: () => void;
}) {
  const [verifiedOpen, setVerifiedOpen] = useState(false);
  const nameRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verifiedOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        nameRowRef.current &&
        !nameRowRef.current.contains(event.target as Node)
      ) {
        setVerifiedOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVerifiedOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [verifiedOpen]);

  const initials = p.ad
    .replace(/Dr\.|Uzm\.|Psk\.|Kln\./g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  const socials = Object.entries(p.sosyal_baglantilar ?? {}).filter(([, url]) =>
    url?.startsWith("https://"),
  );
  const isFounding = p.kurucu_no !== null && p.kurucu_no !== undefined;
  const foundingCode = isFounding ? String(p.kurucu_no).padStart(4, "0") : "";
  const showQrControl = p.onayli || isOwner;

  return (
    <section
      className="bento-card bento-identity"
      aria-labelledby="profile-name"
    >
      {(!hideBrand || showQrControl) && (
        <div className="bento-identity-bar">
          {!hideBrand ? (
            <Link
              className="profile-brand-mark"
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Terapist.co ana sayfası (yeni sekmede açılır)"
              title="Terapist.co"
            >
              <img
                className="profile-brand-icon"
                src="/brand/terapistco-icon.png"
                alt="Terapist.co"
                width="32"
                height="32"
                decoding="async"
              />
            </Link>
          ) : (
            <span className="profile-brand-spacer" aria-hidden="true" />
          )}
          {showQrControl && (
            <button
              type="button"
              className="profile-corner-qr"
              onClick={onOpenQr}
              aria-label="QR kodu ve masa kartını aç"
              title="QR Kart ve Paylaşım"
            >
              <QrCode size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <div className="bento-identity-top">
        <div className="bento-avatar-stack">
          <div
            className={`bento-avatar${isFounding ? " is-founding" : ""}${p.onayli ? " is-verified" : ""}`}
          >
            <Avatar ad={p.ad} src={p.profil_fotografi_url} large />
            {p.profil_fotografi_url && !isFounding && (
              <span
                className="avatar-initials"
                aria-label={`${initials} baş harfleri`}
              >
                {initials}
              </span>
            )}
            {isFounding && (
              <span
                className="founding-ring-badge"
                aria-label={`Founding Therapist #${foundingCode}`}
                title={`Founding Therapist #${foundingCode}`}
              >
                <Award size={12} aria-hidden="true" />
                <span>Founding #{foundingCode}</span>
              </span>
            )}
          </div>
          {socials.length > 0 && (
            <nav
              className="profile-avatar-socials"
              aria-label="Uzmanın sosyal bağlantıları"
            >
              {socials.map(([kind, url]) => (
                <a
                  key={kind}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  aria-label={`${socialLabels[kind]} (yeni sekme)`}
                  title={socialLabels[kind]}
                >
                  <SocialIcon kind={kind} />
                </a>
              ))}
            </nav>
          )}
        </div>
        {!p.onayli && (
          <div className="bento-trust">
            <span className="muted small">Profil inceleme aşamasında</span>
          </div>
        )}
        {p.ekoller.length > 0 && (
          <div className="bento-approaches" aria-label="Terapi yaklaşımları">
            {p.ekoller.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
      </div>
      <div
        ref={nameRowRef}
        className={`profile-name-row${p.onayli ? " has-verified" : ""}`}
      >
        <h1 id="profile-name">
          <span className="profile-name-text">{p.ad}</span>
          {p.onayli && (
            <span
              className={`verified-inline-wrap${verifiedOpen ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="verified-inline-trigger"
                aria-label="Doğrulanmış klinik psikolog bilgisi"
                aria-expanded={verifiedOpen}
                onClick={() => setVerifiedOpen((open) => !open)}
              >
                <BadgeCheck size={18} aria-hidden="true" />
              </button>
              <span className="verified-tooltip" role="tooltip">
                <strong>Doğrulanmış Uzman</strong>
                <span>
                  Diploması ve klinik yeterlilik belgeleri Terapist.co
                  tarafından doğrulanmıştır.
                </span>
              </span>
            </span>
          )}
        </h1>
      </div>
      {p.unvan && <p className="professional-title">{p.unvan}</p>}
      <p className="bento-meta">
        <MapPin size={16} aria-hidden="true" /> {p.sehir}
        {p.ilce ? `, ${p.ilce}` : ""} · {p.deneyim_yili} yıl deneyim
      </p>
      {p.formatlar.length > 0 && (
        <p className="bento-meta">
          <Video size={16} aria-hidden="true" /> {p.formatlar.join(" & ")}
        </p>
      )}
      <p className="link-profile-intro">
        {p.biyografi.length > 125
          ? `${p.biyografi.slice(0, 125).trimEnd()}…`
          : p.biyografi}
      </p>
      {endorsedBy && endorsedBy.toplam > 0 && (
        <button
          type="button"
          className="endorsed-by-pill"
          onClick={onOpenEndorsed}
          aria-label={`${endorsedBy.toplam} Meslektaşı öneriyor, listeyi aç`}
        >
          <span className="endorsed-avatar-stack" aria-hidden="true">
            {endorsedBy.oneriler.slice(0, 4).map((peer) => (
              <span className="endorsed-avatar-item" key={peer.id}>
                <Avatar ad={peer.ad} src={peer.profil_fotografi_url} />
              </span>
            ))}
          </span>
          <span className="endorsed-by-copy">
            <strong>{endorsedBy.toplam} Meslektaşı öneriyor</strong>
          </span>
        </button>
      )}
      <div className="link-profile-actions">
        <a className="button" href="#randevu">
          Randevu Al <ArrowRight size={17} aria-hidden="true" />
        </a>
        <a className="button secondary" href="#baglantilar">
          Bağlantılarım
        </a>
        {(p.onayli || isOwner) && (
          <button
            type="button"
            className="button secondary profile-qr-trigger"
            onClick={onOpenQr}
            aria-label="QR kodu ve masa kartını aç"
          >
            <QrCode size={17} aria-hidden="true" />
            <span>QR Kart</span>
          </button>
        )}
      </div>
      {isOwner && (
        <div className="link-profile-owner-bar">
          <Link className="link-profile-edit" to="/panel?sekme=profil">
            <Pencil size={16} aria-hidden="true" /> Profilimi düzenle
          </Link>
          <Link className="link-profile-edit" to="/panel?sekme=gorunum">
            <Palette size={16} aria-hidden="true" /> Görünüm &amp; Tema
          </Link>
        </div>
      )}
    </section>
  );
}

export function resolveSafeBackgroundImageUrl(
  rawUrl: string | null | undefined,
  failed = false,
): string {
  const trimmed = rawUrl?.trim() ?? "";
  if (failed || !trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
}

export function Profile() {
  const { id, username } = useParams();
  const location = useLocation();
  const preview = location.pathname === "/panel/onizleme";
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const initialProfile = useMemo(() => {
    if (preview || !username || typeof document === "undefined")
      return undefined;
    const text = document.getElementById("root")?.getAttribute("data-profile");
    if (!text) return undefined;
    try {
      const data = JSON.parse(text) as Profil;
      return data.kullanici_adi === username ? data : undefined;
    } catch {
      return undefined;
    }
  }, [preview, username]);
  const profile = useApi<Profil>(
    preview
      ? "/uzman/profil"
      : username
        ? `/uzmanlar/kullanici-adi/${encodeURIComponent(username)}`
        : id
          ? `/uzmanlar/${id}`
          : null,
    undefined,
    initialProfile,
  );
  const p = profile.data;
  const therapistId = p?.id ?? id;
  const slots = useApi<{ saatler: string[] }>(
    therapistId && p?.onayli ? `/uzmanlar/${therapistId}/saatler` : null,
  );
  const recommendations = useApi<PublicTavsiyeler>(
    therapistId && p?.onayli ? `/uzmanlar/${therapistId}/tavsiyeler` : null,
  );
  const network = useApi<MeslekiAg>(
    therapistId && p?.onayli ? `/uzmanlar/${therapistId}/baglantilar` : null,
  );
  const peerSpecialties = useApi<MeslektasUzmanlikOzeti>(
    therapistId && p?.onayli
      ? `/uzmanlar/${therapistId}/meslektas-uzmanliklari`
      : null,
  );
  const ownProfile = useApi<Profil>(
    user?.rol === "uzman" && !preview ? "/uzman/profil" : null,
  );
  const isOwner = preview || Boolean(p && ownProfile.data?.id === p.id);
  const theme = useApi<TemaAyarlari>(
    preview || isOwner
      ? "/uzman/tema"
      : therapistId && p?.onayli
        ? `/uzmanlar/${therapistId}/tema`
        : null,
  );
  const endorsedBy = useApi<AlinanTavsiyeler>(
    therapistId && p?.onayli
      ? `/uzmanlar/${therapistId}/alinan-tavsiyeler`
      : null,
  );
  const legal = useApi<Aydinlatma>("/aydinlatma");
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [endorsedModalOpen, setEndorsedModalOpen] = useState(false);
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bookingInView, setBookingInView] = useState(false);
  const [bgImageFailed, setBgImageFailed] = useState(false);
  const rawBgImageUrl = theme.data?.arka_plan_gorseli_url?.trim() ?? "";

  useEffect(() => {
    setBgImageFailed(false);
  }, [rawBgImageUrl]);

  const bgImageUrl = resolveSafeBackgroundImageUrl(
    rawBgImageUrl,
    bgImageFailed,
  );

  useEffect(() => {
    setChosen("");
    setSuccess("");
    setError("");
    setBioExpanded(false);
    setWaitlistOpen(false);
    setQrOpen(false);
    setEndorsedModalOpen(false);
  }, [therapistId]);
  useEffect(() => {
    if (!p || preview || id || !username || !ready) return;
    if (user?.rol === "uzman" && ownProfile.loading) return;
    if (isOwner) return;
    profilGoruntulemeBildir({
      id: p.id,
      ad: p.ad,
      kullanici_adi: p.kullanici_adi,
    });
  }, [
    p?.id,
    p?.ad,
    p?.kullanici_adi,
    preview,
    id,
    username,
    ready,
    user?.rol,
    ownProfile.loading,
    isOwner,
  ]);
  useEffect(() => {
    if (id && p?.kullanici_adi)
      navigate(`/${p.kullanici_adi}`, { replace: true });
  }, [id, p?.kullanici_adi, navigate]);
  useEffect(() => {
    if (!p) return;
    if (preview) {
      document.title = `Profil önizlemesi · ${p.ad} | terapist.co`;
      return;
    }
    document.title = `${p.ad} · ${p.unvan || "Terapist"} | terapist.co`;
    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${window.location.origin}/${p.kullanici_adi}`;
    return () => canonical?.remove();
  }, [p, preview]);
  useEffect(() => {
    const booking = document.getElementById("randevu");
    if (!booking || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setBookingInView(entry.isIntersecting),
      { threshold: 0.12 },
    );
    observer.observe(booking);
    return () => observer.disconnect();
  }, [therapistId, p?.id, ready, profile.loading]);
  useEffect(() => {
    if (!p || preview || isOwner) return;
    if (user?.rol === "uzman" && ownProfile.loading) return;
    const params = new URLSearchParams(location.search);
    if (params.get("utm_source") !== "qr") return;
    olayBildir("qr_scan", {
      uzman_id: p.id,
      uzman_kullanici_adi: p.kullanici_adi,
      sayfa_yolu: location.pathname,
    });
  }, [
    p?.id,
    p?.kullanici_adi,
    preview,
    isOwner,
    user?.rol,
    ownProfile.loading,
    location.search,
    location.pathname,
  ]);
  useEffect(() => {
    if (!p?.id || (!preview && !p.onayli && !isOwner)) return;
    const version = [
      theme.data?.tasarim_tarzi ?? "",
      theme.data?.tema_stili ?? "",
      theme.data?.vurgu_rengi ?? "",
      theme.data?.buton_stili ?? "",
      theme.data?.yazi_tipi ?? "",
      theme.data?.yuzey_stili ?? "",
    ].join("-");
    const href = preview
      ? `/api/uzman/tema.css?v=${encodeURIComponent(version)}`
      : `/api/uzmanlar/${p.id}/tema.css?v=${encodeURIComponent(version)}`;
    const linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = href;
    linkEl.dataset.therapistTheme = p.id;
    document.head.append(linkEl);
    return () => linkEl.remove();
  }, [
    p?.id,
    p?.onayli,
    preview,
    isOwner,
    theme.data?.tasarim_tarzi,
    theme.data?.tema_stili,
    theme.data?.vurgu_rengi,
    theme.data?.buton_stili,
    theme.data?.yazi_tipi,
    theme.data?.yuzey_stili,
  ]);
  const hideBrand = Boolean(theme.data?.marka_gizleme_etkin);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("terapist:whitelabel", {
        detail: {
          hidden: hideBrand && !preview,
          pathname: location.pathname,
        },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("terapist:whitelabel", {
          detail: { hidden: false },
        }),
      );
    };
  }, [hideBrand, preview, location.pathname]);
  useEffect(() => {
    if (!qrOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrOpen]);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen || !legal.data || !therapistId || isOwner) return;
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const result = await api<{ mesaj: string }>("/randevular", {
        method: "POST",
        body: JSON.stringify({
          uzman_id: therapistId,
          baslangic: chosen,
          ad: data.get("ad"),
          telefon: data.get("telefon"),
          aydinlatma_okundu: data.has("okundu"),
          aydinlatma_surumu: legal.data.surum,
        }),
      });
      setSuccess(result.mesaj);
      olayBildir("booking_submitted", {
        uzman_id: therapistId,
        uzman_kullanici_adi: p?.kullanici_adi,
      });
      form.reset();
      setChosen("");
      slots.reload();
    } catch (cause) {
      setError((cause as Error).message);
      setChosen("");
      slots.reload();
    } finally {
      setBusy(false);
    }
  }

  if (
    profile.loading ||
    profile.error ||
    !ready ||
    (user?.rol === "uzman" && !preview && ownProfile.loading)
  )
    return (
      <Status
        loading={profile.loading || !ready || ownProfile.loading}
        error={profile.error}
        retry={profile.reload}
      />
    );
  if (!p || !therapistId) return null;

  const hasEducation = Boolean(
    p.egitim_universite ||
    p.egitim_program ||
    p.egitim_derece ||
    p.egitim.length ||
    p.kurumlar.length,
  );
  const peerAreas = peerSpecialties.data?.alanlar ?? [];
  const maxPeerCount = Math.max(
    1,
    ...peerAreas.map((item) => item.meslektas_sayisi),
  );
  const canAssociate =
    user?.rol === "uzman" &&
    !isOwner &&
    (p.uzmanliklar.length > 0 || p.ekoller.length > 0);
  const showNetwork =
    isOwner ||
    user?.rol === "uzman" ||
    Boolean(network.data?.baglantilar.length);
  const showPeer = isOwner || canAssociate || peerAreas.length > 0;

  return (
    <section
      className="profile-page bento-profile link-profile"
      data-profile-id={p.id}
      data-design-style={theme.data?.tasarim_tarzi ?? "klinik_modern"}
      data-profile-theme={theme.data?.tema_stili ?? "klasik"}
      data-profile-button={theme.data?.buton_stili ?? "yuvarlak"}
      data-profile-font={theme.data?.yazi_tipi ?? "modern_sans"}
      data-profile-surface={theme.data?.yuzey_stili ?? "temiz"}
      data-has-bg-image={bgImageUrl ? "true" : "false"}
    >
      {bgImageUrl && (
        <div className="profile-viewport-backdrop" aria-hidden="true">
          <img
            className="profile-viewport-backdrop-img"
            src={bgImageUrl}
            alt=""
            decoding="async"
          />
          <span className="profile-viewport-backdrop-scrim" />
        </div>
      )}
      <div className="profile-stage">
        {bgImageUrl && (
          <div className="profile-stage-media" aria-hidden="true">
            <img
              className="profile-stage-bg-img"
              src={bgImageUrl}
              alt=""
              decoding="async"
              onError={() => setBgImageFailed(true)}
            />
            <span className="profile-stage-scrim" />
          </div>
        )}
        <div className="profile-stage-content">
          {preview && (
            <p className="notice" role="status">
              Bu yalnız size açık profil önizlemesidir. İnceleme tamamlanmadan
              danışanlara görünmez.
            </p>
          )}
          <div className="bento-layout">
            <div className="bento-left">
              <ProfileHeroIdentity
                profile={p}
                endorsedBy={endorsedBy.data}
                isOwner={isOwner}
                hideBrand={hideBrand && !preview}
                onOpenQr={() => setQrOpen(true)}
                onOpenEndorsed={() => setEndorsedModalOpen(true)}
              />
              <ProfileResources therapistId={therapistId} isOwner={isOwner} />

              <section
                className="bento-card bento-biography"
                aria-labelledby="bio-title"
              >
                <span className="eyebrow">HAKKIMDA</span>
                <h2 id="bio-title">Daha yakından tanıyın</h2>
                {p.ekoller.length > 0 && (
                  <p className="muted small">
                    Yaklaşımlar: {p.ekoller.join(" · ")}
                  </p>
                )}
                <p className="biography">
                  {bioExpanded || p.biyografi.length <= 360
                    ? p.biyografi
                    : `${p.biyografi.slice(0, 360).trimEnd()}…`}
                </p>
                {p.biyografi.length > 360 && (
                  <button
                    className="text-button"
                    type="button"
                    aria-expanded={bioExpanded}
                    onClick={() => setBioExpanded((value) => !value)}
                  >
                    {bioExpanded ? "Daha az göster" : "Devamını oku"}
                  </button>
                )}
                {p.terapi_yaklasimi ? (
                  <div className="bento-therapy-approach">
                    <h3>Terapi yaklaşımım</h3>
                    <p>{p.terapi_yaklasimi}</p>
                  </div>
                ) : isOwner ? (
                  <OwnerEmpty title="Yaklaşımınızı anlatın">
                    Terapide nasıl çalıştığınızı kendi sözlerinizle ekleyin.
                  </OwnerEmpty>
                ) : null}
              </section>
            </div>

            <WaitlistModal
              open={waitlistOpen}
              onClose={() => setWaitlistOpen(false)}
              therapistId={therapistId}
              therapistName={p.ad}
              therapistUsername={p.kullanici_adi}
              legalText={legal.data?.metin}
              legalVersion={legal.data?.surum}
            />

            {qrOpen && (
              <div
                className="tp-modal-backdrop"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setQrOpen(false);
                }}
              >
                <div
                  className="tp-modal-dialog tp-modal-qr"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="qr-modal-title"
                >
                  <button
                    type="button"
                    className="tp-modal-close"
                    aria-label="Kapat"
                    onClick={() => setQrOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                  <h2 id="qr-modal-title" className="sr-only">
                    {p.ad} QR kodu ve randevu kartı
                  </h2>
                  <ProfileQrCard
                    username={p.kullanici_adi}
                    therapistName={p.ad}
                    therapistTitle={p.unvan}
                    accentColor={theme.data?.vurgu_rengi}
                    hideBrand={hideBrand}
                  />
                </div>
              </div>
            )}

            {endorsedModalOpen &&
              endorsedBy.data &&
              endorsedBy.data.toplam > 0 && (
                <div
                  className="tp-modal-backdrop"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      setEndorsedModalOpen(false);
                    }
                  }}
                >
                  <div
                    className="tp-modal-dialog tp-modal-endorsed"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="endorsed-modal-title"
                  >
                    <button
                      type="button"
                      className="tp-modal-close"
                      aria-label="Kapat"
                      onClick={() => setEndorsedModalOpen(false)}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                    <span className="eyebrow">MESLEKTAŞ GÜVEN AĞI</span>
                    <h2 id="endorsed-modal-title">
                      Kendini öneren meslektaşları ({endorsedBy.data.toplam})
                    </h2>
                    <p className="muted small">
                      Meslektaş önerileri yalnızca klinik uzmanlık ağındaki
                      dayanışma ve güven bildirimleridir; puanlama veya sıralama
                      içermez.
                    </p>
                    <ul className="endorsed-by-grid">
                      {endorsedBy.data.oneriler.map((peer) => (
                        <li key={peer.id}>
                          <Link
                            className="endorsed-peer-card"
                            to={`/${peer.kullanici_adi}`}
                            onClick={() => setEndorsedModalOpen(false)}
                          >
                            <Avatar
                              ad={peer.ad}
                              src={peer.profil_fotografi_url}
                            />
                            <div className="endorsed-peer-info">
                              <strong>
                                {peer.ad}
                                <BadgeCheck
                                  size={14}
                                  className="verified-inline-icon"
                                  aria-label="Doğrulanmış uzman"
                                />
                              </strong>
                              <span>
                                {peer.unvan || "Klinik Psikolog"} · {peer.sehir}
                              </span>
                              {peer.uzmanlik && (
                                <span className="endorsed-peer-tag">
                                  {peer.uzmanlik}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            <details className="link-profile-more">
              <summary>
                <span className="professional-summary-main">
                  <span
                    className="professional-summary-icon"
                    aria-hidden="true"
                  >
                    <BadgeCheck size={24} />
                  </span>
                  <span className="professional-summary-copy">
                    <small>PROFESYONEL PROFİL</small>
                    <strong>Daha detaylı inceleyin</strong>
                    <span>
                      Uzmanın çalışma alanlarını, eğitimini ve mesleki bağlarını
                      keşfedin.
                    </span>
                  </span>
                </span>
                <span className="professional-summary-preview">
                  <span>
                    <Tags size={16} aria-hidden="true" /> Uzmanlık
                  </span>
                  <span>
                    <GraduationCap size={16} aria-hidden="true" /> Eğitim
                  </span>
                  <span>
                    <Network size={16} aria-hidden="true" /> Mesleki ağ
                  </span>
                </span>
                <span className="professional-summary-action">
                  <span className="professional-summary-action-closed">
                    Detayları görüntüle
                  </span>
                  <span className="professional-summary-action-open">
                    Detayları kapat
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </span>
              </summary>
              <div className="bento-grid">
                {(p.kitle.length > 0 ||
                  p.uzmanliklar.length > 0 ||
                  p.diller.length > 0 ||
                  isOwner) && (
                  <section
                    className="bento-card"
                    aria-labelledby="groups-title"
                  >
                    <span className="eyebrow">ÇALIŞMA ALANLARI</span>
                    <h2 id="groups-title">Kiminle, hangi konularda?</h2>
                    {p.kitle.length > 0 && (
                      <div className="bento-tag-group">
                        <h3>Danışan grupları</h3>
                        <div className="bento-tags">
                          {p.kitle.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.uzmanliklar.length > 0 && (
                      <div className="bento-tag-group">
                        <h3>Çalışma alanları</h3>
                        <div className="bento-tags">
                          {p.uzmanliklar.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.diller.length > 0 && (
                      <div className="bento-tag-group">
                        <h3>Görüşme dilleri</h3>
                        <p>{p.diller.join(" · ")}</p>
                      </div>
                    )}
                    {isOwner && !p.kitle.length && !p.uzmanliklar.length && (
                      <OwnerEmpty title="Çalışma alanlarınızı ekleyin">
                        Danışan gruplarınızı ve uzmanlık alanlarınızı görünür
                        kılın.
                      </OwnerEmpty>
                    )}
                  </section>
                )}

                {showPeer && (
                  <section className="bento-card" aria-labelledby="peer-title">
                    <span className="eyebrow">
                      MESLEKTAŞ İLİŞKİLENDİRMELERİ
                    </span>
                    <h2 id="peer-title">Meslektaşların tanıdığı alanlar</h2>
                    <p className="muted small">
                      Sayılar meslektaşların alan ilişkilendirmeleridir; kalite,
                      başarı veya klinik uygunluk puanı değildir.
                    </p>
                    <Status
                      loading={peerSpecialties.loading}
                      error={peerSpecialties.error}
                      retry={peerSpecialties.reload}
                    />
                    {peerAreas.length > 0 ? (
                      <ul className="bento-peer-list">
                        {peerAreas.map((item) => (
                          <li key={item.uzmanlik}>
                            <div>
                              <strong>{item.uzmanlik}</strong>
                              <span>{item.meslektas_sayisi} meslektaş</span>
                            </div>
                            <progress
                              value={item.meslektas_sayisi}
                              max={maxPeerCount}
                              aria-label={`${item.uzmanlik}: ${item.meslektas_sayisi} meslektaş`}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : isOwner && !peerSpecialties.loading ? (
                      <p className="muted">
                        Henüz meslektaş ilişkilendirmesi bulunmuyor.
                      </p>
                    ) : null}
                    {canAssociate && (
                      <PeerSpecialtyAction
                        therapistId={therapistId}
                        specialties={Array.from(
                          new Set([...p.uzmanliklar, ...p.ekoller]),
                        )}
                        onCreated={peerSpecialties.reload}
                      />
                    )}
                  </section>
                )}

                {(hasEducation || isOwner) && (
                  <section
                    id="egitim"
                    className="bento-card bento-education"
                    aria-labelledby="education-title"
                  >
                    <span className="eyebrow">MESLEKİ GEÇMİŞ</span>
                    <h2 id="education-title">Eğitim ve deneyim</h2>
                    {hasEducation ? (
                      <ol className="education-timeline">
                        {p.egitim_derece && (
                          <li>
                            <span>Derece</span>
                            <strong>{p.egitim_derece}</strong>
                          </li>
                        )}
                        {p.egitim_program && (
                          <li>
                            <span>Program</span>
                            <strong>{p.egitim_program}</strong>
                          </li>
                        )}
                        {p.egitim_universite && (
                          <li>
                            <span>Üniversite</span>
                            <strong>{p.egitim_universite}</strong>
                          </li>
                        )}
                        {p.egitim.map((item) => (
                          <li key={item}>
                            <span>Ek eğitim</span>
                            <strong>{item}</strong>
                          </li>
                        ))}
                        {p.kurumlar.map((item) => (
                          <li key={item}>
                            <span>Çalıştığı kurum</span>
                            <strong>{item}</strong>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <OwnerEmpty title="Eğitiminizi ekleyin">
                        Doğrulanabilir eğitim ve mesleki geçmiş bilgilerinizi
                        profilinizde paylaşın.
                      </OwnerEmpty>
                    )}
                  </section>
                )}

                {showNetwork && (
                  <section
                    className="bento-card bento-network"
                    aria-labelledby="network-title"
                  >
                    <span className="eyebrow">TERAPİST AĞI</span>
                    <h2 id="network-title">Mesleki bağlantılar</h2>
                    <Status
                      loading={network.loading}
                      error={network.error}
                      retry={network.reload}
                    />
                    {network.data && network.data.baglantilar.length > 0 ? (
                      <ul className="bento-colleagues">
                        {network.data.baglantilar.map((connection) => (
                          <li key={connection.id}>
                            <Link to={`/uzman/${connection.terapist.id}`}>
                              <Avatar ad={connection.terapist.ad} />
                              <span>
                                <strong>{connection.terapist.ad}</strong>
                                <small>{connection.iliski_adi}</small>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : isOwner && !network.loading ? (
                      <p className="muted">
                        Henüz görünür mesleki bağlantınız yok.
                      </p>
                    ) : null}
                    {user?.rol === "uzman" && !isOwner && (
                      <div className="connection-action-group">
                        <ConnectionAction therapistId={therapistId} />
                        <Link
                          className="button secondary"
                          to={`/panel?sekme=mesajlar&alici=${therapistId}`}
                        >
                          <MessageSquare size={17} aria-hidden="true" />
                          <span>Meslektaşa mesaj gönder</span>
                        </Link>
                      </div>
                    )}
                  </section>
                )}

                {recommendations.data && recommendations.data.toplam > 0 ? (
                  <section
                    className="bento-card bento-recommendations"
                    aria-labelledby="recommendations-title"
                  >
                    <span className="eyebrow">MESLEKTAŞ ÖNERİLERİ</span>
                    <h2 id="recommendations-title">
                      Çalışmadığım alanlarda önerdiklerim
                    </h2>
                    <p className="muted small">
                      Bunlar terapistin kendi mesleki önerileridir; klinik sonuç
                      garantisi değildir.
                    </p>
                    {recommendations.data.gruplar.map((group) => (
                      <div
                        className="recommendation-group"
                        key={group.uzmanlik}
                      >
                        <h3>{group.uzmanlik}</h3>
                        <div className="bento-colleagues">
                          {group.terapistler.map((therapist) => (
                            <Link
                              key={therapist.id}
                              to={`/uzman/${therapist.id}`}
                            >
                              <Avatar ad={therapist.ad} />
                              <span>{therapist.ad}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                ) : isOwner ? (
                  <section className="bento-card">
                    <OwnerEmpty
                      title="Meslektaş önerilerinizi ekleyin"
                      to="/panel?sekme=tavsiyeler"
                      action="Önerilerimi düzenle"
                    >
                      Çalışmadığınız konularda önerdiğiniz terapistleri çalışma
                      alanınızdan seçin.
                    </OwnerEmpty>
                  </section>
                ) : null}
                {recommendations.error && (
                  <Status
                    error={recommendations.error}
                    retry={recommendations.reload}
                  />
                )}

                {p.formatlar.includes("Yüz yüze") && (
                  <div className="bento-card bento-location">
                    <ProfileLocation profile={p} />
                  </div>
                )}
              </div>
            </details>
            <aside
              id="randevu"
              className="booking-panel bento-booking"
              aria-labelledby="booking-title"
            >
              <span className="eyebrow">RANDEVU</span>
              <h2 id="booking-title">Randevu Al</h2>
              <div className="booking-price">
                {para(p.ucret)}
                <span> / görüşme · {p.seans_suresi_dakika} dakika</span>
              </div>
              <p className="muted small">
                Uygun saatler Türkiye saatine göredir. Talebiniz uzman
                tarafından değerlendirilir; seçim kesin randevu değildir.
              </p>
              <Status
                loading={slots.loading}
                error={slots.error}
                retry={slots.reload}
              />
              {isOwner ? (
                <p className="notice">
                  {p.onayli
                    ? "Danışanlar burada uygun saatleri seçerek size randevu talebi gönderebilir."
                    : "Profiliniz yayınlandıktan sonra danışanlar burada uygun saatlerden randevu talebi gönderebilir."}
                </p>
              ) : success ? (
                <div className="notice" role="status">
                  <ShieldCheck size={20} aria-hidden="true" />
                  <p>{success}</p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setSuccess("")}
                  >
                    Yeni talep oluştur
                  </button>
                </div>
              ) : (
                <AppointmentCalendar
                  key={therapistId}
                  slots={slots.data?.saatler ?? []}
                  chosen={chosen}
                  onChoose={(slot) => {
                    setChosen(slot);
                    if (slot) {
                      olayBildir("booking_drawer_open", {
                        uzman_id: therapistId,
                        uzman_kullanici_adi: p.kullanici_adi,
                      });
                    }
                  }}
                  onSubmit={book}
                  busy={busy}
                  error={error}
                  legalText={legal.data?.metin}
                  legalReady={Boolean(legal.data)}
                  waitlistOpen={theme.data?.bekleme_listesi_acik ?? true}
                  onOpenWaitlist={() => setWaitlistOpen(true)}
                />
              )}
            </aside>
            {!isOwner && (
              <a
                className={`mobile-booking-widget ${bookingInView ? "is-hidden" : ""}`}
                href="#randevu"
                aria-label="Randevu alma bölümüne git"
                aria-hidden={bookingInView}
                tabIndex={bookingInView ? -1 : undefined}
              >
                <CalendarDays size={17} aria-hidden="true" />
                <span>Randevu Al</span>
              </a>
            )}
          </div>
          {(!hideBrand || preview) && (
            <div className="profile-standalone-badge">
              <Link
                className="profile-powered-pill"
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Terapist.co ile kendi profilini oluştur (yeni sekmede açılır)"
              >
                <img
                  className="profile-powered-icon"
                  src="/brand/terapistco-icon.png"
                  alt=""
                  width="18"
                  height="18"
                  decoding="async"
                  aria-hidden="true"
                />
                <span>terapist.co/{p.kullanici_adi}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
