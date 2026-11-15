import { FormEvent, useState } from "react";
import { Award, Trash2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { api, KurucuUyeBilgisi, tarih, YonetimKurucuUyeleri } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

export function AdminFoundingView({
  data,
  loading,
  error,
  retry,
  selectedCandidate,
  searchTerm,
  busy,
  message,
  onSelectCandidate,
  onSearchChange,
  onSaveCapacity,
  onAddMember,
  onRemoveMember,
}: {
  data?: YonetimKurucuUyeleri;
  loading: boolean;
  error: string;
  retry: () => void;
  selectedCandidate: string;
  searchTerm: string;
  busy: string;
  message: string;
  onSelectCandidate: (id: string) => void;
  onSearchChange: (val: string) => void;
  onSaveCapacity: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAddMember: (event: FormEvent) => Promise<void>;
  onRemoveMember: (member: KurucuUyeBilgisi) => Promise<void>;
}) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr");
  const filteredMembers = (data?.uyeler ?? []).filter(
    (member) =>
      !normalizedSearch ||
      member.ad.toLocaleLowerCase("tr").includes(normalizedSearch) ||
      member.sehir.toLocaleLowerCase("tr").includes(normalizedSearch) ||
      String(member.kurucu_no).includes(normalizedSearch),
  );

  return (
    <div className="admin-section-stack">
      <Status loading={loading} error={error} retry={retry} />

      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      {data && (
        <>
          <div className="admin-stats-columns">
            <section className="form-section founder-settings">
              <span className="eyebrow">FOUNDING THERAPIST</span>
              <h2>Kontenjan yönetimi</h2>
              <p className="muted">
                Doğrulaması tamamlanan terapistler sırayla kalıcı kurucu
                numarası alır. Yöneticiler kontenjan dahilinde üye ekleyip
                çıkarabilir.
              </p>
              <div className="founder-stats">
                <div>
                  <span>Atanan üye</span>
                  <strong>{data.program.atanmis_uye}</strong>
                </div>
                <div>
                  <span>Kalan kontenjan</span>
                  <strong>{data.program.kalan}</strong>
                </div>
                <div>
                  <span>Sıradaki numara</span>
                  <strong>
                    {data.program.siradaki_numara === null
                      ? "—"
                      : `#${String(data.program.siradaki_numara).padStart(4, "0")}`}
                  </strong>
                </div>
              </div>
              <form onSubmit={onSaveCapacity}>
                <label className="field">
                  Maksimum kurucu terapist
                  <input
                    key={data.program.azami_uye}
                    name="azami_uye"
                    type="number"
                    min="0"
                    max="1000000"
                    defaultValue={data.program.azami_uye}
                    required
                  />
                </label>
                <button
                  className="button"
                  type="submit"
                  disabled={busy === "capacity"}
                >
                  {busy === "capacity" ? "Kaydediliyor…" : "Sınırı kaydet"}
                </button>
              </form>
            </section>

            <section className="form-section admin-founder-add-card">
              <span className="eyebrow">ÜYE EKLEME</span>
              <h2>Doğrulanmış terapisti programa dahil et</h2>
              <p className="muted">
                Yalnız yayında ve doğrulanmış olan terapistler kurucu programına
                manuel olarak eklenebilir.
              </p>
              {data.adaylar.length === 0 ? (
                <p className="empty-state">
                  Eklenebilecek yayında terapist kalmadı.
                </p>
              ) : (
                <form className="admin-founder-add-form" onSubmit={onAddMember}>
                  <label className="field">
                    Yayındaki uzman seçin
                    <select
                      value={selectedCandidate}
                      onChange={(event) =>
                        onSelectCandidate(event.target.value)
                      }
                      required
                    >
                      <option value="">Bir terapist seçin…</option>
                      {data.adaylar.map((candidate) => (
                        <option
                          key={candidate.uzman_id}
                          value={candidate.uzman_id}
                        >
                          {candidate.ad} — {candidate.sehir} / {candidate.ilce}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button"
                    type="submit"
                    disabled={
                      busy === "add" ||
                      !selectedCandidate ||
                      data.program.kalan <= 0
                    }
                  >
                    <UserPlus size={16} aria-hidden="true" />
                    {busy === "add"
                      ? "Ekleniyor…"
                      : data.program.kalan <= 0
                        ? "Kontenjan dolu"
                        : "Kurucu programına ekle"}
                  </button>
                </form>
              )}
            </section>
          </div>

          <section className="admin-panel-card">
            <div className="admin-card-header admin-card-header-wrap">
              <div>
                <span className="eyebrow">KURUCU ÜYE LİSTESİ</span>
                <h3>Kayıtlı kurucu terapistler ({data.uyeler.length})</h3>
              </div>
              <label className="admin-inline-search">
                <span className="sr-only">Kurucu üyelerde ara</span>
                <input
                  type="search"
                  placeholder="Ad, şehir veya #numara ara…"
                  value={searchTerm}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </label>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="empty-state">
                <Award size={30} aria-hidden="true" />
                <p>Eşleşen kurucu terapist kaydı bulunmuyor.</p>
              </div>
            ) : (
              <div className="admin-reference-list">
                {filteredMembers.map((member) => (
                  <article key={member.uzman_id}>
                    <div>
                      <div className="admin-member-title-row">
                        <span className="status-badge founder">
                          #{String(member.kurucu_no).padStart(4, "0")}
                        </span>
                        <h3>
                          {member.kullanici_adi ? (
                            <Link to={`/${member.kullanici_adi}`}>
                              {member.ad}
                            </Link>
                          ) : (
                            member.ad
                          )}
                        </h3>
                      </div>
                      <p>
                        {member.sehir} · {member.ilce} · Verilme:{" "}
                        {tarih(new Date(member.verilme * 1000).toISOString())}
                      </p>
                      <p>
                        {member.onayli ? "Yayında" : "Yayında değil"} ·{" "}
                        {member.kurucu_durumunu_goster
                          ? "Profilde rozet görünür"
                          : "Rozet profilde gizli"}
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        className="button danger"
                        type="button"
                        disabled={busy === member.uzman_id}
                        onClick={() => onRemoveMember(member)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        {busy === member.uzman_id
                          ? "Çıkarılıyor…"
                          : "Programdan çıkar"}
                      </button>
                    </div>
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

export function AdminFounding({ onChanged }: { onChanged?: () => void }) {
  const founding = useApi<YonetimKurucuUyeleri>(
    "/yonetim/kurucu-programi/uyeler",
  );
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function saveCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("capacity");
    setMessage("");
    try {
      await api("/yonetim/kurucu-programi", {
        method: "PATCH",
        body: JSON.stringify({ azami_uye: Number(form.get("azami_uye")) }),
      });
      founding.reload();
      onChanged?.();
      setMessage("Kurucu programı kontenjan sınırı güncellendi.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedCandidate) return;
    setBusy("add");
    setMessage("");
    try {
      const result = await api<{
        eklenen: { ad: string; kurucu_no: number };
      }>("/yonetim/kurucu-programi/uyeler", {
        method: "POST",
        body: JSON.stringify({ uzman_id: selectedCandidate }),
      });
      setSelectedCandidate("");
      founding.reload();
      onChanged?.();
      setMessage(
        `${result.eklenen.ad} #${String(result.eklenen.kurucu_no).padStart(4, "0")} numarasıyla kurucu programına eklendi.`,
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function removeMember(member: KurucuUyeBilgisi) {
    if (
      !window.confirm(
        `${member.ad} (#${String(member.kurucu_no).padStart(4, "0")}) kurucu programından çıkarılsın mı?`,
      )
    ) {
      return;
    }
    setBusy(member.uzman_id);
    setMessage("");
    try {
      await api(`/yonetim/kurucu-programi/uyeler/${member.uzman_id}`, {
        method: "DELETE",
      });
      founding.reload();
      onChanged?.();
      setMessage(`${member.ad} kurucu programından çıkarıldı.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <AdminFoundingView
      data={founding.data}
      loading={founding.loading}
      error={founding.error}
      retry={founding.reload}
      selectedCandidate={selectedCandidate}
      searchTerm={searchTerm}
      busy={busy}
      message={message}
      onSelectCandidate={setSelectedCandidate}
      onSearchChange={setSearchTerm}
      onSaveCapacity={saveCapacity}
      onAddMember={addMember}
      onRemoveMember={removeMember}
    />
  );
}
