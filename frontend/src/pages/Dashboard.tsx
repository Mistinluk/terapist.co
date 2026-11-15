import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Ban,
  Bell,
  BellPlus,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Flag,
  HeartHandshake,
  Link2,
  LockKeyhole,
  Mail,
  MessageSquare,
  Palette,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserPlus,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  BaglantiOzeti,
  BeklemeListesiKaydi,
  DanisanYonlendirme,
  Davet,
  DavetOzeti,
  Profil,
  ProfesyonelBaglanti,
  Randevu,
  TavsiyeEdilenTerapist,
  UzmanBildirimlerYaniti,
  TavsiyeOzeti,
  YonlendirmeNedeni,
  YonlendirmeTerapisti,
  WebsiteRozetiOzeti,
  tarih,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import { ProfileForm, ProfileSectionTab } from "../components/ProfileForm";
import { ProfileResources } from "../components/ProfileResources";
import { GrowthAnalytics } from "../components/GrowthAnalytics";
import { PrivacyModeration } from "../components/PrivacyModeration";
import { TherapistTrafficAnalytics } from "../components/TherapistTrafficAnalytics";
import { ThemeCustomizer } from "../components/ThemeCustomizer";
import { NotificationsAndMessages } from "../components/NotificationsAndMessages";

const statuses: Record<string, string> = {
  bekliyor: "Onay bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal edildi",
};

const inviteStatuses: Record<Davet["durum"], string> = {
  pending: "Kabul bekliyor",
  accepted: "Kabul edildi",
  expired: "Süresi doldu",
  revoked: "İptal edildi",
};

const referralReasons: Array<{ value: YonlendirmeNedeni; label: string }> = [
  { value: "schedule_full", label: "Takvimim dolu" },
  { value: "outside_specialty", label: "Uzmanlık alanım dışında" },
  { value: "age_group", label: "Yaş grubu" },
  { value: "location", label: "Konum" },
  { value: "budget", label: "Bütçe" },
  { value: "therapy_format", label: "Görüşme formatı" },
  { value: "psychiatry", label: "Psikiyatri yönlendirmesi" },
  { value: "other", label: "Diğer" },
];

const referralReasonLabel = (value: YonlendirmeNedeni) =>
  referralReasons.find((item) => item.value === value)?.label ?? value;

function ConnectionRow({
  connection,
  onReport,
  onBlock,
}: {
  connection: ProfesyonelBaglanti;
  onReport?: (connection: ProfesyonelBaglanti) => void;
  onBlock?: (connection: ProfesyonelBaglanti) => void;
}) {
  return (
    <article className="network-row">
      <div>
        <h3>
          <Link to={`/uzman/${connection.terapist.id}`}>
            {connection.terapist.ad}
          </Link>
        </h3>
        <p>{connection.iliski_adi}</p>
      </div>
      <div className="network-row-actions">
        <Link className="text-button" to={`/uzman/${connection.terapist.id}`}>
          Profili gör
        </Link>
        <Link
          className="text-button"
          to={`/panel?sekme=mesajlar&alici=${connection.terapist.id}`}
        >
          <MessageSquare size={15} aria-hidden="true" /> Mesaj gönder
        </Link>
        {onReport && (
          <button
            className="icon-text-button"
            type="button"
            onClick={() => onReport(connection)}
          >
            <Flag size={15} /> Bildir
          </button>
        )}
        {onBlock && (
          <button
            className="icon-text-button danger-text"
            type="button"
            onClick={() => onBlock(connection)}
          >
            <Ban size={15} /> Engelle
          </button>
        )}
      </div>
    </article>
  );
}

function ProfessionalNetwork() {
  const network = useApi<BaglantiOzeti>("/uzman/baglantilar");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function respond(id: string, durum: "accepted" | "rejected") {
    setBusy(id);
    setMessage("");
    try {
      await api(`/uzman/baglanti-istekleri/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ durum }),
      });
      setMessage(
        durum === "accepted"
          ? "Mesleki bağlantı kabul edildi."
          : "Mesleki bağlantı isteği reddedildi.",
      );
      network.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function report(connection: ProfesyonelBaglanti) {
    if (
      !window.confirm(
        `${connection.terapist.ad} ile bağlantı moderasyona bildirilsin mi?`,
      )
    )
      return;
    setBusy(connection.id);
    try {
      await api(`/uzman/baglantilar/${connection.id}/rapor`, {
        method: "POST",
        body: JSON.stringify({ aciklama: "Mesleki bağlantı bildirimi" }),
      });
      setMessage("Bağlantı moderasyon incelemesine gönderildi.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function block(connection: ProfesyonelBaglanti) {
    if (
      !window.confirm(
        `${connection.terapist.ad} engellensin mi? Mevcut mesleki ilişki kaldırılır.`,
      )
    )
      return;
    setBusy(connection.id);
    try {
      await api(`/uzman/engeller/${connection.terapist.id}`, {
        method: "POST",
        body: "{}",
      });
      await network.reload();
      setMessage("Kullanıcı engellendi ve mevcut mesleki ilişki kaldırıldı.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="narrow-content professional-network-panel">
      <Status
        loading={network.loading}
        error={network.error}
        retry={network.reload}
      />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {network.data && (
        <>
          <section className="network-section" aria-labelledby="gelen-istekler">
            <div className="network-heading">
              <div>
                <span className="eyebrow">YANITINIZ BEKLENİYOR</span>
                <h2 id="gelen-istekler">Gelen bağlantı istekleri</h2>
              </div>
              <strong aria-label="Gelen istek sayısı">
                {network.data.gelen_istekler.length}
              </strong>
            </div>
            {network.data.gelen_istekler.length === 0 ? (
              <p className="empty-state">Bekleyen bağlantı isteğiniz yok.</p>
            ) : (
              <div className="network-list">
                {network.data.gelen_istekler.map((connection) => (
                  <article
                    className="network-row request-row"
                    key={connection.id}
                  >
                    <div>
                      <h3>
                        <Link to={`/uzman/${connection.terapist.id}`}>
                          {connection.terapist.ad}
                        </Link>
                      </h3>
                      <p>{connection.iliski_adi}</p>
                    </div>
                    <div className="actions">
                      <button
                        className="button"
                        type="button"
                        disabled={busy === connection.id}
                        onClick={() => respond(connection.id, "accepted")}
                      >
                        <Check size={16} /> Kabul et
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        disabled={busy === connection.id}
                        onClick={() => respond(connection.id, "rejected")}
                      >
                        <X size={16} /> Reddet
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="network-section" aria-labelledby="baglantilarim">
            <div className="network-heading">
              <div>
                <span className="eyebrow">MESLEKİ AĞINIZ</span>
                <h2 id="baglantilarim">Profesyonel bağlantılar</h2>
              </div>
              <strong aria-label="Profesyonel bağlantı sayısı">
                {network.data.baglantilar.length}
              </strong>
            </div>
            {network.data.baglantilar.length === 0 ? (
              <p className="empty-state">Henüz profesyonel bağlantınız yok.</p>
            ) : (
              <div className="network-list">
                {network.data.baglantilar.map((connection) => (
                  <ConnectionRow
                    connection={connection}
                    key={connection.id}
                    onReport={report}
                    onBlock={block}
                  />
                ))}
              </div>
            )}
          </section>

          <section
            className="network-section"
            aria-labelledby="gonderilen-istekler"
          >
            <div className="network-heading">
              <div>
                <span className="eyebrow">BEKLEYENLER</span>
                <h2 id="gonderilen-istekler">Gönderilen istekler</h2>
              </div>
              <strong aria-label="Gönderilen istek sayısı">
                {network.data.gonderilen_istekler.length}
              </strong>
            </div>
            {network.data.gonderilen_istekler.length === 0 ? (
              <p className="empty-state">Yanıt bekleyen isteğiniz yok.</p>
            ) : (
              <div className="network-list">
                {network.data.gonderilen_istekler.map((connection) => (
                  <ConnectionRow connection={connection} key={connection.id} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Recommendations() {
  const recommendations = useApi<TavsiyeOzeti>("/uzman/tavsiyeler");
  const invitations = useApi<DavetOzeti>("/davetlerim");
  const specialties = useApi<{ uzmanliklar: string[] }>(
    "/uzman/tavsiye-uzmanliklari",
  );
  const [specialty, setSpecialty] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [candidates, setCandidates] = useState<TavsiyeEdilenTerapist[]>([]);
  const [candidateError, setCandidateError] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    if (!specialty) {
      setCandidates([]);
      setTherapistId("");
      return;
    }
    let active = true;
    setCandidateLoading(true);
    setCandidateError("");
    setTherapistId("");
    setInviteOpen(false);
    setInviteLink("");
    api<{ terapistler: TavsiyeEdilenTerapist[] }>(
      `/uzman/tavsiye-adaylari?uzmanlik=${encodeURIComponent(specialty)}`,
    )
      .then((result) => {
        if (active) setCandidates(result.terapistler);
      })
      .catch((error) => {
        if (active) setCandidateError((error as Error).message);
      })
      .finally(() => {
        if (active) setCandidateLoading(false);
      });
    return () => {
      active = false;
    };
  }, [specialty]);

  const existingIds = new Set(
    recommendations.data?.tavsiyeler.map((item) => item.terapist.id),
  );
  const availableCandidates = candidates.filter(
    (candidate) => !existingIds.has(candidate.id),
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specialty || !therapistId) return;
    setBusy("create");
    setMessage("");
    try {
      await api("/uzman/tavsiyeler", {
        method: "POST",
        body: JSON.stringify({ uzmanlik: specialty, uzman_id: therapistId }),
      });
      setTherapistId("");
      setMessage("Meslektaş önerisi profilinize eklendi.");
      recommendations.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function remove(therapistIdToRemove: string) {
    setBusy(therapistIdToRemove);
    setMessage("");
    try {
      await api(`/uzman/tavsiyeler/${therapistIdToRemove}`, {
        method: "DELETE",
        body: "{}",
      });
      setMessage("Meslektaş önerisi kaldırıldı.");
      recommendations.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specialty) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy("invite");
    setMessage("");
    setInviteLink("");
    try {
      const created = await api<Davet & { kabul_url: string }>("/davetler", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          ad: form.get("ad"),
          uzmanlik: specialty,
        }),
      });
      setInviteLink(created.kabul_url);
      setMessage(
        "Referanslı davet oluşturuldu. Bağlantıyı meslektaşınızla paylaşın.",
      );
      formElement.reset();
      invitations.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="narrow-content recommendations-panel">
      <section className="form-section" aria-labelledby="oneri-ekle">
        <span className="eyebrow">MESLEKİ YÖNLENDİRME</span>
        <h2 id="oneri-ekle">Çalışmadığınız alanlar için meslektaş önerin</h2>
        <p className="muted">
          Yalnız doğrulanmış ve seçtiğiniz alanda çalışan terapistler
          listelenir.
        </p>
        <Status
          loading={specialties.loading}
          error={specialties.error}
          retry={specialties.reload}
        />
        {specialties.data && (
          <form className="recommendation-form" onSubmit={create}>
            <label className="field">
              Uzmanlık alanı
              <select
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                required
              >
                <option value="">Alan seçin</option>
                {specialties.data.uzmanliklar.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Önerdiğiniz terapist
              <select
                value={therapistId}
                onChange={(event) => setTherapistId(event.target.value)}
                disabled={!specialty || candidateLoading}
                required
              >
                <option value="">
                  {candidateLoading
                    ? "Terapistler yükleniyor…"
                    : "Terapist seçin"}
                </option>
                {availableCandidates.map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>
                    {candidate.ad}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button"
              type="submit"
              disabled={busy === "create" || !specialty || !therapistId}
            >
              <HeartHandshake size={17} />
              {busy === "create" ? "Ekleniyor…" : "Öneri ekle"}
            </button>
          </form>
        )}
        {specialties.data?.uzmanliklar.length === 0 && (
          <p className="notice">
            Şu anda çalışmadığınız bir alanda doğrulanmış terapist bulunmuyor.
          </p>
        )}
        {candidateError && (
          <p className="notice error" role="alert">
            {candidateError}
          </p>
        )}
        {specialty && !candidateLoading && availableCandidates.length === 0 && (
          <p className="muted small">
            Bu alandaki uygun terapistlerin tamamını zaten eklediniz.
          </p>
        )}
        {specialty && (
          <div className="recommendation-invite">
            <div>
              <strong>Aradığınız terapist listede yok mu?</strong>
              <p>
                {specialty} alanı için referanslı katılım daveti gönderin.
                Daveti kimin oluşturduğu yönetim kaydında görünür.
              </p>
            </div>
            {!inviteOpen && (
              <button
                className="button secondary"
                type="button"
                onClick={() => setInviteOpen(true)}
                disabled={invitations.data?.kalan === 0}
              >
                <UserPlus size={17} aria-hidden="true" /> Katılıma davet et
              </button>
            )}
            {invitations.data?.kalan === 0 && (
              <p className="notice">Davet hakkınız kalmadı.</p>
            )}
            {inviteOpen && (
              <form className="recommendation-invite-form" onSubmit={invite}>
                <div className="form-grid">
                  <label className="field">
                    Terapistin e-posta adresi
                    <input
                      name="email"
                      type="email"
                      autoComplete="off"
                      maxLength={254}
                      required
                    />
                  </label>
                  <label className="field">
                    Adı ve soyadı
                    <input name="ad" maxLength={150} required />
                  </label>
                </div>
                <div className="recommendation-invite-actions">
                  <button
                    className="button"
                    type="submit"
                    disabled={busy === "invite"}
                  >
                    <UserPlus size={17} aria-hidden="true" />
                    {busy === "invite"
                      ? "Davet oluşturuluyor…"
                      : "Referanslı davet oluştur"}
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setInviteOpen(false)}
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            )}
            {inviteLink && (
              <div className="invite-link recommendation-invite-link">
                <label className="field">
                  Tek kullanımlık davet bağlantısı
                  <input
                    value={inviteLink}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </label>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(inviteLink)
                      .then(() => setMessage("Davet bağlantısı kopyalandı."))
                      .catch(() =>
                        setMessage("Bağlantıyı seçip elle kopyalayın."),
                      )
                  }
                >
                  <Copy size={17} aria-hidden="true" /> Kopyala
                </button>
              </div>
            )}
          </div>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="network-section" aria-labelledby="onerilerim">
        <div className="network-heading">
          <div>
            <span className="eyebrow">PROFİLİNİZDE GÖRÜNENLER</span>
            <h2 id="onerilerim">Önerdiğiniz terapistler</h2>
          </div>
          <strong aria-label="Öneri sayısı">
            {recommendations.data?.tavsiyeler.length ?? 0}
          </strong>
        </div>
        <Status
          loading={recommendations.loading}
          error={recommendations.error}
          retry={recommendations.reload}
        />
        {recommendations.data?.tavsiyeler.length === 0 && (
          <p className="empty-state">Henüz meslektaş önerisi eklemediniz.</p>
        )}
        <div className="recommendation-manage-list">
          {recommendations.data?.tavsiyeler.map((recommendation) => (
            <article
              className="recommendation-manage-row"
              key={recommendation.terapist.id}
            >
              <div>
                <h3>
                  <Link to={`/uzman/${recommendation.terapist.id}`}>
                    {recommendation.terapist.ad}
                  </Link>
                </h3>
                <p>{recommendation.uzmanlik}</p>
                {!recommendation.aktif && (
                  <span className="muted small">Artık profilde görünmüyor</span>
                )}
              </div>
              <button
                className="recommendation-remove"
                type="button"
                title="Öneriyi kaldır"
                aria-label={`${recommendation.terapist.ad} önerisini kaldır`}
                disabled={busy === recommendation.terapist.id}
                onClick={() => remove(recommendation.terapist.id)}
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ClientReferrals() {
  const candidates = useApi<{ terapistler: YonlendirmeTerapisti[] }>(
    "/uzman/yonlendirme-adaylari",
  );
  const history = useApi<{ yonlendirmeler: DanisanYonlendirme[] }>(
    "/uzman/yonlendirmeler",
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<YonlendirmeNedeni>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<DanisanYonlendirme>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const filteredCandidates = candidates.data?.terapistler.filter((item) =>
    item.ad
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR")),
  );
  const selectedTherapists = candidates.data?.terapistler.filter((item) =>
    selectedIds.includes(item.id),
  );

  function toggleTherapist(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  }

  async function createReferral() {
    if (!reason || selectedIds.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const created = await api<DanisanYonlendirme>("/uzman/yonlendirmeler", {
        method: "POST",
        body: JSON.stringify({ neden: reason, uzman_ids: selectedIds }),
      });
      setResult(created);
      history.reload();
      setMessage("Yönlendirme bağlantısı oluşturuldu.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep(1);
    setReason(undefined);
    setSelectedIds([]);
    setSearch("");
    setResult(undefined);
    setMessage("");
  }

  return (
    <div className="narrow-content referrals-panel">
      <section
        className="form-section referral-wizard"
        aria-labelledby="yonlendir"
      >
        <span className="eyebrow">GÜVENLİ MESLEKTAŞ YÖNLENDİRMESİ</span>
        <h2 id="yonlendir">Danışan Yönlendir</h2>
        <p className="muted">
          Bu işlem danışan adı, iletişim bilgisi, tanı, not veya başka sağlık
          verisi istemez ve bağlantıya eklemez.
        </p>
        <ol className="wizard-steps" aria-label="Yönlendirme adımları">
          {["Neden", "Terapistler", "Bağlantı"].map((label, index) => {
            const number = (index + 1) as 1 | 2 | 3;
            return (
              <li
                className={step >= number ? "is-active" : ""}
                aria-current={step === number ? "step" : undefined}
                key={label}
              >
                <span>{number}</span> {label}
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <fieldset className="referral-reasons">
            <legend>Yönlendirme nedeni</legend>
            {referralReasons.map((item) => (
              <label key={item.value}>
                <input
                  type="radio"
                  name="referral-reason"
                  value={item.value}
                  checked={reason === item.value}
                  onChange={() => setReason(item.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
            <button
              className="button wizard-next"
              type="button"
              disabled={!reason}
              onClick={() => setStep(2)}
            >
              Terapist seç
            </button>
          </fieldset>
        )}

        {step === 2 && (
          <div>
            <div className="referral-search">
              <Search size={17} aria-hidden="true" />
              <label className="sr-only" htmlFor="referral-search">
                Terapist ara
              </label>
              <input
                id="referral-search"
                type="search"
                placeholder="Terapist adıyla ara"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <p className="muted small">
              En fazla 3 doğrulanmış terapist seçin. {selectedIds.length}/3
              seçildi.
            </p>
            <Status
              loading={candidates.loading}
              error={candidates.error}
              retry={candidates.reload}
            />
            <div className="referral-candidates">
              {filteredCandidates?.map((therapist) => {
                const selected = selectedIds.includes(therapist.id);
                return (
                  <label
                    className={`referral-candidate ${selected ? "is-selected" : ""}`}
                    key={therapist.id}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && selectedIds.length === 3}
                      onChange={() => toggleTherapist(therapist.id)}
                    />
                    <span>
                      <strong>{therapist.ad}</strong>
                      <small>
                        {therapist.ilce}, {therapist.sehir} ·{" "}
                        {therapist.uzmanliklar.join(", ")}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
            {filteredCandidates?.length === 0 && (
              <p className="empty-state">Aramanızla eşleşen terapist yok.</p>
            )}
            <div className="wizard-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(1)}
              >
                Geri
              </button>
              <button
                className="button"
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setStep(3)}
              >
                Seçimi gözden geçir
              </button>
            </div>
          </div>
        )}

        {step === 3 && !result && (
          <div className="referral-review">
            <h3>{reason && referralReasonLabel(reason)}</h3>
            <ul>
              {selectedTherapists?.map((therapist) => (
                <li key={therapist.id}>{therapist.ad}</li>
              ))}
            </ul>
            <p className="muted small">
              Bağlantı 90 gün geçerlidir. Yalnız seçtiğiniz açık profilleri
              gösterir.
            </p>
            <div className="wizard-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(2)}
              >
                Geri
              </button>
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={createReferral}
              >
                <Link2 size={17} />
                {busy ? "Oluşturuluyor…" : "Referral oluştur"}
              </button>
            </div>
          </div>
        )}

        {result?.url && (
          <div className="referral-result">
            <Link2 size={25} />
            <h3>Yönlendirme bağlantısı hazır</h3>
            <div className="invite-link">
              <label className="field">
                Tekil bağlantı
                <input
                  value={result.url}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(result.url!)
                    .then(() => setMessage("Bağlantı kopyalandı."))
                    .catch(() =>
                      setMessage("Bağlantıyı seçip elle kopyalayın."),
                    )
                }
              >
                <Copy size={17} /> Kopyala
              </button>
            </div>
            <button className="text-button" type="button" onClick={reset}>
              Yeni yönlendirme oluştur
            </button>
          </div>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </section>

      <section
        className="network-section"
        aria-labelledby="yonlendirme-gecmisi"
      >
        <div className="network-heading">
          <div>
            <span className="eyebrow">SON BAĞLANTILAR</span>
            <h2 id="yonlendirme-gecmisi">Yönlendirme geçmişi</h2>
          </div>
          <strong aria-label="Yönlendirme sayısı">
            {history.data?.yonlendirmeler.length ?? 0}
          </strong>
        </div>
        <Status
          loading={history.loading}
          error={history.error}
          retry={history.reload}
        />
        {history.data?.yonlendirmeler.length === 0 && (
          <p className="empty-state">Henüz yönlendirme oluşturmadınız.</p>
        )}
        <div className="referral-history">
          {history.data?.yonlendirmeler.map((referral) => (
            <article key={referral.id}>
              <div>
                <h3>{referralReasonLabel(referral.neden)}</h3>
                <p>{referral.terapistler.map((item) => item.ad).join(" · ")}</p>
              </div>
              <time
                dateTime={new Date(referral.olusturma * 1000).toISOString()}
              >
                {new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "medium",
                }).format(new Date(referral.olusturma * 1000))}
                {` · ${referral.view_count} görüntülenme`}
              </time>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Invitations() {
  const invitations = useApi<DavetOzeti>("/davetlerim");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    setLink("");
    try {
      const created = await api<Davet & { kabul_url: string }>("/davetler", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          ad: form.get("ad"),
        }),
      });
      setLink(created.kabul_url);
      setMessage("Davet oluşturuldu. Bağlantıyı meslektaşınızla paylaşın.");
      formElement.reset();
      invitations.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const verified = invitations.data?.dogrulama_durumu === "verified";
  return (
    <div className="narrow-content invitation-panel">
      <Status
        loading={invitations.loading}
        error={invitations.error}
        retry={invitations.reload}
      />
      {invitations.data && (
        <>
          <section className="form-section">
            <div className="invitation-heading">
              <div>
                <span className="eyebrow">MESLEKİ AĞ</span>
                <h2>Meslektaş Davet Et</h2>
              </div>
              <strong className="invite-count" aria-label="Kalan davet hakkı">
                {invitations.data.kalan}/{invitations.data.davet_limiti}
              </strong>
            </div>
            <p className="muted">
              {invitations.data.davet_limiti} davet hakkından{" "}
              {invitations.data.kalan} kaldı. Davet bağlantısı 14 gün geçerlidir
              ve yalnız belirtilen e-posta adresiyle kullanılabilir.
            </p>
            {!verified && (
              <p className="notice">
                Meslektaş davet etmek için profil doğrulamanızın tamamlanması
                gerekir.
              </p>
            )}
            <form onSubmit={submit}>
              <div className="form-grid">
                <label className="field">
                  Meslektaşınızın e-posta adresi
                  <input
                    name="email"
                    type="email"
                    autoComplete="off"
                    maxLength={254}
                    required
                    disabled={!verified || invitations.data.kalan === 0}
                  />
                </label>
                <label className="field">
                  Adı (isteğe bağlı)
                  <input
                    name="ad"
                    maxLength={150}
                    disabled={!verified || invitations.data.kalan === 0}
                  />
                </label>
              </div>
              <button
                className="button"
                type="submit"
                disabled={busy || !verified || invitations.data.kalan === 0}
              >
                <UserPlus size={17} />
                {busy ? "Oluşturuluyor…" : "Davet bağlantısı oluştur"}
              </button>
            </form>
            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
            {link && (
              <div className="invite-link">
                <label className="field">
                  Tek kullanımlık davet bağlantısı
                  <input
                    value={link}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </label>
                <button
                  className="button secondary"
                  type="button"
                  title="Davet bağlantısını kopyala"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(link)
                      .then(() => setMessage("Davet bağlantısı kopyalandı."))
                      .catch(() =>
                        setMessage("Bağlantıyı seçip elle kopyalayın."),
                      )
                  }
                >
                  <Copy size={17} />
                  Kopyala
                </button>
              </div>
            )}
          </section>
          <section className="invitation-history" aria-labelledby="davetlerim">
            <h2 id="davetlerim">Davetlerim</h2>
            {invitations.data.davetler.length === 0 ? (
              <p className="empty-state">Henüz davet oluşturmadınız.</p>
            ) : (
              <div className="invitation-list">
                {invitations.data.davetler.map((invitation) => (
                  <article className="invitation-row" key={invitation.id}>
                    <div>
                      <h3>{invitation.ad || invitation.email}</h3>
                      {invitation.ad && <p>{invitation.email}</p>}
                      {invitation.onerilen_uzmanlik && (
                        <p>Referans alanı: {invitation.onerilen_uzmanlik}</p>
                      )}
                    </div>
                    <span
                      className={`status-badge ${
                        invitation.durum === "accepted"
                          ? "onaylandi"
                          : invitation.durum === "pending"
                            ? "bekliyor"
                            : "reddedildi"
                      }`}
                    >
                      {inviteStatuses[invitation.durum]}
                    </span>
                    <time
                      dateTime={new Date(
                        invitation.sure_bitimi * 1000,
                      ).toISOString()}
                    >
                      {invitation.durum === "pending"
                        ? `${new Intl.DateTimeFormat("tr-TR", {
                            dateStyle: "medium",
                          }).format(
                            new Date(invitation.sure_bitimi * 1000),
                          )} tarihine kadar geçerli`
                        : inviteStatuses[invitation.durum]}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function WebsiteBadge() {
  const badge = useApi<WebsiteRozetiOzeti>("/uzman/website-badge");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function create() {
    setBusy(true);
    setMessage("");
    try {
      await api("/uzman/website-badge", {
        method: "POST",
        body: "{}",
      });
      await badge.reload();
      setMessage("Doğrulanmış terapist rozetiniz hazır.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!badge.data?.rozet) return;
    try {
      await navigator.clipboard.writeText(badge.data.rozet.embed_code);
      setMessage("Embed kodu panoya kopyalandı.");
    } catch {
      setMessage("Kod kopyalanamadı. Metin alanından seçerek kopyalayın.");
    }
  }

  return (
    <div className="narrow-content website-badge-panel">
      <Status
        loading={badge.loading}
        error={badge.error}
        retry={badge.reload}
      />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {badge.data && (
        <section className="form-section" aria-labelledby="website-badge-title">
          <span className="eyebrow">DOĞRULANMIŞ PROFİL</span>
          <h2 id="website-badge-title">Web Siteme Ekle</h2>
          <p className="muted">
            Rozeti web sitenize ekleyin. Tıklandığında doğrulanmış Terapist.co
            profiliniz açılır.
          </p>
          {!badge.data.uygun ? (
            <p className="empty-state">
              Rozet, profil doğrulamanız tamamlandıktan sonra oluşturulabilir.
            </p>
          ) : !badge.data.rozet ? (
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={create}
            >
              <ShieldCheck size={17} />
              {busy ? "Oluşturuluyor…" : "Rozeti oluştur"}
            </button>
          ) : (
            <>
              <div className="website-badge-preview">
                <span>Önizleme</span>
                <a
                  href={badge.data.rozet.tiklama_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={badge.data.rozet.gorsel_url}
                    alt="Terapist.co Doğrulanmış Terapist"
                    width="280"
                    height="72"
                  />
                </a>
              </div>
              <label className="field website-badge-code">
                Embed kodu
                <textarea
                  readOnly
                  rows={7}
                  value={badge.data.rozet.embed_code}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <div className="website-badge-actions">
                <button className="button" type="button" onClick={copyCode}>
                  <Copy size={16} /> Kodu kopyala
                </button>
                <a
                  className="text-button"
                  href={badge.data.rozet.profil_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Profilimi aç
                </a>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

type DashboardTab =
  | "ozet"
  | "istatistikler"
  | "randevular"
  | "mesajlar"
  | "profil"
  | "gorunum"
  | "baglantilar"
  | "tavsiyeler"
  | "yonlendirmeler"
  | "davetler"
  | "website-badge"
  | "gizlilik";

type DashboardNavItem = {
  id: DashboardTab;
  label: string;
  description: string;
  icon: LucideIcon;
};

const dashboardNavigation: Array<{
  label: string;
  items: DashboardNavItem[];
}> = [
  {
    label: "Günlük işler",
    items: [
      {
        id: "ozet",
        label: "Genel bakış",
        description: "Öncelikler ve hesap özeti",
        icon: ChartNoAxesCombined,
      },
      {
        id: "istatistikler",
        label: "Profil istatistikleri",
        description: "Ziyaretçi, kaynak ve ilgi özeti",
        icon: TrendingUp,
      },
      {
        id: "randevular",
        label: "Randevular",
        description: "Talepleri değerlendir",
        icon: CalendarDays,
      },
      {
        id: "mesajlar",
        label: "Bildirimler ve Mesajlar",
        description: "Meslektaş ve yönetici mesajları, bildirimler",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "Profil ve görünürlük",
    items: [
      {
        id: "profil",
        label: "Profilimi düzenle",
        description: "Bilgiler, takvim ve bağlantılar",
        icon: UserRound,
      },
      {
        id: "gorunum",
        label: "Görünüm, QR & White-Label",
        description: "Tema rengi, buton stili ve masa QR kartı",
        icon: Palette,
      },
      {
        id: "website-badge",
        label: "Web sitesi rozeti",
        description: "Doğrulanmış profilini paylaş",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "Mesleki ağ",
    items: [
      {
        id: "baglantilar",
        label: "Bağlantılar",
        description: "İstekler ve meslektaşlar",
        icon: UsersRound,
      },
      {
        id: "tavsiyeler",
        label: "Terapist önerileri",
        description: "Önerdiğin uzmanları yönet",
        icon: HeartHandshake,
      },
      {
        id: "yonlendirmeler",
        label: "Danışan yönlendir",
        description: "Güvenli yönlendirme oluştur",
        icon: Share2,
      },
      {
        id: "davetler",
        label: "Meslektaş davet et",
        description: "Referanslı katılım bağlantısı",
        icon: UserPlus,
      },
    ],
  },
  {
    label: "Hesap",
    items: [
      {
        id: "gizlilik",
        label: "Gizlilik ve güvenlik",
        description: "Görünürlük ve engelleme",
        icon: LockKeyhole,
      },
    ],
  },
];

const dashboardTabs = dashboardNavigation.flatMap((group) => group.items);

function dashboardHref(tab: DashboardTab) {
  return tab === "ozet" ? "/panel" : `/panel?sekme=${tab}`;
}

function DashboardNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: DashboardTab;
  onSelect?: () => void;
}) {
  return (
    <nav className="dashboard-navigation" aria-label="Uzman çalışma alanı">
      {dashboardNavigation.map((group) => (
        <div className="dashboard-nav-group" key={group.label}>
          <span className="dashboard-nav-label">{group.label}</span>
          <div className="dashboard-nav-list">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeTab;
              return (
                <Link
                  className={`dashboard-nav-item ${active ? "is-active" : ""}`}
                  to={dashboardHref(item.id)}
                  aria-current={active ? "page" : undefined}
                  onClick={onSelect}
                  key={item.id}
                >
                  <span className="dashboard-nav-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="dashboard-nav-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <ChevronRight
                    className="dashboard-nav-arrow"
                    size={16}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileNavigation = useRef<HTMLDetailsElement>(null);
  const requestedTab = searchParams.get("sekme") as DashboardTab | null;
  const tab = dashboardTabs.some((item) => item.id === requestedTab)
    ? requestedTab!
    : "ozet";
  const activeNavigation =
    dashboardTabs.find((item) => item.id === tab) ?? dashboardTabs[0];
  const ActiveNavigationIcon = activeNavigation.icon;
  const [page, setPage] = useState(1);
  const profile = useApi<Profil>("/uzman/profil");
  const bookings = useApi<Randevu[]>(`/uzman/randevular?sayfa=${page}`);
  const waitlist = useApi<BeklemeListesiKaydi[]>("/uzman/bekleme-listesi");
  const notifications = useApi<UzmanBildirimlerYaniti>("/uzman/bildirimler");
  const [appointmentsView, setAppointmentsView] = useState<
    "randevular" | "bekleme"
  >("randevular");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [profileSec, setProfileSec] = useState<ProfileSectionTab>("kimlik");
  const activeWaitlistCount = (waitlist.data ?? []).filter(
    (entry) => entry.durum === "bekliyor",
  ).length;
  async function markNotificationRead(id: string) {
    try {
      await api(`/uzman/bildirimler/${id}/okundu`, { method: "PATCH" });
      notifications.reload();
    } catch {
      // Sessizce yoksayılır; kullanıcı yeniden deneyebilir.
    }
  }
  function navigateToTab(nextTab: DashboardTab) {
    const next = new URLSearchParams(searchParams);
    next.delete("konu");
    next.delete("bildirim");
    next.delete("alici");
    if (nextTab === "ozet") next.delete("sekme");
    else next.set("sekme", nextTab);
    setSearchParams(next);
  }
  async function change(id: string, durum: string) {
    if (
      durum === "iptal" &&
      !window.confirm("Bu randevuyu iptal etmek istiyor musunuz?")
    )
      return;
    setBusy(id);
    setMessage("");
    try {
      await api(`/uzman/randevular/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ durum }),
      });
      bookings.reload();
      notifications.reload();
      setMessage("Randevu durumu güncellendi.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function updateWaitlistStatus(
    entryId: string,
    durum: BeklemeListesiKaydi["durum"],
  ) {
    setBusy(`wl-${entryId}`);
    setMessage("");
    try {
      await api(`/uzman/bekleme-listesi/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ durum }),
      });
      waitlist.reload();
      setMessage("Bekleme listesi kaydı güncellendi.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function deleteWaitlistEntry(entryId: string) {
    if (
      !window.confirm(
        "Bu bekleme listesi kaydını kalıcı olarak silmek istiyor musunuz?",
      )
    )
      return;
    setBusy(`wl-${entryId}`);
    setMessage("");
    try {
      await api(`/uzman/bekleme-listesi/${entryId}`, { method: "DELETE" });
      waitlist.reload();
      setMessage("Bekleme listesi kaydı silindi.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">UZMAN ÇALIŞMA ALANI</span>
          <h1>Çalışma alanınız</h1>
          <p>
            {profile.data?.ad} · Randevularınızı, profilinizi ve mesleki ağınızı
            tek yerden yönetin.
          </p>
        </div>
        {profile.data && (
          <Link
            className="button secondary dashboard-profile-link"
            to={
              profile.data.onayli
                ? `/${profile.data.kullanici_adi}`
                : "/panel/onizleme"
            }
          >
            {profile.data.onayli
              ? "Açık profilimi görüntüle"
              : "Profilimi önizle"}
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        )}
      </header>

      <details className="dashboard-mobile-nav" ref={mobileNavigation}>
        <summary>
          <span className="dashboard-nav-icon" aria-hidden="true">
            <ActiveNavigationIcon size={18} />
          </span>
          <span>
            <small>Şu an</small>
            <strong>{activeNavigation.label}</strong>
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <DashboardNavigation
          activeTab={tab}
          onSelect={() => {
            if (mobileNavigation.current) mobileNavigation.current.open = false;
          }}
        />
      </details>

      <div className="dashboard-workspace">
        <aside className="dashboard-sidebar">
          <DashboardNavigation activeTab={tab} />
        </aside>
        <div className="dashboard-main">
          <header className="dashboard-view-heading">
            <h2>{activeNavigation.label}</h2>
            <p>{activeNavigation.description}</p>
          </header>
          {profile.data && !profile.data.onayli && (
            <p className="notice">
              Profiliniz inceleme aşamasında. Onaylandıktan sonra uzman
              dizininde görünecektir.
            </p>
          )}
          {tab === "ozet" ? (
            <GrowthAnalytics onNavigate={navigateToTab} />
          ) : tab === "istatistikler" ? (
            <TherapistTrafficAnalytics
              onEditProfile={() => navigateToTab("profil")}
              onOpenBadge={() => navigateToTab("website-badge")}
            />
          ) : tab === "mesajlar" ? (
            <NotificationsAndMessages
              userRole="uzman"
              initialThreadId={searchParams.get("konu")}
              initialNotificationId={searchParams.get("bildirim")}
              initialRecipientId={searchParams.get("alici")}
              onNavigateAppointments={() => navigateToTab("randevular")}
            />
          ) : tab === "gizlilik" ? (
            <PrivacyModeration />
          ) : tab === "davetler" ? (
            <Invitations />
          ) : tab === "website-badge" ? (
            <WebsiteBadge />
          ) : tab === "gorunum" ? (
            <div className="dashboard-theme-studio">
              <Status
                loading={profile.loading}
                error={profile.error}
                retry={profile.reload}
              />
              {profile.data && <ThemeCustomizer profile={profile.data} />}
            </div>
          ) : tab === "yonlendirmeler" ? (
            <ClientReferrals />
          ) : tab === "tavsiyeler" ? (
            <Recommendations />
          ) : tab === "baglantilar" ? (
            <ProfessionalNetwork />
          ) : tab === "profil" ? (
            <div className="dashboard-profile-editor">
              <Status
                loading={profile.loading}
                error={profile.error}
                retry={profile.reload}
              />
              {profile.data && (
                <>
                  <ProfileForm
                    profile={profile.data}
                    googleCalendarEnabled
                    googleCalendarCallback={searchParams.get("takvim")}
                    onSectionChange={setProfileSec}
                    onClearGoogleCalendarCallback={() => {
                      if (!searchParams.has("takvim")) return;
                      const next = new URLSearchParams(searchParams);
                      next.delete("takvim");
                      setSearchParams(next, { replace: true });
                    }}
                    onSubmit={async (p) => {
                      await api("/uzman/profil", {
                        method: "PUT",
                        body: JSON.stringify(p),
                      });
                      profile.reload();
                    }}
                  />
                  <div
                    className={`dashboard-profile-links${profileSec !== "baglantilar" && profileSec !== "tumu" ? " profile-sec-hidden" : ""}`}
                  >
                    <ProfileResources therapistId={profile.data.id} isOwner />
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {notifications.data && notifications.data.kayitlar.length > 0 && (
                <section
                  className="admin-panel-card dashboard-notifications-card"
                  aria-label="Yönetici randevu bildirimleri"
                >
                  <div className="admin-card-header">
                    <div>
                      <span className="eyebrow">YÖNETİCİ BİLDİRİMLERİ</span>
                      <h3>
                        Randevu hatırlatmaları (
                        {notifications.data.okunmamis_sayisi} okunmamış)
                      </h3>
                    </div>
                  </div>
                  <ul className="admin-history-list">
                    {notifications.data.kayitlar.map((item) => (
                      <li
                        key={item.id}
                        className={
                          item.okundu ? "is-read-notif" : "is-unread-notif"
                        }
                      >
                        <div>
                          <strong>
                            <Bell size={14} aria-hidden="true" /> {item.mesaj}
                          </strong>
                          <span>
                            Randevu:{" "}
                            {tarih(
                              new Date(
                                item.randevu_baslangic * 1000,
                              ).toISOString(),
                            )}{" "}
                            ·{" "}
                            {tarih(
                              new Date(item.olusturma * 1000).toISOString(),
                            )}
                          </span>
                        </div>
                        {!item.okundu && (
                          <button
                            type="button"
                            className="button secondary admin-compact-btn"
                            onClick={() => void markNotificationRead(item.id)}
                          >
                            <Check size={14} aria-hidden="true" />
                            <span>Okundu işaretle</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {message && (
                <p className="notice" role="status">
                  {message}
                </p>
              )}
              <div
                className="waitlist-view-switch"
                role="tablist"
                aria-label="Randevu ve bekleme listesi görünümleri"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={appointmentsView === "randevular"}
                  className={`waitlist-switch-tab ${appointmentsView === "randevular" ? "is-active" : ""}`}
                  onClick={() => setAppointmentsView("randevular")}
                >
                  <CalendarDays size={16} aria-hidden="true" />
                  <span>Randevu talepleri</span>
                  {bookings.data && (
                    <span className="waitlist-tab-count">
                      {bookings.data.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={appointmentsView === "bekleme"}
                  className={`waitlist-switch-tab ${appointmentsView === "bekleme" ? "is-active" : ""}`}
                  onClick={() => setAppointmentsView("bekleme")}
                >
                  <BellPlus size={16} aria-hidden="true" />
                  <span>Bekleme listesi</span>
                  <span className="waitlist-tab-count">
                    {activeWaitlistCount} bekliyor
                  </span>
                </button>
              </div>
              {appointmentsView === "bekleme" ? (
                <div className="waitlist-panel">
                  <Status
                    loading={waitlist.loading}
                    error={waitlist.error}
                    retry={waitlist.reload}
                  />
                  {waitlist.data?.length === 0 && (
                    <div className="empty-state">
                      <BellPlus size={34} />
                      <h2>Bekleme listesinde kayıt bulunmuyor</h2>
                      <p>
                        Takviminiz dolu olduğunda bekleme listesine kaydolan
                        danışan talepleri burada listelenir.
                      </p>
                    </div>
                  )}
                  <div className="waitlist-list">
                    {waitlist.data?.map((entry) => {
                      const formatLabel =
                        entry.tercih_format === "cevrim_ici"
                          ? "Çevrim içi"
                          : entry.tercih_format === "yuz_yuze"
                            ? "Yüz yüze"
                            : "Format farketmez";
                      const timeLabel =
                        entry.tercih_zaman === "sabah"
                          ? "Sabah"
                          : entry.tercih_zaman === "ogleden_sonra"
                            ? "Öğleden sonra"
                            : entry.tercih_zaman === "aksam"
                              ? "Akşam"
                              : entry.tercih_zaman === "hafta_sonu"
                                ? "Hafta sonu"
                                : "Zaman esnek";
                      const statusLabel =
                        entry.durum === "bekliyor"
                          ? "Bekliyor"
                          : entry.durum === "iletisime_gecildi"
                            ? "İletişime geçildi"
                            : "Kapandı";
                      return (
                        <article
                          key={entry.id}
                          className={`appointment waitlist-card is-${entry.durum}`}
                        >
                          <div className="appointment-date">
                            <Clock size={19} aria-hidden="true" />
                            <strong>
                              {tarih(
                                new Date(entry.olusturma * 1000).toISOString(),
                              )}
                            </strong>
                          </div>
                          <div>
                            <h2>{entry.ad}</h2>
                            <p className="waitlist-contact-row">
                              <span>
                                <Phone size={14} aria-hidden="true" />{" "}
                                <a
                                  href={`tel:${entry.telefon.replace(/[^+0-9]/g, "")}`}
                                >
                                  {entry.telefon}
                                </a>
                              </span>
                              {entry.email && (
                                <span>
                                  <Mail size={14} aria-hidden="true" />{" "}
                                  <a href={`mailto:${entry.email}`}>
                                    {entry.email}
                                  </a>
                                </span>
                              )}
                            </p>
                            <div className="waitlist-pref-tags">
                              <span>{formatLabel}</span>
                              <span>{timeLabel}</span>
                            </div>
                          </div>
                          <span
                            className={`status-badge waitlist-status-${entry.durum}`}
                          >
                            {statusLabel}
                          </span>
                          <div className="actions">
                            {entry.durum !== "iletisime_gecildi" && (
                              <button
                                type="button"
                                className="button"
                                disabled={busy === `wl-${entry.id}`}
                                onClick={() =>
                                  void updateWaitlistStatus(
                                    entry.id,
                                    "iletisime_gecildi",
                                  )
                                }
                              >
                                <Check size={14} aria-hidden="true" />
                                <span>İletişime geçildi</span>
                              </button>
                            )}
                            {entry.durum !== "kapandi" && (
                              <button
                                type="button"
                                className="button secondary"
                                disabled={busy === `wl-${entry.id}`}
                                onClick={() =>
                                  void updateWaitlistStatus(entry.id, "kapandi")
                                }
                              >
                                Kapat
                              </button>
                            )}
                            <button
                              type="button"
                              className="button danger"
                              disabled={busy === `wl-${entry.id}`}
                              onClick={() => void deleteWaitlistEntry(entry.id)}
                              aria-label={`${entry.ad} kaydını sil`}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <Status
                    loading={bookings.loading}
                    error={bookings.error}
                    retry={bookings.reload}
                  />
                  {bookings.data?.length === 0 && (
                    <div className="empty-state">
                      <CalendarDays size={34} />
                      <h2>Henüz randevu talebi yok</h2>
                      <p>Profilinizden gönderilen talepler burada görünecek.</p>
                    </div>
                  )}
                  <div className="appointments">
                    {bookings.data?.map((b) => (
                      <article key={b.id} className="appointment">
                        <div className="appointment-date">
                          <CalendarDays size={19} />
                          <strong>{tarih(b.baslangic)}</strong>
                        </div>
                        <div>
                          <h2>{b.ad}</h2>
                          <a href={`tel:${b.telefon.replace(/[^+0-9]/g, "")}`}>
                            {b.telefon}
                          </a>
                        </div>
                        <span className={`status-badge ${b.durum}`}>
                          {statuses[b.durum]}
                        </span>
                        <div className="actions">
                          {b.durum === "bekliyor" && (
                            <>
                              <button
                                className="button"
                                disabled={busy === b.id}
                                onClick={() => change(b.id, "onaylandi")}
                              >
                                Onayla
                              </button>
                              <button
                                className="button secondary"
                                disabled={busy === b.id}
                                onClick={() => change(b.id, "reddedildi")}
                              >
                                Reddet
                              </button>
                            </>
                          )}
                          {b.durum === "onaylandi" && (
                            <button
                              className="button danger"
                              disabled={busy === b.id}
                              onClick={() => change(b.id, "iptal")}
                            >
                              İptal et
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <nav className="pagination" aria-label="Randevu sayfaları">
                    <button
                      className="button secondary"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Önceki
                    </button>
                    <span>{page}. sayfa</span>
                    <button
                      className="button secondary"
                      disabled={!bookings.data || bookings.data.length < 50}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sonraki
                    </button>
                  </nav>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
