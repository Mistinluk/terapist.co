import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  Award,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Flag,
  MessageSquare,
  ScrollText,
  Share2,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  ModerasyonRaporu,
  Profil,
  tarih,
  YonetimAnalitik,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import {
  AdminAnalytics,
  type AdminAnalitikSekme,
} from "../components/AdminAnalytics";
import { AdminAppointments } from "../components/AdminAppointments";
import { AdminFounding } from "../components/AdminFounding";
import { AdminClientReferrals } from "../components/AdminClientReferrals";
import { AdminInvitations } from "../components/AdminInvitations";
import { AdminTherapistInspector } from "../components/AdminTherapistInspector";
import { AdminTrafficAnalytics } from "../components/AdminTrafficAnalytics";
import { NotificationsAndMessages } from "../components/NotificationsAndMessages";

type Audit = {
  id: string;
  zaman: number;
  islem: string;
  kullanici_id: string;
  kaynak_id: string;
};

type AdminNavItem = {
  id: AdminAnalitikSekme;
  label: string;
  description: string;
  icon: LucideIcon;
};

type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

const adminNavigation: AdminNavGroup[] = [
  {
    label: "Genel ve İzleme",
    items: [
      {
        id: "analitik",
        label: "Genel bakış & Analitik",
        description: "Platform sağlığı ve istatistikler",
        icon: ChartNoAxesCombined,
      },
      {
        id: "trafik",
        label: "Google Analytics & Trafik",
        description: "Ziyaretçi, konum, profil ve kaynaklar",
        icon: Activity,
      },
      {
        id: "randevular",
        label: "Genel randevular",
        description: "KVKK güvenli randevu akışı",
        icon: CalendarDays,
      },
      {
        id: "mesajlar",
        label: "Bildirimler ve Mesajlar",
        description: "Uzmanlarla mesajlaşma, duyuru ve bildirimler",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "Uzman ve Program",
    items: [
      {
        id: "uzmanlar",
        label: "Uzmanlar & Profiller",
        description: "Doğrulama, profil ve kotalar",
        icon: UsersRound,
      },
      {
        id: "kurucu",
        label: "Kurucu programı",
        description: "Kontenjan, üye ekle ve çıkar",
        icon: Award,
      },
    ],
  },
  {
    label: "Büyüme ve Yönlendirmeler",
    items: [
      {
        id: "yonlendirmeler",
        label: "Danışan yönlendirmeleri",
        description: "Linkler, hedefler ve dönüşüm",
        icon: Share2,
      },
      {
        id: "referanslar",
        label: "Davet ve referanslar",
        description: "Davet kotaları ve öneriler",
        icon: UserPlus,
      },
    ],
  },
  {
    label: "Güvenlik ve Denetim",
    items: [
      {
        id: "moderasyon",
        label: "Moderasyon",
        description: "Bağlantı ve alan bildirimleri",
        icon: Flag,
      },
      {
        id: "denetim",
        label: "İşlem kayıtları",
        description: "Değişmez denetim günlüğü",
        icon: ScrollText,
      },
    ],
  },
];

const adminTabs = adminNavigation.flatMap((group) => group.items);

function adminHref(tab: AdminAnalitikSekme) {
  return tab === "analitik" ? "/yonetim" : `/yonetim?sekme=${tab}`;
}

function AdminNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: AdminAnalitikSekme;
  onSelect?: () => void;
}) {
  return (
    <nav className="dashboard-navigation" aria-label="Yönetim çalışma alanı">
      {adminNavigation.map((group) => (
        <div className="dashboard-nav-group" key={group.label}>
          <span className="dashboard-nav-label">{group.label}</span>
          <div className="dashboard-nav-list">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeTab;
              return (
                <Link
                  className={`dashboard-nav-item ${active ? "is-active" : ""}`}
                  to={adminHref(item.id)}
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

export function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileNavigation = useRef<HTMLDetailsElement>(null);
  const requestedTab = searchParams.get("sekme") as AdminAnalitikSekme | null;
  const tab = adminTabs.some((item) => item.id === requestedTab)
    ? requestedTab!
    : "analitik";
  const activeNavigation =
    adminTabs.find((item) => item.id === tab) ?? adminTabs[0];
  const ActiveNavigationIcon = activeNavigation.icon;

  const [page, setPage] = useState(1);
  const [approvalFilter, setApprovalFilter] = useState<
    "tumu" | "bekleyen" | "yayinda"
  >("tumu");
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<Profil>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const profileParams = new URLSearchParams({
    sayfa: String(page),
    onay: approvalFilter,
  });
  if (searchTerm.trim()) profileParams.set("arama", searchTerm.trim());

  const profiles = useApi<Profil[]>(
    `/yonetim/uzmanlar?${profileParams.toString()}`,
  );
  const analytics = useApi<YonetimAnalitik>("/yonetim/analitik");
  const audit = useApi<Audit[]>(`/yonetim/denetim?sayfa=${page}`);
  const reports = useApi<ModerasyonRaporu[]>(
    `/yonetim/moderasyon-raporlari?sayfa=${page}`,
  );

  function navigateToTab(nextTab: AdminAnalitikSekme) {
    setPage(1);
    setEditing(undefined);
    setMessage("");
    setSearchParams(nextTab === "analitik" ? {} : { sekme: nextTab });
  }

  function refreshCore() {
    profiles.reload();
    analytics.reload();
    audit.reload();
  }

  async function updateTherapist(p: Profil, archive = false) {
    if (
      archive &&
      !window.confirm(
        `${p.ad} arşivlensin mi? Hesabın erişimi kapatılır; kayıtlar silinmez.`,
      )
    ) {
      return;
    }
    setBusy(p.id);
    setMessage("");
    try {
      await api(`/yonetim/uzmanlar/${p.id}`, {
        method: archive ? "DELETE" : "PATCH",
        body: JSON.stringify(archive ? {} : { onayli: !p.onayli }),
      });
      if (!archive && editing?.id === p.id) {
        setEditing({ ...p, onayli: !p.onayli });
      }
      if (archive && editing?.id === p.id) {
        setEditing(undefined);
      }
      refreshCore();
      setMessage(
        archive
          ? `${p.ad} arşivlendi.`
          : `${p.ad} ${p.onayli ? "yayından kaldırıldı" : "yayına alındı"}.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function reviewReport(
    report: ModerasyonRaporu,
    durum: "resolved" | "dismissed",
  ) {
    setBusy(report.id);
    setMessage("");
    try {
      await api(`/yonetim/moderasyon-raporlari/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({ durum }),
      });
      reports.reload();
      analytics.reload();
      audit.reload();
      setMessage("Moderasyon raporu sonuçlandırıldı.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="dashboard admin-dashboard">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">YÖNETİM ALANI</span>
          <h1>Uzman ağını ve platform sağlığını yönetin.</h1>
          <p>
            Analitik, anonim randevular, kurucu programı, yönlendirme ağı ve
            doğrulama süreçleri tek çalışma alanında.
          </p>
        </div>
        <Link className="button secondary dashboard-profile-link" to="/">
          Dizini görüntüle
          <ChevronRight size={17} aria-hidden="true" />
        </Link>
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
        <AdminNavigation
          activeTab={tab}
          onSelect={() => {
            if (mobileNavigation.current) mobileNavigation.current.open = false;
            setPage(1);
            setEditing(undefined);
          }}
        />
      </details>

      <div className="dashboard-workspace">
        <aside className="dashboard-sidebar">
          <AdminNavigation
            activeTab={tab}
            onSelect={() => {
              setPage(1);
              setEditing(undefined);
            }}
          />
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-view-heading">
            <h2>
              {editing
                ? `${editing.ad} — Uzman İnceleme`
                : activeNavigation.label}
            </h2>
            <p>
              {editing
                ? "Uzmanın profil bilgileri, takvim durumu, rozeti, kaynakları ve davet kotası"
                : activeNavigation.description}
            </p>
          </header>

          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}

          {editing ? (
            <AdminTherapistInspector
              profile={editing}
              busyAction={busy}
              onBack={() => setEditing(undefined)}
              onSaved={() => {
                refreshCore();
              }}
              onProfileUpdated={(updated) => setEditing(updated)}
              onToggleApproval={(target) => updateTherapist(target)}
            />
          ) : tab === "analitik" ? (
            <AdminAnalytics
              data={analytics.data}
              loading={analytics.loading}
              error={analytics.error}
              retry={analytics.reload}
              onNavigate={navigateToTab}
            />
          ) : tab === "trafik" ? (
            <AdminTrafficAnalytics
              gaCallback={searchParams.get("ga")}
              onClearGaCallback={() => {
                if (!searchParams.has("ga")) return;
                const next = new URLSearchParams(searchParams);
                next.delete("ga");
                setSearchParams(next, { replace: true });
              }}
              onOpenTherapist={async (uzmanId) => {
                const match = profiles.data?.find(
                  (item) => item.id === uzmanId,
                );
                if (match) {
                  setEditing(match);
                  return;
                }
                try {
                  const full = await api<Profil>(`/uzmanlar/${uzmanId}`);
                  setEditing(full);
                } catch {
                  navigateToTab("uzmanlar");
                }
              }}
            />
          ) : tab === "randevular" ? (
            <AdminAppointments />
          ) : tab === "mesajlar" ? (
            <NotificationsAndMessages
              userRole="yonetici"
              initialThreadId={searchParams.get("konu")}
              initialNotificationId={searchParams.get("bildirim")}
              onNavigateAppointments={() => navigateToTab("randevular")}
            />
          ) : tab === "kurucu" ? (
            <AdminFounding onChanged={refreshCore} />
          ) : tab === "yonlendirmeler" ? (
            <AdminClientReferrals />
          ) : tab === "referanslar" ? (
            <AdminInvitations onChanged={refreshCore} />
          ) : tab === "uzmanlar" ? (
            <div className="admin-section-stack">
              <div className="admin-filter-toolbar">
                <div
                  className="admin-filter-pills"
                  role="group"
                  aria-label="Onay filtresi"
                >
                  {(
                    [
                      ["tumu", "Tümü"],
                      ["bekleyen", "İnceleme bekliyor"],
                      ["yayinda", "Yayında"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`admin-pill-btn ${approvalFilter === key ? "is-active" : ""}`}
                      onClick={() => {
                        setApprovalFilter(key);
                        setPage(1);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="admin-inline-search">
                  <span className="sr-only">Uzmanlarda ara</span>
                  <input
                    type="search"
                    placeholder="Ad, şehir, ilçe veya kullanıcı adı…"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </div>

              <Status
                loading={profiles.loading}
                error={profiles.error}
                retry={profiles.reload}
              />

              {profiles.data?.length === 0 && (
                <div className="empty-state">
                  <UsersRound size={32} aria-hidden="true" />
                  <h3>Eşleşen uzman bulunmuyor</h3>
                  <p>Filtre veya arama metnini değiştirerek tekrar deneyin.</p>
                </div>
              )}

              <div className="admin-list">
                {profiles.data?.map((p) => (
                  <article className="admin-row" key={p.id}>
                    <div>
                      <h2>{p.ad}</h2>
                      <p>
                        {p.sehir} · {p.ilce} · @{p.kullanici_adi}
                      </p>
                    </div>
                    <div className="admin-badges">
                      <span
                        className={`status-badge ${p.onayli ? "onaylandi" : "bekliyor"}`}
                      >
                        {p.onayli ? "Yayında" : "İnceleme bekliyor"}
                      </span>
                      {p.kurucu_no !== null && (
                        <span className="status-badge founder">
                          Founding #{String(p.kurucu_no).padStart(4, "0")}
                        </span>
                      )}
                    </div>
                    <div className="actions">
                      <button
                        className="button"
                        type="button"
                        disabled={busy === p.id}
                        onClick={() => updateTherapist(p)}
                      >
                        {p.onayli ? "Yayından kaldır" : "Onayla"}
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => setEditing(p)}
                      >
                        İncele / düzenle
                      </button>
                      <button
                        className="button danger"
                        type="button"
                        disabled={busy === p.id}
                        onClick={() => updateTherapist(p, true)}
                      >
                        Arşivle
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <nav className="pagination" aria-label="Uzman sayfaları">
                <button
                  className="button secondary"
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </button>
                <span>{page}. sayfa</span>
                <button
                  className="button secondary"
                  type="button"
                  disabled={profiles.data?.length !== 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </nav>
            </div>
          ) : tab === "moderasyon" ? (
            <div className="admin-section-stack">
              <Status
                loading={reports.loading}
                error={reports.error}
                retry={reports.reload}
              />
              {reports.data?.length === 0 && (
                <div className="empty-state">
                  <Flag size={30} aria-hidden="true" />
                  <h3>Moderasyon raporu bulunmuyor</h3>
                  <p>Şu anda incelenmeyi bekleyen açık bildirim yok.</p>
                </div>
              )}
              <div className="moderation-list admin-moderation-list">
                {reports.data?.map((report) => (
                  <article key={report.id}>
                    <div>
                      <span
                        className={`status-badge ${
                          report.durum === "open" ? "bekliyor" : "onaylandi"
                        }`}
                      >
                        {report.durum === "open"
                          ? "İnceleme bekliyor"
                          : report.durum === "resolved"
                            ? "Çözüldü"
                            : "Reddedildi"}
                      </span>
                      <h2>
                        {report.tur === "connection"
                          ? "Mesleki bağlantı bildirimi"
                          : "Yanlış alan ilişkisi"}
                      </h2>
                      <p>
                        {report.raporlayan.ad} → {report.hedef.ad}
                      </p>
                      {report.aciklama && <p>{report.aciklama}</p>}
                      <time
                        dateTime={new Date(
                          report.olusturma * 1000,
                        ).toISOString()}
                      >
                        {tarih(new Date(report.olusturma * 1000).toISOString())}
                      </time>
                    </div>
                    {report.durum === "open" && (
                      <div className="actions">
                        <button
                          className="button"
                          type="button"
                          disabled={busy === report.id}
                          onClick={() => reviewReport(report, "resolved")}
                        >
                          Çözüldü
                        </button>
                        <button
                          className="button secondary"
                          type="button"
                          disabled={busy === report.id}
                          onClick={() => reviewReport(report, "dismissed")}
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <nav className="pagination" aria-label="Moderasyon sayfaları">
                <button
                  className="button secondary"
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </button>
                <span>{page}. sayfa</span>
                <button
                  className="button secondary"
                  type="button"
                  disabled={reports.data?.length !== 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </nav>
            </div>
          ) : (
            <div className="admin-section-stack">
              <Status
                loading={audit.loading}
                error={audit.error}
                retry={audit.reload}
              />
              <div className="admin-panel-card">
                <div className="table-wrap">
                  <table>
                    <caption>
                      Son işlemler · Danışan adları ve iletişim bilgileri
                      kayıtlara yazılmaz.
                    </caption>
                    <thead>
                      <tr>
                        <th>Zaman</th>
                        <th>İşlem</th>
                        <th>Hesap kimliği</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.data?.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {tarih(new Date(row.zaman * 1000).toISOString())}
                          </td>
                          <td>
                            <code>{row.islem}</code>
                          </td>
                          <td>
                            <code>{row.kullanici_id || "Ziyaretçi"}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <nav className="pagination" aria-label="Denetim sayfaları">
                <button
                  className="button secondary"
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </button>
                <span>{page}. sayfa</span>
                <button
                  className="button secondary"
                  type="button"
                  disabled={audit.data?.length !== 50}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
