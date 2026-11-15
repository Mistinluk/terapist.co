import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  Plus,
  Reply,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  MesajKisi,
  MesajKonuDetayi,
  MesajKonulariYaniti,
  SiteBildirim,
  SiteBildirimTuru,
  SiteBildirimlerYaniti,
  TekilMesaj,
  api,
  tarih,
} from "../lib/api";

const typeMeta: Record<
  SiteBildirimTuru,
  { label: string; badgeClass: string }
> = {
  yeni_randevu: { label: "Yeni randevu", badgeClass: "is-new" },
  randevu_hatirlatma: {
    label: "Randevu hatırlatması",
    badgeClass: "is-reminder",
  },
  sistem_hatirlatma: {
    label: "Sistem hatırlatması",
    badgeClass: "is-system",
  },
  randevu_guncelleme: {
    label: "Randevu güncelleme",
    badgeClass: "is-update",
  },
  admin_notu: { label: "Mesaj / Duyuru", badgeClass: "is-note" },
};

function NotificationIcon({ tur }: { tur: SiteBildirimTuru }) {
  if (tur === "yeni_randevu")
    return <CalendarPlus size={15} aria-hidden="true" />;
  if (tur === "randevu_hatirlatma")
    return <CalendarClock size={15} aria-hidden="true" />;
  if (tur === "sistem_hatirlatma")
    return <Clock size={15} aria-hidden="true" />;
  return <MessageSquare size={15} aria-hidden="true" />;
}

export function NotificationsAndMessages({
  userRole,
  initialThreadId,
  initialNotificationId,
  initialRecipientId,
  onNavigateAppointments,
}: {
  userRole: string;
  initialThreadId?: string | null;
  initialNotificationId?: string | null;
  initialRecipientId?: string | null;
  onNavigateAppointments?: () => void;
}) {
  const [section, setSection] = useState<"mesajlar" | "bildirimler">(
    initialNotificationId && !initialThreadId ? "bildirimler" : "mesajlar",
  );
  const [contacts, setContacts] = useState<MesajKisi[]>([]);
  const [threadsData, setThreadsData] = useState<MesajKonulariYaniti>({
    toplam_okunmamis: 0,
    konular: [],
  });
  const [notifsData, setNotifsData] = useState<SiteBildirimlerYaniti>({
    okunmamis_sayisi: 0,
    kayitlar: [],
  });
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreadId ?? null,
  );
  const [threadDetail, setThreadDetail] = useState<MesajKonuDetayi | null>(
    null,
  );
  const [loadingHub, setLoadingHub] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  const [composingNew, setComposingNew] = useState(false);
  const [recipientId, setRecipientId] = useState(
    userRole === "yonetici" ? "tumu" : "yonetim",
  );
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [sendingNew, setSendingNew] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const notifyHeaderBell = useCallback(() => {
    window.dispatchEvent(new Event("terapist:bildirim-guncelle"));
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingHub(true);
    try {
      const [contactsRes, threadsRes, notifsRes] = await Promise.all([
        api<MesajKisi[]>("/mesajlar/kisiler"),
        api<MesajKonulariYaniti>("/mesajlar/konular"),
        api<SiteBildirimlerYaniti>("/bildirimler"),
      ]);
      setContacts(contactsRes);
      setThreadsData(threadsRes);
      setNotifsData(notifsRes);

      if (contactsRes.length > 0) {
        setRecipientId((prev) =>
          contactsRes.some((c) => c.id === prev) ? prev : contactsRes[0].id,
        );
      }

      if (initialThreadId) {
        setSection("mesajlar");
        setSelectedThreadId(initialThreadId);
      } else if (initialNotificationId) {
        const matchedNotif = notifsRes.kayitlar.find(
          (n) => n.id === initialNotificationId,
        );
        if (matchedNotif?.konu_id) {
          setSection("mesajlar");
          setSelectedThreadId(matchedNotif.konu_id);
        } else {
          setSection("bildirimler");
        }
      } else if (initialRecipientId) {
        setSection("mesajlar");
        const matchedContact = contactsRes.find(
          (c) =>
            c.id === initialRecipientId ||
            c.uzman_id === initialRecipientId ||
            c.kullanici_id === initialRecipientId,
        );
        const existingThread = threadsRes.konular.find(
          (k) =>
            (matchedContact &&
              k.karsi_taraf.kullanici_id === matchedContact.kullanici_id) ||
            k.karsi_taraf.uzman_id === initialRecipientId ||
            k.karsi_taraf.kullanici_id === initialRecipientId,
        );
        if (existingThread) {
          setComposingNew(false);
          setSelectedThreadId(existingThread.id);
        } else if (matchedContact) {
          setRecipientId(matchedContact.id);
          setComposingNew(true);
        } else if (threadsRes.konular.length > 0) {
          setSelectedThreadId((prev) => prev ?? threadsRes.konular[0].id);
        }
      } else if (threadsRes.konular.length > 0) {
        setSelectedThreadId((prev) => prev ?? threadsRes.konular[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingHub(false);
    }
  }, [initialThreadId, initialNotificationId, initialRecipientId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadThreadDetail = useCallback(
    async (konuId: string) => {
      setLoadingThread(true);
      setError("");
      try {
        const detail = await api<MesajKonuDetayi>(
          `/mesajlar/konular/${konuId}`,
        );
        setThreadDetail(detail);
        setThreadsData((prev) => {
          const target = prev.konular.find((k) => k.id === konuId);
          const cleared = target?.okunmamis_sayisi ?? 0;
          return {
            toplam_okunmamis: Math.max(0, prev.toplam_okunmamis - cleared),
            konular: prev.konular.map((k) =>
              k.id === konuId ? { ...k, okunmamis_sayisi: 0 } : k,
            ),
          };
        });
        setNotifsData((prev) => {
          let marked = 0;
          const nextItems = prev.kayitlar.map((n) => {
            if (!n.okundu && n.konu_id === konuId) {
              marked += 1;
              return { ...n, okundu: true };
            }
            return n;
          });
          return {
            okunmamis_sayisi: Math.max(0, prev.okunmamis_sayisi - marked),
            kayitlar: nextItems,
          };
        });
        notifyHeaderBell();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoadingThread(false);
      }
    },
    [notifyHeaderBell],
  );

  useEffect(() => {
    if (selectedThreadId && !composingNew) {
      void loadThreadDetail(selectedThreadId);
    }
  }, [selectedThreadId, composingNew, loadThreadDetail]);

  async function handleCreateThread(e: FormEvent) {
    e.preventDefault();
    if (newSubject.trim().length < 3 || newBody.trim().length < 2) return;
    setSendingNew(true);
    setError("");
    setFeedback("");
    try {
      const res = await api<{ konu_id: string | null; gonderilen: number }>(
        "/mesajlar/konular",
        {
          method: "POST",
          body: JSON.stringify({
            alici_id: recipientId,
            baslik: newSubject.trim(),
            mesaj: newBody.trim(),
          }),
        },
      );
      setNewSubject("");
      setNewBody("");
      setComposingNew(false);
      setFeedback(
        res.gonderilen > 1
          ? `Toplu mesaj ${res.gonderilen} uzmana iletildi.`
          : "Mesajınız gönderildi.",
      );
      const updatedThreads =
        await api<MesajKonulariYaniti>("/mesajlar/konular");
      setThreadsData(updatedThreads);
      if (res.konu_id) {
        setSelectedThreadId(res.konu_id);
        await loadThreadDetail(res.konu_id);
      }
      notifyHeaderBell();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingNew(false);
    }
  }

  async function handleSendReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedThreadId || replyText.trim().length < 1) return;
    setSendingReply(true);
    setError("");
    setFeedback("");
    try {
      const created = await api<TekilMesaj>(
        `/mesajlar/konular/${selectedThreadId}/yanit`,
        {
          method: "POST",
          body: JSON.stringify({ mesaj: replyText.trim() }),
        },
      );
      setReplyText("");
      setThreadDetail((prev) =>
        prev
          ? {
              ...prev,
              son_mesaj_zamani: created.olusturma,
              mesajlar: [...prev.mesajlar, created],
            }
          : prev,
      );
      const updatedThreads =
        await api<MesajKonulariYaniti>("/mesajlar/konular");
      setThreadsData(updatedThreads);
      notifyHeaderBell();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingReply(false);
    }
  }

  async function markNotificationRead(item: SiteBildirim) {
    if (item.okundu) return;
    setNotifsData((prev) => ({
      okunmamis_sayisi: Math.max(0, prev.okunmamis_sayisi - 1),
      kayitlar: prev.kayitlar.map((n) =>
        n.id === item.id ? { ...n, okundu: true } : n,
      ),
    }));
    try {
      await api(`/bildirimler/${item.id}/okundu`, { method: "PATCH" });
      notifyHeaderBell();
    } catch {
      void loadAll();
    }
  }

  async function markAllNotificationsRead() {
    setNotifsData((prev) => ({
      okunmamis_sayisi: 0,
      kayitlar: prev.kayitlar.map((n) => ({ ...n, okundu: true })),
    }));
    try {
      await api("/bildirimler/tumunu-okundu", { method: "POST" });
      notifyHeaderBell();
    } catch {
      void loadAll();
    }
  }

  function startReplyFromNotification(item: SiteBildirim) {
    void markNotificationRead(item);
    if (item.konu_id) {
      setComposingNew(false);
      setSection("mesajlar");
      setSelectedThreadId(item.konu_id);
      return;
    }
    setSection("mesajlar");
    setComposingNew(true);
    if (item.gonderen_kullanici_id) {
      const matchingContact = contacts.find(
        (c) => c.kullanici_id === item.gonderen_kullanici_id,
      );
      if (matchingContact) {
        setRecipientId(matchingContact.id);
      } else if (item.gonderen_rol === "yonetici") {
        setRecipientId("yonetim");
      }
    } else if (userRole !== "yonetici") {
      setRecipientId("yonetim");
    }
    const prefix = item.baslik.startsWith("Ynt:") ? "" : "Ynt: ";
    setNewSubject(`${prefix}${item.baslik}`.slice(0, 120));
  }

  return (
    <div className="msg-hub">
      <div className="msg-hub-toolbar">
        <div
          className="msg-hub-tabs"
          role="tablist"
          aria-label="Bildirimler ve mesajlar görünümü"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === "mesajlar"}
            className={`msg-hub-tab ${section === "mesajlar" ? "is-active" : ""}`}
            onClick={() => setSection("mesajlar")}
          >
            <MessageSquare size={16} aria-hidden="true" />
            <span>Mesajlar</span>
            {threadsData.toplam_okunmamis > 0 && (
              <span className="msg-hub-pill">
                {threadsData.toplam_okunmamis}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={section === "bildirimler"}
            className={`msg-hub-tab ${section === "bildirimler" ? "is-active" : ""}`}
            onClick={() => setSection("bildirimler")}
          >
            <Bell size={16} aria-hidden="true" />
            <span>Bildirimler</span>
            {notifsData.okunmamis_sayisi > 0 && (
              <span className="msg-hub-pill">
                {notifsData.okunmamis_sayisi}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          className="button msg-new-trigger"
          onClick={() => {
            setSection("mesajlar");
            setComposingNew(true);
            setFeedback("");
            setError("");
          }}
        >
          <Plus size={16} aria-hidden="true" />
          <span>Yeni mesaj yaz</span>
        </button>
      </div>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {feedback && (
        <p className="notice" role="status">
          {feedback}
        </p>
      )}

      {section === "mesajlar" ? (
        <div className="msg-hub-grid">
          <aside className="msg-sidebar" aria-label="Konuşma listesi">
            <header className="msg-sidebar-head">
              <strong>Konuşmalar ({threadsData.konular.length})</strong>
              {threadsData.toplam_okunmamis > 0 && (
                <span className="msg-unread-summary">
                  {threadsData.toplam_okunmamis} okunmamış
                </span>
              )}
            </header>

            {loadingHub && threadsData.konular.length === 0 ? (
              <p className="msg-empty-hint">Konuşmalar yükleniyor...</p>
            ) : threadsData.konular.length === 0 ? (
              <div className="msg-empty-sidebar">
                <p>Henüz başlatılmış bir mesaj konusu yok.</p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setComposingNew(true)}
                >
                  İlk mesajı gönder
                </button>
              </div>
            ) : (
              <ul className="msg-thread-list">
                {threadsData.konular.map((konu) => {
                  const active = !composingNew && selectedThreadId === konu.id;
                  const isAdminPeer = konu.karsi_taraf.rol === "yonetici";
                  return (
                    <li key={konu.id}>
                      <button
                        type="button"
                        className={`msg-thread-item ${active ? "is-active" : ""} ${konu.okunmamis_sayisi > 0 ? "is-unread" : ""}`}
                        onClick={() => {
                          setComposingNew(false);
                          setSelectedThreadId(konu.id);
                          setFeedback("");
                        }}
                      >
                        <div className="msg-thread-top">
                          <span className="msg-peer-name">
                            {isAdminPeer ? (
                              <ShieldCheck size={14} aria-hidden="true" />
                            ) : (
                              <UserRound size={14} aria-hidden="true" />
                            )}
                            <strong>{konu.karsi_taraf.ad}</strong>
                          </span>
                          {konu.okunmamis_sayisi > 0 && (
                            <span className="msg-thread-badge">
                              {konu.okunmamis_sayisi} yeni
                            </span>
                          )}
                        </div>
                        <span className="msg-thread-subject">
                          {konu.baslik}
                        </span>
                        {konu.son_mesaj && (
                          <p className="msg-thread-preview">
                            {konu.son_mesaj.icerik}
                          </p>
                        )}
                        <time className="msg-thread-time">
                          {tarih(
                            new Date(
                              konu.son_mesaj_zamani * 1000,
                            ).toISOString(),
                          )}
                        </time>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div className="msg-main">
            {composingNew ? (
              <form
                className="msg-compose-card"
                onSubmit={(e) => void handleCreateThread(e)}
              >
                <header className="msg-compose-head">
                  <div>
                    <span className="eyebrow">YENİ İLETİŞİM KONUSU</span>
                    <h3>Yeni mesaj gönder</h3>
                    <p>
                      {userRole === "yonetici"
                        ? "Seçtiğiniz uzmana veya tüm aktif uzmanlara mesaj gönderin."
                        : "Yönetim ekibine veya platformdaki bir meslektaşınıza doğrudan mesaj gönderin."}
                    </p>
                  </div>
                </header>

                <label className="msg-form-field">
                  <span>Alıcı</span>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                  >
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.ad}
                        {c.sehir ? ` · ${c.sehir}` : ""}
                        {c.unvan ? ` (${c.unvan})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="msg-form-field">
                  <span>Konu başlığı</span>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Örn. Vaka yönlendirme danışması veya profil sorusu"
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>

                <label className="msg-form-field">
                  <span>Mesajınız</span>
                  <textarea
                    rows={5}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="İletmek istediğiniz mesajı detaylıca yazabilirsiniz..."
                    minLength={2}
                    maxLength={2000}
                    required
                  />
                </label>

                <div className="msg-compose-actions">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setComposingNew(false)}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="button"
                    disabled={
                      sendingNew ||
                      newSubject.trim().length < 3 ||
                      newBody.trim().length < 2
                    }
                  >
                    <Send size={15} aria-hidden="true" />
                    <span>
                      {sendingNew ? "Gönderiliyor..." : "Mesajı gönder"}
                    </span>
                  </button>
                </div>
              </form>
            ) : loadingThread ? (
              <div className="msg-empty-main">
                <p>Mesaj geçmişi yükleniyor...</p>
              </div>
            ) : threadDetail ? (
              <div className="msg-conversation">
                <header className="msg-conv-head">
                  <div>
                    <span className="eyebrow">
                      {threadDetail.karsi_taraf.rol === "yonetici"
                        ? "YÖNETİM İLETİŞİMİ"
                        : "MESLEKTAŞ İLETİŞİMİ"}
                    </span>
                    <h3>{threadDetail.baslik}</h3>
                    <p>
                      Kimden / Muhatap:{" "}
                      <strong>{threadDetail.karsi_taraf.ad}</strong>
                      {threadDetail.karsi_taraf.unvan
                        ? ` · ${threadDetail.karsi_taraf.unvan}`
                        : ""}
                      {threadDetail.karsi_taraf.sehir
                        ? ` (${threadDetail.karsi_taraf.sehir})`
                        : ""}
                    </p>
                  </div>
                </header>

                <div className="msg-stream" aria-live="polite">
                  {threadDetail.mesajlar.map((m) => (
                    <article
                      key={m.id}
                      className={`msg-bubble ${m.benden_mi ? "is-mine" : "is-theirs"}`}
                    >
                      <header className="msg-bubble-meta">
                        <strong>{m.benden_mi ? "Siz" : m.gonderen_ad}</strong>
                        <time>
                          {tarih(new Date(m.olusturma * 1000).toISOString())}
                        </time>
                      </header>
                      <p className="msg-bubble-body">{m.icerik}</p>
                    </article>
                  ))}
                </div>

                <form
                  className="msg-reply-form"
                  onSubmit={(e) => void handleSendReply(e)}
                >
                  <label className="msg-form-field">
                    <span>Cevap yazın</span>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`${threadDetail.karsi_taraf.ad} için yanıtınızı yazın...`}
                      minLength={1}
                      maxLength={2000}
                      required
                    />
                  </label>
                  <div className="msg-reply-actions">
                    <button
                      type="submit"
                      className="button"
                      disabled={sendingReply || replyText.trim().length < 1}
                    >
                      <Send size={15} aria-hidden="true" />
                      <span>
                        {sendingReply ? "Gönderiliyor..." : "Cevap gönder"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="msg-empty-main">
                <MessageSquare size={28} aria-hidden="true" />
                <h3>Okumak veya yanıtlamak için bir konuşma seçin</h3>
                <p>
                  Sol listeden mevcut bir konuşmayı açabilir veya yeni bir mesaj
                  başlatabilirsiniz.
                </p>
                <button
                  type="button"
                  className="button"
                  onClick={() => setComposingNew(true)}
                >
                  <Plus size={16} aria-hidden="true" />
                  <span>Yeni mesaj başlat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="msg-notifications-panel">
          <header className="msg-notifications-head">
            <div>
              <h3>Tüm Bildirimler</h3>
              <p>
                Sistem uyarıları, randevu hatırlatmaları ve gelen mesaj
                bildirimlerinizin tam içerikleri.
              </p>
            </div>
            {notifsData.okunmamis_sayisi > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => void markAllNotificationsRead()}
              >
                <CheckCheck size={15} aria-hidden="true" />
                <span>Tümünü okundu işaretle</span>
              </button>
            )}
          </header>

          {notifsData.kayitlar.length === 0 ? (
            <div className="msg-empty-main">
              <Bell size={28} aria-hidden="true" />
              <h3>Henüz bildiriminiz bulunmuyor</h3>
              <p>
                Yeni bir randevu veya mesaj geldiğinde burada detaylı olarak
                görüntülenir.
              </p>
            </div>
          ) : (
            <ul className="msg-notif-cards">
              {notifsData.kayitlar.map((item) => {
                const meta = typeMeta[item.tur] ?? typeMeta.admin_notu;
                const isHighlighted = initialNotificationId === item.id;
                const senderName = item.gonderen_ad || "Sistem";
                const canReply =
                  Boolean(item.konu_id) ||
                  Boolean(item.gonderen_kullanici_id) ||
                  item.tur === "admin_notu";
                const isAppointmentRelated =
                  Boolean(item.randevu_id) ||
                  item.hedef_yol.includes("randevular");

                return (
                  <li
                    key={item.id}
                    className={`msg-notif-card ${item.okundu ? "is-read" : "is-unread"} ${isHighlighted ? "is-highlighted" : ""}`}
                  >
                    <div className="msg-notif-card-top">
                      <div className="msg-notif-badges">
                        <span className={`notif-type-pill ${meta.badgeClass}`}>
                          <NotificationIcon tur={item.tur} />
                          <span>{meta.label}</span>
                        </span>
                        <span className="msg-notif-sender-chip">
                          Kimden: <strong>{senderName}</strong>
                        </span>
                        {!item.okundu && (
                          <span className="notif-unread-tag">
                            <span
                              className="notif-unread-dot"
                              aria-hidden="true"
                            />
                            Yeni bildirim
                          </span>
                        )}
                      </div>
                      <time>
                        {tarih(new Date(item.olusturma * 1000).toISOString())}
                      </time>
                    </div>

                    <h4>{item.baslik}</h4>
                    <p>{item.mesaj}</p>

                    <div className="msg-notif-card-actions">
                      {canReply && (
                        <button
                          type="button"
                          className="button secondary admin-compact-btn"
                          onClick={() => startReplyFromNotification(item)}
                        >
                          <Reply size={14} aria-hidden="true" />
                          <span>
                            {item.konu_id
                              ? "Mesajı aç ve yanıtla"
                              : "Cevap yaz"}
                          </span>
                        </button>
                      )}
                      {isAppointmentRelated && onNavigateAppointments && (
                        <button
                          type="button"
                          className="button secondary admin-compact-btn"
                          onClick={() => {
                            void markNotificationRead(item);
                            onNavigateAppointments();
                          }}
                        >
                          <CalendarClock size={14} aria-hidden="true" />
                          <span>Randevulara git</span>
                        </button>
                      )}
                      {item.hedef_yol &&
                        !item.konu_id &&
                        !isAppointmentRelated && (
                          <Link
                            className="button secondary admin-compact-btn"
                            to={item.hedef_yol}
                            onClick={() => void markNotificationRead(item)}
                          >
                            <ArrowRight size={14} aria-hidden="true" />
                            <span>
                              {item.hedef_yol.includes("baglantilar")
                                ? "Bağlantılara git"
                                : "Sayfayı görüntüle"}
                            </span>
                          </Link>
                        )}
                      {!item.okundu && (
                        <button
                          type="button"
                          className="button secondary admin-compact-btn"
                          onClick={() => void markNotificationRead(item)}
                        >
                          <Check size={14} aria-hidden="true" />
                          <span>Okundu işaretle</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
