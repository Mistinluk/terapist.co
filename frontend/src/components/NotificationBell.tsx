import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, CheckCheck, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SiteBildirim, SiteBildirimlerYaniti, api, tarih } from "../lib/api";

export function NotificationBell({
  userRole,
  onNavigate,
}: {
  userRole: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SiteBildirimlerYaniti>({
    okunmamis_sayisi: 0,
    kayitlar: [],
  });
  const [loading, setLoading] = useState(false);

  const workspaceBase = userRole === "yonetici" ? "/yonetim" : "/panel";

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api<SiteBildirimlerYaniti>("/bildirimler");
      setData(payload);
    } catch {
      // Ağ hataları başlık çubuğunu bozmaz.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 60000);
    const onRefresh = () => {
      void loadNotifications();
    };
    window.addEventListener("terapist:bildirim-guncelle", onRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("terapist:bildirim-guncelle", onRefresh);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  function buildHubUrl(item?: SiteBildirim): string {
    const params = new URLSearchParams({ sekme: "mesajlar" });
    if (item?.konu_id) {
      params.set("konu", item.konu_id);
    }
    if (item?.id) {
      params.set("bildirim", item.id);
    }
    return `${workspaceBase}?${params.toString()}`;
  }

  async function openNotificationInHub(item: SiteBildirim) {
    if (!item.okundu) {
      setData((prev) => ({
        okunmamis_sayisi: Math.max(0, prev.okunmamis_sayisi - 1),
        kayitlar: prev.kayitlar.map((n) =>
          n.id === item.id ? { ...n, okundu: true } : n,
        ),
      }));
      try {
        await api(`/bildirimler/${item.id}/okundu`, { method: "PATCH" });
      } catch {
        void loadNotifications();
      }
    }
    setOpen(false);
    onNavigate?.();
    navigate(buildHubUrl(item));
  }

  function goToMessagesTab() {
    setOpen(false);
    onNavigate?.();
    navigate(buildHubUrl());
  }

  async function markAllRead() {
    setData((prev) => ({
      okunmamis_sayisi: 0,
      kayitlar: prev.kayitlar.map((n) => ({ ...n, okundu: true })),
    }));
    try {
      await api("/bildirimler/tumunu-okundu", { method: "POST" });
    } catch {
      void loadNotifications();
    }
  }

  const unreadCount = data.okunmamis_sayisi;
  const recentItems = data.kayitlar.slice(0, 8);

  return (
    <div className="nav-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`nav-bell-btn ${open ? "is-open" : ""}`}
        aria-label={
          unreadCount > 0
            ? `Bildirimler (${unreadCount} yeni bildirim)`
            : "Bildirimler"
        }
        aria-expanded={open}
        aria-controls="site-notification-popover"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell size={19} aria-hidden="true" />
        <span className="nav-bell-label">Bildirimler</span>
        {unreadCount > 0 && (
          <span className="nav-bell-badge tabular-num">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <span className="sr-only" aria-live="polite">
        {unreadCount > 0 ? `${unreadCount} yeni bildirim` : ""}
      </span>

      {open && (
        <section
          id="site-notification-popover"
          className="notif-popover"
          role="dialog"
          aria-label="Bildirim özeti"
        >
          <header className="notif-popover-head">
            <div>
              <strong>Bildirimler</strong>
              <span>
                {unreadCount > 0
                  ? `${unreadCount} yeni bildirim var`
                  : "Yeni bildirim yok"}
              </span>
            </div>
            <div className="notif-head-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-button notif-mark-all"
                  onClick={() => void markAllRead()}
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  <span>Okundu</span>
                </button>
              )}
              <button
                type="button"
                className="notif-close-btn"
                aria-label="Bildirim penceresini kapat"
                onClick={() => setOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="notif-list-scroll">
            {loading && recentItems.length === 0 ? (
              <p className="notif-empty">Bildirimler kontrol ediliyor...</p>
            ) : recentItems.length === 0 ? (
              <p className="notif-empty">Henüz bildiriminiz bulunmuyor.</p>
            ) : (
              <ul className="notif-list">
                {recentItems.map((item) => {
                  const senderName = item.gonderen_ad || "Sistem";
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`notif-item notif-compact-item ${item.okundu ? "is-read" : "is-unread"}`}
                        onClick={() => void openNotificationInHub(item)}
                      >
                        <div className="notif-item-top">
                          <span className="notif-compact-status">
                            {!item.okundu && (
                              <span
                                className="notif-unread-dot"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {item.okundu ? "Bildirim" : "Yeni bildirim"}
                            </span>
                          </span>
                          <ChevronRight
                            size={15}
                            className="notif-compact-arrow"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="notif-compact-sender">
                          Kimden: <strong>{senderName}</strong>
                        </span>
                        <time>
                          {tarih(new Date(item.olusturma * 1000).toISOString())}
                        </time>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="notif-popover-foot">
            <button
              type="button"
              className="button notif-hub-link-btn"
              onClick={goToMessagesTab}
            >
              <span>Bildirimler ve Mesajlar</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
