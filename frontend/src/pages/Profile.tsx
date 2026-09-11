import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, MapPin, ShieldCheck, Video } from "lucide-react";
import { api, Aydinlatma, Profil, para, tarih } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../lib/auth";
import { Status } from "../components/Status";
import { Avatar } from "../components/Avatar";

export function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const profile = useApi<Profil>(`/uzmanlar/${id}`);
  const slots = useApi<{ saatler: string[] }>(`/uzmanlar/${id}/saatler`);
  const recommendations = useApi<{ toplam: number }>(
    `/uzmanlar/${id}/tavsiyeler`,
  );
  const legal = useApi<Aydinlatma>("/aydinlatma");
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [endorsement, setEndorsement] = useState("");
  useEffect(() => {
    setChosen("");
    setSuccess("");
    setError("");
  }, [id]);
  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen || !legal.data) return;
    setBusy(true);
    setError("");
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await api<{ mesaj: string }>("/randevular", {
        method: "POST",
        body: JSON.stringify({
          uzman_id: id,
          baslangic: chosen,
          ad: form.get("ad"),
          telefon: form.get("telefon"),
          aydinlatma_okundu: form.has("okundu"),
          aydinlatma_surumu: legal.data.surum,
        }),
      });
      setSuccess(result.mesaj);
      formElement.reset();
      setChosen("");
      slots.reload();
    } catch (e) {
      setError((e as Error).message);
      slots.reload();
      setChosen("");
    } finally {
      setBusy(false);
    }
  }
  if (profile.loading || profile.error)
    return (
      <Status
        loading={profile.loading}
        error={profile.error}
        retry={profile.reload}
      />
    );
  const p = profile.data!;
  const dates = Array.from(
    new Set(slots.data?.saatler.map((s) => s.slice(0, 10))),
  );
  return (
    <section className="profile-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={15} /> Uzmanlara dön
      </Link>
      <div className="detail-layout">
        <div>
          <div className="profile-title">
            <Avatar ad={p.ad} large />
            <div>
              <span className="verified">
                <Check size={12} /> Onaylı profil
              </span>
              <h1>{p.ad}</h1>
              <p className="location">
                <MapPin size={15} /> {p.ilce}, {p.sehir} · {p.deneyim_yili} yıl
                deneyim
              </p>
            </div>
          </div>
          <div className="detail-section">
            <h2>Tanışalım</h2>
            <p className="biography">{p.biyografi}</p>
            <div className="tags">
              {p.uzmanliklar.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          </div>
          <div className="detail-section">
            <h2>Terapi yaklaşımı</h2>
            <p>{p.ekoller.join(", ") || "Belirtilmemiş"}</p>
            <h3>Çalıştığı danışan grupları</h3>
            <p>{p.kitle.join(", ") || "Belirtilmemiş"}</p>
            <p className="formats">
              <Video size={16} />
              {p.formatlar.join(" · ")}
            </p>
          </div>
          <div className="detail-section">
            <h2>Eğitim ve deneyim</h2>
            {p.egitim.length ? (
              <ul>
                {p.egitim.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p>Eğitim bilgisi henüz eklenmedi.</p>
            )}
            {p.kurumlar.length > 0 && (
              <>
                <h3>Çalıştığı kurumlar</h3>
                <ul>
                  {p.kurumlar.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            {p.adres && (
              <>
                <h3>Görüşme adresi</h3>
                <p>{p.adres}</p>
              </>
            )}
          </div>
          <div className="detail-section">
            <h2>Meslektaş tavsiyeleri</h2>
            <p>
              {recommendations.data?.toplam ?? 0} onaylı uzman bu profili
              tavsiye ediyor.
            </p>
            {user?.rol === "uzman" && (
              <div className="inline-fields">
                {[true, false].map((value) => (
                  <button
                    className="button secondary"
                    key={String(value)}
                    onClick={async () => {
                      try {
                        await api(`/uzmanlar/${id}/tavsiye`, {
                          method: "PUT",
                          body: JSON.stringify({ tavsiye: value }),
                        });
                        recommendations.reload();
                        setEndorsement(
                          value
                            ? "Tavsiyeniz kaydedildi."
                            : "Tavsiyeniz geri alındı.",
                        );
                      } catch (e) {
                        setEndorsement((e as Error).message);
                      }
                    }}
                  >
                    {value ? "Tavsiye et" : "Tavsiyemi geri al"}
                  </button>
                ))}
              </div>
            )}
            {endorsement && (
              <p className="notice" role="status">
                {endorsement}
              </p>
            )}
          </div>
        </div>
        <aside className="booking-panel">
          <span className="eyebrow">İLK ADIMI ATIN</span>
          <h2>Bir görüşme planlayın</h2>
          <div className="booking-price">
            {para(p.ucret)}
            <span> / görüşme · 60 dakika</span>
          </div>
          <p className="muted small">
            Saatler Türkiye saatine göredir. Talebiniz uzman tarafından
            değerlendirilecektir.
          </p>
          <Status
            loading={slots.loading}
            error={slots.error}
            retry={slots.reload}
          />
          {success && (
            <div className="notice" role="status">
              <ShieldCheck size={20} />
              <p>{success}</p>
              <button className="text-button" onClick={() => setSuccess("")}>
                Yeni talep oluştur
              </button>
            </div>
          )}
          {!success && (
            <form onSubmit={book}>
              <label className="field">
                Gün ve saat
                <select
                  value={chosen}
                  onChange={(e) => setChosen(e.target.value)}
                  required
                >
                  <option value="">Uygun bir saat seçin</option>
                  {dates.map((date) => (
                    <optgroup
                      key={date}
                      label={new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "full",
                        timeZone: "Europe/Istanbul",
                      }).format(new Date(date + "T12:00:00+03:00"))}
                    >
                      {slots.data?.saatler
                        .filter((s) => s.startsWith(date))
                        .map((s) => (
                          <option key={s} value={s}>
                            {tarih(s)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {!slots.loading && slots.data?.saatler.length === 0 && (
                <p className="notice">
                  Önümüzdeki 15 gün için uygun saat bulunmuyor.
                </p>
              )}
              <label className="field">
                Adınız ve soyadınız
                <input
                  name="ad"
                  autoComplete="off"
                  minLength={3}
                  maxLength={150}
                  required
                />
              </label>
              <label className="field">
                Telefon numaranız
                <input
                  name="telefon"
                  type="tel"
                  autoComplete="off"
                  placeholder="05XX XXX XX XX"
                  pattern="\+?[0-9 \(\)\-]{10,20}"
                  maxLength={20}
                  required
                />
              </label>
              <details className="legal-details">
                <summary>Kişisel verilerin işlenmesi hakkında</summary>
                <p>{legal.data?.metin || "Metin yükleniyor…"}</p>
                <Link to="/aydinlatma">Metnin tamamı</Link>
              </details>
              <label className="consent">
                <input type="checkbox" name="okundu" required />
                Aydınlatma metnini okudum.
              </label>
              <p className="muted small">
                Bu formda tanı, terapi notu veya başka sağlık bilgisi istenmez.
              </p>
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button full-width"
                disabled={busy || !chosen || !legal.data}
              >
                {busy ? "Gönderiliyor…" : "Randevu talebi gönder"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
