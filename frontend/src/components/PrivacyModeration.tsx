import { FormEvent, useEffect, useState } from "react";
import { Flag, ShieldOff, Trash2, UserX } from "lucide-react";
import { api, Endorsement, GorunurlukAyarlari, UzmanEngeli } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

const visibilityOptions: Array<{
  key: keyof GorunurlukAyarlari;
  label: string;
  description: string;
}> = [
  {
    key: "davet_edeni_goster",
    label: "Davet eden terapisti göster",
    description:
      "Davet yoluyla oluşan ilişki türünü mesleki ağınızda yayınlar.",
  },
  {
    key: "mesleki_agi_goster",
    label: "Mesleki ağı göster",
    description:
      "Kabul edilmiş profesyonel bağlantılarınızı açık profilde yayınlar.",
  },
  {
    key: "uzmanlik_iliskilerini_goster",
    label: "Alan ilişkilendirmelerini göster",
    description:
      "Meslektaşların profilinizle ilişkilendirdiği alan sayılarını yayınlar.",
  },
  {
    key: "tavsiyeleri_goster",
    label: "Terapist önerilerini göster",
    description:
      "Çalışmadığınız alanlar için önerdiğiniz meslektaşları yayınlar.",
  },
  {
    key: "yonlendirme_agini_goster",
    label: "Yönlendirme ağını göster",
    description:
      "Danışan bilgisi veya yönlendirme nedeni olmadan yönlendirdiğiniz terapistleri açık profilinizde yayınlar.",
  },
  {
    key: "kurucu_durumunu_goster",
    label: "Founding Therapist durumunu göster",
    description: "Kurucu numaranızı açık profilinizde yayınlar.",
  },
];

const peerContextLabels: Record<string, string> = {
  worked_together: "Birlikte çalıştık",
  same_training_program: "Aynı eğitim programındaydık",
  supervision_context: "Süpervizyon ortamından tanıyor",
  referred_client_to: "Size danışan yönlendirdi",
  received_client_referral: "Sizden danışan yönlendirmesi aldı",
  follows_professional_work: "Profesyonel çalışmalarınızı takip ediyor",
  referral_relationship: "Yönlendirme ilişkisi (eski kayıt)",
};

export function PrivacyModeration() {
  const visibility = useApi<GorunurlukAyarlari>("/uzman/gorunurluk");
  const endorsements = useApi<{ endorsementlar: Endorsement[] }>(
    "/uzman/endorsementlar",
  );
  const blocks = useApi<{ engeller: UzmanEngeli[] }>("/uzman/engeller");
  const [settings, setSettings] = useState<GorunurlukAyarlari>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (visibility.data) setSettings(visibility.data);
  }, [visibility.data]);

  async function saveVisibility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setBusy("visibility");
    setMessage("");
    try {
      const result = await api<GorunurlukAyarlari>("/uzman/gorunurluk", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(result);
      setMessage("Görünürlük tercihleriniz kaydedildi.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function reportEndorsement(item: Endorsement) {
    if (!window.confirm(`${item.uzmanlik} ilişkisi incelemeye gönderilsin mi?`))
      return;
    setBusy(item.id);
    setMessage("");
    try {
      await api(`/uzman/endorsementlar/${item.id}/rapor`, {
        method: "POST",
        body: JSON.stringify({ aciklama: "Yanlış mesleki alan ilişkisi" }),
      });
      setMessage("Alan ilişkisi moderasyon incelemesine gönderildi.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function removeEndorsement(item: Endorsement) {
    if (
      !window.confirm(`${item.uzmanlik} ilişkisi profilinizden kaldırılsın mı?`)
    )
      return;
    setBusy(item.id);
    setMessage("");
    try {
      await api(`/uzman/endorsementlar/${item.id}`, { method: "DELETE" });
      await endorsements.reload();
      setMessage("Alan ilişkisi profilinizden kaldırıldı.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function unblock(item: UzmanEngeli) {
    setBusy(item.terapist.id);
    setMessage("");
    try {
      await api(`/uzman/engeller/${item.terapist.id}`, { method: "DELETE" });
      await blocks.reload();
      setMessage(
        "Kullanıcı engeli kaldırıldı. Önceki ilişkiler geri yüklenmedi.",
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="narrow-content privacy-panel">
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <section className="privacy-section" aria-labelledby="visibility-title">
        <span className="eyebrow">AÇIK PROFİL KONTROLLERİ</span>
        <h2 id="visibility-title">Görünürlük tercihleri</h2>
        <p className="muted">
          Kimlik, doğrulama ve temel profil bilgileriniz yayında kalır.
          Aşağıdaki profesyonel ağ bölümlerini ayrı ayrı yönetebilirsiniz.
        </p>
        <Status
          loading={visibility.loading}
          error={visibility.error}
          retry={visibility.reload}
        />
        {settings && (
          <form onSubmit={saveVisibility}>
            <div className="visibility-options">
              {visibilityOptions.map((option) => (
                <label key={option.key}>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[option.key]}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        [option.key]: event.target.checked,
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <button
              className="button"
              type="submit"
              disabled={busy === "visibility"}
            >
              {busy === "visibility" ? "Kaydediliyor…" : "Tercihleri kaydet"}
            </button>
          </form>
        )}
      </section>

      <section className="privacy-section" aria-labelledby="endorsements-title">
        <span className="eyebrow">PROFİLİNİZDEKİ İLİŞKİLER</span>
        <h2 id="endorsements-title">Alan ilişkilendirmeleri</h2>
        <Status
          loading={endorsements.loading}
          error={endorsements.error}
          retry={endorsements.reload}
        />
        {endorsements.data?.endorsementlar.length === 0 && (
          <p className="empty-state">
            Profilinizde kaldırılabilecek alan ilişkisi yok.
          </p>
        )}
        <div className="moderation-list">
          {endorsements.data?.endorsementlar.map((item) => (
            <article key={item.id}>
              <div>
                <h3>{item.uzmanlik}</h3>
                <p>
                  {item.meslektas.ad} ·{" "}
                  {peerContextLabels[item.profesyonel_baglam]}
                </p>
              </div>
              <div className="actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => reportEndorsement(item)}
                >
                  <Flag size={16} /> Yanlış ilişkiyi bildir
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={busy === item.id}
                  onClick={() => removeEndorsement(item)}
                >
                  <Trash2 size={16} /> Kaldır
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="privacy-section" aria-labelledby="blocks-title">
        <span className="eyebrow">ETKİLEŞİM SINIRLARI</span>
        <h2 id="blocks-title">Engellenen kullanıcılar</h2>
        <p className="muted">
          Engelleme yeni bağlantı, öneri ve alan ilişkilendirme işlemlerini iki
          yönde durdurur.
        </p>
        <Status
          loading={blocks.loading}
          error={blocks.error}
          retry={blocks.reload}
        />
        {blocks.data?.engeller.length === 0 && (
          <p className="empty-state">
            <ShieldOff size={24} /> Engellediğiniz kullanıcı yok.
          </p>
        )}
        <div className="moderation-list">
          {blocks.data?.engeller.map((item) => (
            <article key={item.terapist.id}>
              <div>
                <h3>{item.terapist.ad}</h3>
                <p>Engellenen terapist</p>
              </div>
              <button
                className="button secondary"
                type="button"
                disabled={busy === item.terapist.id}
                onClick={() => unblock(item)}
              >
                <UserX size={16} /> Engeli kaldır
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
