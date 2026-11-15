import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  GripVertical,
  Lock,
  LockOpen,
  MousePointerClick,
  Music2,
  Pencil,
  Play,
  PlaySquare,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { api, KaynakAcYaniti, ProfilKaynagi } from "../lib/api";
import { olayBildir } from "../lib/analytics";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

const categories = [
  { value: "hepsi", label: "Hepsi" },
  { value: "yazi", label: "Yazılar" },
  { value: "kitap", label: "Kitaplar" },
  { value: "podcast", label: "Podcast" },
  { value: "diger", label: "Diğer" },
] as const;

const scheduleLabels: Record<string, string> = {
  aktif: "Yayında",
  planli: "Planlandı",
  suresi_doldu: "Süresi doldu",
};

function toDatetimeLocal(ts?: number | null): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = new Date(trimmed).getTime();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.floor(ms / 1000);
}

function formatShortDateTime(ts: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(ts * 1000));
}

function detectEmbedHint(rawUrl: string): "youtube" | "spotify" | "none" {
  const value = rawUrl.trim();
  if (!value.startsWith("https://")) return "none";
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "youtu.be" ||
      host.endsWith("youtube.com") ||
      host.endsWith("youtube-nocookie.com")
    ) {
      return "youtube";
    }
    if (host === "open.spotify.com") return "spotify";
  } catch {
    return "none";
  }
  return "none";
}

export function ProfileResources({
  therapistId,
  isOwner,
  initialResources,
}: {
  therapistId: string;
  isOwner: boolean;
  initialResources?: ProfilKaynagi[];
}) {
  const resources = useApi<ProfilKaynagi[]>(
    isOwner ? "/uzman/kaynaklar" : `/uzmanlar/${therapistId}/kaynaklar`,
    undefined,
    initialResources,
  );
  const [ordered, setOrdered] = useState<ProfilKaynagi[]>(
    initialResources ?? [],
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]["value"]>("hepsi");
  const [sort, setSort] = useState<"sira" | "tiklama">("sira");
  const [editing, setEditing] = useState(false);
  const [editingResource, setEditingResource] = useState<ProfilKaynagi | null>(
    null,
  );
  const [formUrl, setFormUrl] = useState("");
  const [formHighlighted, setFormHighlighted] = useState(false);
  const [formEmbedVisual, setFormEmbedVisual] = useState(true);
  const [dragId, setDragId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Medya oynatıcı açık kartlar & kilitli link akışı
  const [expandedEmbeds, setExpandedEmbeds] = useState<Record<string, boolean>>(
    {},
  );
  const [unlockedMap, setUnlockedMap] = useState<
    Record<string, KaynakAcYaniti>
  >({});
  const [unlockModalItem, setUnlockModalItem] = useState<ProfilKaynagi | null>(
    null,
  );
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const lockInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setOrdered(resources.data ?? []), [resources.data]);
  useEffect(() => {
    if (editing) {
      setFormUrl(editingResource?.url ?? "");
      setFormHighlighted(Boolean(editingResource?.vurgulu));
      setFormEmbedVisual(
        editingResource ? editingResource.medya_turu !== "none" : true,
      );
      formRef.current?.querySelector("input")?.focus();
    }
  }, [editing, editingResource]);

  useEffect(() => {
    if (!unlockModalItem) return;
    setUnlockCode("");
    setUnlockError("");
    const timer = window.setTimeout(() => lockInputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUnlockModalItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [unlockModalItem]);

  const detectedFormMedia = detectEmbedHint(formUrl);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    const filtered = ordered.filter(
      (item) =>
        (category === "hepsi" || item.kategori === category) &&
        (!term ||
          `${item.baslik} ${item.aciklama} ${item.vurgu_etiketi ?? ""}`
            .toLocaleLowerCase("tr-TR")
            .includes(term)),
    );
    return sort === "tiklama"
      ? [...filtered].sort(
          (a, b) => b.tiklama_sayisi - a.tiklama_sayisi || a.sira - b.sira,
        )
      : filtered;
  }, [ordered, search, category, sort]);
  const canReorder =
    isOwner && !search && category === "hepsi" && sort === "sira";

  async function saveOrder(next: ProfilKaynagi[]) {
    const previous = ordered;
    const normalized = next.map((item, sira) => ({ ...item, sira }));
    setOrdered(normalized);
    setBusy(true);
    setMessage("");
    try {
      await api("/uzman/kaynaklar/sira", {
        method: "PATCH",
        body: JSON.stringify({ ids: normalized.map((item) => item.id) }),
      });
      setMessage("Bağlantı sırası kaydedildi.");
    } catch (error) {
      setOrdered(previous);
      setMessage((error as Error).message);
      resources.reload();
    } finally {
      setBusy(false);
    }
  }

  function move(from: number, to: number) {
    if (!canReorder || busy || to < 0 || to >= ordered.length || from === to)
      return;
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void saveOrder(next);
  }

  async function shareResource(item: ProfilKaynagi, unlockedUrl?: string) {
    const fallbackUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const shareUrl =
      unlockedUrl || (!item.kilitli && item.url ? item.url : "") || fallbackUrl;
    if (!shareUrl) return;

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: item.baslik,
          text: item.aciklama || item.baslik,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShareId(item.id);
        window.setTimeout(() => {
          setCopiedShareId((current) => (current === item.id ? "" : current));
        }, 2200);
      } catch {
        // Pano erişimi engellenirse sessiz kal
      }
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const startTs = fromDatetimeLocal(
      String(data.get("baslangic_zamani") ?? ""),
    );
    const endTs = fromDatetimeLocal(String(data.get("bitis_zamani") ?? ""));
    const rawCode = String(data.get("erisim_kodu") ?? "").trim();
    const removeLock = data.get("kilidi_kaldir") === "on";
    const highlighted = data.get("vurgulu") === "on";
    const highlightLabel = String(data.get("vurgu_etiketi") ?? "").trim();
    const embedEnabled = data.get("medya_gomme") === "on";

    setBusy(true);
    setMessage("");
    try {
      await api(
        editingResource
          ? `/uzman/kaynaklar/${editingResource.id}`
          : "/uzman/kaynaklar",
        {
          method: editingResource ? "PATCH" : "POST",
          body: JSON.stringify({
            baslik: data.get("baslik"),
            aciklama: data.get("aciklama"),
            url: data.get("url"),
            kategori: data.get("kategori"),
            vurgulu: highlighted,
            vurgu_etiketi: highlighted ? highlightLabel : "",
            baslangic_zamani: startTs,
            bitis_zamani: endTs,
            erisim_kodu: rawCode || null,
            kilidi_kaldir: removeLock,
            medya_gomme: embedEnabled,
          }),
        },
      );
      form.reset();
      setEditing(false);
      setEditingResource(null);
      setMessage(
        editingResource ? "Bağlantı güncellendi." : "Bağlantı eklendi.",
      );
      resources.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(resourceId: string) {
    if (
      !window.confirm("Bu bağlantıyı profilinizden kaldırmak istiyor musunuz?")
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/uzman/kaynaklar/${resourceId}`, { method: "DELETE" });
      setMessage("Bağlantı kaldırıldı.");
      resources.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unlockModalItem) return;
    setUnlockBusy(true);
    setUnlockError("");
    try {
      const res = await api<KaynakAcYaniti>(
        `/kaynaklar/${unlockModalItem.id}/ac`,
        {
          method: "POST",
          body: JSON.stringify({ kod: unlockCode.trim() }),
        },
      );
      setUnlockedMap((prev) => ({ ...prev, [unlockModalItem.id]: res }));
      if (res.medya_embed_url) {
        setExpandedEmbeds((prev) => ({
          ...prev,
          [unlockModalItem.id]: true,
        }));
      }
      if (!isOwner) {
        olayBildir("link_unlock", {
          uzman_id: therapistId,
          hedef_kaynak_id: unlockModalItem.id,
        });
      }
      setUnlockModalItem(null);
      if (!res.medya_embed_url && res.url && typeof window !== "undefined") {
        const opened = window.open(res.url, "_blank", "noopener,noreferrer");
        if (!opened) {
          window.location.assign(res.url);
        }
      }
    } catch (err) {
      setUnlockError((err as Error).message);
    } finally {
      setUnlockBusy(false);
    }
  }

  function toggleMediaEmbed(itemId: string) {
    setExpandedEmbeds((prev) => {
      const opening = !(prev[itemId] ?? true);
      if (opening && !isOwner) {
        olayBildir("embed_play", {
          uzman_id: therapistId,
          hedef_kaynak_id: itemId,
        });
      }
      return { ...prev, [itemId]: opening };
    });
  }

  if (!isOwner && !resources.loading && !resources.error && !ordered.length)
    return null;

  return (
    <section
      id="baglantilar"
      className={`bento-card resource-card ${isOwner && !ordered.length ? "owner-empty" : ""}`}
      aria-labelledby="resources-title"
    >
      <div className="bento-card-heading">
        <div>
          <span className="eyebrow">BAĞLANTILAR VE KAYNAKLAR</span>
          <h2 id="resources-title">Bağlantılarım</h2>
        </div>
        {isOwner && (
          <button
            className="button secondary resource-add"
            type="button"
            onClick={() => {
              setEditingResource(null);
              setEditing(true);
            }}
            aria-expanded={editing}
          >
            <Plus size={17} aria-hidden="true" /> Bağlantı ekle
          </button>
        )}
      </div>
      {isOwner && !ordered.length && !resources.loading && (
        <p className="muted">
          BDT/Şema form bağlantıları, grup terapisi duyuruları, Spotify
          mindfulness listeleri veya YouTube psiko-eğitim videoları ekleyin.
        </p>
      )}
      {editing && (
        <form
          ref={formRef}
          className="resource-form resource-pro-form"
          onSubmit={add}
          key={editingResource?.id ?? "yeni"}
        >
          <label className="field">
            Başlık
            <input
              name="baslik"
              required
              minLength={3}
              maxLength={120}
              placeholder="Örn. BDT Düşünce Kaydı Formu veya Haftalık Mindfulness"
              defaultValue={editingResource?.baslik}
            />
          </label>
          <label className="field">
            HTTPS bağlantısı
            <input
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://"
              required
              maxLength={1000}
              defaultValue={editingResource?.url}
              onChange={(e) => setFormUrl(e.target.value)}
            />
          </label>
          {detectedFormMedia !== "none" && (
            <div className="resource-media-detect" role="status">
              {detectedFormMedia === "spotify" ? (
                <Music2 size={15} aria-hidden="true" />
              ) : (
                <Youtube size={15} aria-hidden="true" />
              )}
              <span>
                {detectedFormMedia === "spotify" ? "Spotify" : "YouTube"}{" "}
                bağlantısı algılandı; sayfa içi oynatıcı olarak sunulabilir.
              </span>
            </div>
          )}
          <label className="field">
            Kısa açıklama (isteğe bağlı)
            <input
              name="aciklama"
              maxLength={240}
              placeholder="Danışana ne işe yaradığını tek cümlede anlatın"
              defaultValue={editingResource?.aciklama}
            />
          </label>
          <label className="field">
            Kategori
            <select
              name="kategori"
              defaultValue={editingResource?.kategori ?? "diger"}
            >
              {categories.slice(1).map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="resource-pro-fieldset">
            <legend>Pro özellik</legend>

            <input
              type="hidden"
              name="vurgulu"
              value={formHighlighted ? "on" : ""}
            />
            <button
              type="button"
              className={`resource-highlight-toggle${formHighlighted ? " is-active" : ""}`}
              aria-pressed={formHighlighted}
              onClick={() => setFormHighlighted((prev) => !prev)}
            >
              <span
                className="resource-highlight-toggle-icon"
                aria-hidden="true"
              >
                <Sparkles size={17} />
              </span>
              <span className="resource-highlight-toggle-copy">
                <strong>Dikkat çekici vurgulu bağlantı</strong>
                <span>Öncelikli randevu, kriz hattı veya öne çıkan duyuru</span>
              </span>
              <span
                className="resource-highlight-toggle-switch"
                aria-hidden="true"
              >
                <span className="resource-highlight-toggle-thumb" />
              </span>
            </button>

            {formHighlighted && (
              <label className="field">
                Vurgu etiketi (isteğe bağlı)
                <input
                  name="vurgu_etiketi"
                  maxLength={40}
                  placeholder="Örn. Öncelikli, Acil Destek, Yeni Grup"
                  defaultValue={editingResource?.vurgu_etiketi ?? ""}
                />
              </label>
            )}

            <div className="resource-schedule-grid">
              <label className="field">
                Yayın başlangıcı (isteğe bağlı)
                <input
                  name="baslangic_zamani"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(
                    editingResource?.baslangic_zamani,
                  )}
                />
              </label>
              <label className="field">
                Yayın bitişi (otomatik gizlenir)
                <input
                  name="bitis_zamani"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(editingResource?.bitis_zamani)}
                />
              </label>
            </div>

            <div className="resource-lock-editor">
              <label className="field">
                Erişim kodu / şifre (isteğe bağlı, en az 4 karakter)
                <input
                  name="erisim_kodu"
                  type="password"
                  autoComplete="new-password"
                  minLength={4}
                  maxLength={32}
                  placeholder={
                    editingResource?.kilitli
                      ? "Değiştirmek için yeni kod girin (mevcut kod korunur)"
                      : "Sadece kodu bilen danışanlar BDT formunu açabilir"
                  }
                />
              </label>
              {editingResource?.kilitli && (
                <label className="consent">
                  <input type="checkbox" name="kilidi_kaldir" /> Bu bağlantının
                  şifre kilidini kaldır
                </label>
              )}
            </div>

            <div className="resource-display-mode">
              <input
                type="hidden"
                name="medya_gomme"
                value={formEmbedVisual ? "on" : ""}
              />
              <div className="resource-display-mode-head">
                <strong>Paylaşılan medyayı nasıl sergilemek istersiniz?</strong>
                <span>
                  YouTube, TikTok, Spotify gibi paylaşımların profilde nasıl
                  görüneceğini seçin.
                </span>
              </div>
              <div
                className="resource-display-mode-options"
                role="group"
                aria-label="Medya sergileme şekli"
              >
                <button
                  type="button"
                  className={`resource-display-option${!formEmbedVisual ? " is-active" : ""}`}
                  aria-pressed={!formEmbedVisual}
                  onClick={() => setFormEmbedVisual(false)}
                >
                  <span
                    className="resource-display-option-icon"
                    aria-hidden="true"
                  >
                    <MousePointerClick size={18} />
                  </span>
                  <span className="resource-display-option-copy">
                    <strong>Buton şeklinde</strong>
                    <span>Klasik bağlantı butonu olarak listelenir</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`resource-display-option${formEmbedVisual ? " is-active" : ""}`}
                  aria-pressed={formEmbedVisual}
                  onClick={() => setFormEmbedVisual(true)}
                >
                  <span
                    className="resource-display-option-icon"
                    aria-hidden="true"
                  >
                    <PlaySquare size={18} />
                  </span>
                  <span className="resource-display-option-copy">
                    <strong>Görsel olarak sergile</strong>
                    <span>Sayfa içinde doğrudan oynatıcı olarak görünür</span>
                  </span>
                </button>
              </div>
            </div>
          </fieldset>

          <div className="actions">
            <button className="button" type="submit" disabled={busy}>
              {editingResource ? "Değişiklikleri kaydet" : "Bağlantıyı kaydet"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setEditing(false);
                setEditingResource(null);
              }}
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}
      <Status
        loading={resources.loading}
        error={resources.error}
        retry={resources.reload}
      />
      {ordered.length > 0 && (
        <>
          {ordered.length >= 5 && (
            <>
              <div className="resource-controls">
                <label className="resource-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="sr-only">Bağlantılarda ara</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Bağlantılarda ara..."
                  />
                </label>
                <label className="resource-sort">
                  <span className="sr-only">Kaynak sıralaması</span>
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as "sira" | "tiklama")
                    }
                  >
                    <option value="sira">Önerilen sıra</option>
                    <option value="tiklama">En çok açılanlar</option>
                  </select>
                </label>
              </div>
              <div
                className="resource-filters"
                aria-label="Kaynak kategorileri"
              >
                {categories.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={category === item.value ? "is-active" : ""}
                    aria-pressed={category === item.value}
                    onClick={() => setCategory(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {isOwner && !canReorder && (
            <p className="muted small">
              Sırayı değiştirmek için aramayı ve kategori filtresini temizleyip
              “Önerilen sıra”yı seçin.
            </p>
          )}
          {visible.length ? (
            <ul className="resource-list">
              {visible.map((item) => {
                const index = ordered.findIndex(
                  (entry) => entry.id === item.id,
                );
                const unlocked = unlockedMap[item.id];
                const isLockedForVisitor = Boolean(
                  item.kilitli && !isOwner && !unlocked,
                );
                const embedUrl =
                  unlocked?.medya_embed_url ?? item.medya_embed_url;
                const mediaType =
                  unlocked?.medya_turu ?? item.medya_turu ?? "none";
                const hasEmbed = Boolean(
                  mediaType !== "none" && embedUrl && !isLockedForVisitor,
                );
                const embedOpen = expandedEmbeds[item.id] ?? true;
                const scheduleState = item.zaman_durumu ?? "aktif";
                const isScheduled = Boolean(
                  item.baslangic_zamani || item.bitis_zamani,
                );

                const hideMainButtonForEmbed = Boolean(
                  hasEmbed && embedOpen && embedUrl,
                );

                return (
                  <li
                    key={item.id}
                    className={[
                      "resource-row",
                      item.vurgulu ? "is-highlighted" : "",
                      scheduleState !== "aktif" ? "is-dimmed" : "",
                      hideMainButtonForEmbed ? "is-embed-open" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    draggable={canReorder && !busy}
                    onDragStart={() => setDragId(item.id)}
                    onDragOver={(event) => {
                      if (canReorder) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = ordered.findIndex(
                        (entry) => entry.id === dragId,
                      );
                      if (from >= 0) move(from, index);
                      setDragId("");
                    }}
                    onDragEnd={() => setDragId("")}
                  >
                    {(!hideMainButtonForEmbed || isOwner) && (
                      <div className="resource-row-main">
                        {canReorder && (
                          <GripVertical
                            size={18}
                            aria-hidden="true"
                            className="resource-grip"
                          />
                        )}

                        {hideMainButtonForEmbed ? (
                          <div className="resource-embed-owner-label">
                            <strong>{item.baslik}</strong>
                          </div>
                        ) : (
                          <div className="resource-link-shell">
                            {isLockedForVisitor ? (
                              <button
                                type="button"
                                className={`resource-link-button has-share-slot is-locked ${item.vurgulu ? "is-highlighted" : ""}`}
                                onClick={() => setUnlockModalItem(item)}
                              >
                                <span className="resource-category">
                                  <Lock size={12} aria-hidden="true" /> Şifreli
                                  Form
                                </span>
                                <span className="resource-link-copy">
                                  <span className="resource-title-line">
                                    <strong>{item.baslik}</strong>
                                    {item.vurgulu && (
                                      <span className="resource-highlight-pill">
                                        <span
                                          className="pulse-dot"
                                          aria-hidden="true"
                                        />
                                        {item.vurgu_etiketi || "Öne çıkan"}
                                      </span>
                                    )}
                                  </span>
                                  <small>
                                    {item.aciklama ||
                                      "Erişim kodu ile danışanlara özel bağlantı"}
                                  </small>
                                </span>
                              </button>
                            ) : unlocked ? (
                              <a
                                className={`resource-link-button has-share-slot is-unlocked ${item.vurgulu ? "is-highlighted" : ""}`}
                                href={unlocked.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <span className="resource-category">
                                  <LockOpen size={12} aria-hidden="true" />{" "}
                                  Açıldı
                                </span>
                                <span className="resource-link-copy">
                                  <strong>{item.baslik}</strong>
                                  <small>
                                    Erişim kodu doğrulandı · Açmak için tıklayın
                                  </small>
                                </span>
                              </a>
                            ) : hasEmbed ? (
                              <button
                                type="button"
                                className={`resource-link-button has-share-slot is-embed-trigger ${item.vurgulu ? "is-highlighted" : ""}`}
                                aria-expanded={embedOpen}
                                onClick={() => toggleMediaEmbed(item.id)}
                              >
                                <span className="resource-category">
                                  {mediaType === "spotify" ? (
                                    <Music2 size={12} aria-hidden="true" />
                                  ) : (
                                    <Youtube size={12} aria-hidden="true" />
                                  )}
                                  {mediaType === "spotify"
                                    ? "Spotify"
                                    : "YouTube"}
                                </span>
                                <span className="resource-link-copy">
                                  <span className="resource-title-line">
                                    <strong>{item.baslik}</strong>
                                    {item.vurgulu && (
                                      <span className="resource-highlight-pill">
                                        <span
                                          className="pulse-dot"
                                          aria-hidden="true"
                                        />
                                        {item.vurgu_etiketi || "Öne çıkan"}
                                      </span>
                                    )}
                                  </span>
                                  {item.aciklama ? (
                                    <small>{item.aciklama}</small>
                                  ) : (
                                    <small>
                                      {embedOpen
                                        ? "Oynatıcıyı gizle"
                                        : "Sayfadan çıkmadan burada dinle / izle"}
                                    </small>
                                  )}
                                </span>
                                <span className="resource-play-badge">
                                  <Play size={14} aria-hidden="true" />
                                  {embedOpen ? "Gizle" : "Oynat"}
                                </span>
                              </button>
                            ) : (
                              <a
                                className={`resource-link-button has-share-slot ${item.vurgulu ? "is-highlighted" : ""}`}
                                href={`/api/kaynaklar/${item.id}/ac`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  if (!isOwner) {
                                    olayBildir("resource_click", {
                                      uzman_id: therapistId,
                                      hedef_kaynak_id: item.id,
                                    });
                                  }
                                }}
                              >
                                <span className="resource-category">
                                  {item.kilitli && (
                                    <Lock size={11} aria-hidden="true" />
                                  )}
                                  {
                                    categories.find(
                                      (entry) => entry.value === item.kategori,
                                    )?.label
                                  }
                                </span>
                                <span className="resource-link-copy">
                                  <span className="resource-title-line">
                                    <strong>{item.baslik}</strong>
                                    {item.vurgulu && (
                                      <span className="resource-highlight-pill">
                                        <span
                                          className="pulse-dot"
                                          aria-hidden="true"
                                        />
                                        {item.vurgu_etiketi || "Öne çıkan"}
                                      </span>
                                    )}
                                  </span>
                                  {item.aciklama && (
                                    <small>{item.aciklama}</small>
                                  )}
                                </span>
                              </a>
                            )}

                            <button
                              type="button"
                              className={`resource-share-button${copiedShareId === item.id ? " is-copied" : ""}`}
                              aria-label={`${item.baslik} bağlantısını paylaş`}
                              title={
                                copiedShareId === item.id
                                  ? "Bağlantı kopyalandı"
                                  : "Paylaş"
                              }
                              onClick={() =>
                                void shareResource(item, unlocked?.url)
                              }
                            >
                              {copiedShareId === item.id ? (
                                <Check size={16} aria-hidden="true" />
                              ) : (
                                <Share2 size={16} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isOwner && (
                      <div className="resource-row-owner-bar">
                        {(item.kilitli ||
                          isScheduled ||
                          item.tiklama_sayisi > 0) && (
                          <div className="resource-owner-meta">
                            <span className="tabular-num">
                              {item.tiklama_sayisi} açılış
                            </span>
                            {item.kilitli && (
                              <span className="resource-meta-chip">
                                <Lock size={12} aria-hidden="true" /> Şifreli
                              </span>
                            )}
                            {isScheduled && (
                              <span
                                className={`resource-meta-chip status-${scheduleState}`}
                              >
                                <Clock3 size={12} aria-hidden="true" />{" "}
                                {scheduleLabels[scheduleState]}
                                {item.bitis_zamani
                                  ? ` · Bitiş: ${formatShortDateTime(item.bitis_zamani)}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="resource-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingResource(item);
                              setEditing(true);
                            }}
                            disabled={busy}
                            aria-label={`${item.baslik} düzenle`}
                          >
                            <Pencil size={16} />
                          </button>
                          {canReorder && (
                            <>
                              <button
                                type="button"
                                onClick={() => move(index, index - 1)}
                                disabled={busy || index === 0}
                                aria-label={`${item.baslik} yukarı taşı`}
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => move(index, index + 1)}
                                disabled={busy || index === ordered.length - 1}
                                aria-label={`${item.baslik} aşağı taşı`}
                              >
                                <ArrowDown size={16} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => void remove(item.id)}
                            disabled={busy}
                            aria-label={`${item.baslik} kaldır`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {hasEmbed && embedOpen && embedUrl && (
                      <div
                        className={`resource-embed-frame ${mediaType === "spotify" ? "is-spotify" : "is-youtube"}`}
                      >
                        <iframe
                          title={`${item.baslik} oynatıcı`}
                          src={embedUrl}
                          loading="lazy"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Bu aramayla eşleşen bağlantı yok.</p>
          )}
        </>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {unlockModalItem && (
        <div
          className="tp-modal-backdrop"
          role="presentation"
          onClick={() => setUnlockModalItem(null)}
        >
          <div
            className="tp-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tp-modal-header">
              <div>
                <span className="eyebrow">ŞİFRELİ DANIŞAN BAĞLANTISI</span>
                <h3 id="unlock-modal-title">{unlockModalItem.baslik}</h3>
              </div>
              <button
                type="button"
                className="tp-modal-close"
                aria-label="Kapat"
                onClick={() => setUnlockModalItem(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="muted small">
              Bu BDT / Şema çalışma formu veya kaynak yalnızca uzmanınızın
              paylaştığı erişim kodunu bilen danışanlar içindir.
            </p>
            <form onSubmit={submitUnlock} className="tp-modal-form">
              <label className="field">
                Erişim kodu
                <input
                  ref={lockInputRef}
                  type="password"
                  required
                  minLength={4}
                  maxLength={32}
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  placeholder="Uzmanın verdiği kodu girin"
                />
              </label>
              {unlockError && (
                <p className="notice error" role="alert">
                  {unlockError}
                </p>
              )}
              <div className="actions">
                <button
                  className="button full-width"
                  type="submit"
                  disabled={unlockBusy}
                >
                  {unlockBusy ? "Doğrulanıyor…" : "Kilidi aç ve görüntüle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
