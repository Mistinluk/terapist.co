import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { Directory } from "./pages/Directory";
import { Features } from "./pages/Features";
import { Home } from "./pages/Home";
import { useApi } from "./lib/useApi";
import { Aydinlatma } from "./lib/api";
import { useAuth, Protected } from "./lib/auth";
import { Login } from "./pages/Login";
import { Apply } from "./pages/Apply";
import { Profile } from "./pages/Profile";
import { Privacy } from "./pages/Privacy";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";
import { InvitationAccept } from "./pages/InvitationAccept";
import { NotificationBell } from "./components/NotificationBell";
import { Referral } from "./pages/Referral";
import { SeoDetailPage, SeoHubPage } from "./pages/SeoLanding";
import { SEO_FOOTER_GROUPS } from "./data/seoPages";
import {
  analitikYapilandirmaGetir,
  sayfaGoruntulemeBildir,
} from "./lib/analytics";

const fixedPublicRoutes = new Set([
  "/",
  "/ozellikler",
  "/kesfet",
  "/giris",
  "/basvuru",
  "/aydinlatma",
  "/karsilastirma",
  "/cozumler",
  "/rehber",
]);

function isNonProfilePublicRoute(pathname: string): boolean {
  if (fixedPublicRoutes.has(pathname)) return true;
  return (
    pathname.startsWith("/davet/") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/karsilastirma/") ||
    pathname.startsWith("/cozumler/") ||
    pathname.startsWith("/rehber/")
  );
}

export function isProfileRoute(pathname: string): boolean {
  if (pathname === "/panel/onizleme" || pathname.startsWith("/uzman/")) {
    return true;
  }
  if (
    isNonProfilePublicRoute(pathname) ||
    pathname === "/panel" ||
    pathname.startsWith("/panel/") ||
    pathname === "/yonetim" ||
    pathname.startsWith("/yonetim/")
  ) {
    return false;
  }
  return /^\/[^/]+$/.test(pathname);
}

export default function App() {
  const legal = useApi<Aydinlatma>("/aydinlatma");
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [whiteLabelPath, setWhiteLabelPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const whiteLabel = whiteLabelPath === location.pathname;
  useEffect(() => {
    void analitikYapilandirmaGetir();
    const onWhiteLabel = (event: Event) => {
      const detail = (
        event as CustomEvent<{ hidden?: boolean; pathname?: string }>
      ).detail;
      setWhiteLabelPath(
        detail?.hidden ? (detail.pathname ?? window.location.pathname) : null,
      );
    };
    window.addEventListener("terapist:whitelabel", onWhiteLabel);
    return () =>
      window.removeEventListener("terapist:whitelabel", onWhiteLabel);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
    if (isNonProfilePublicRoute(location.pathname)) {
      sayfaGoruntulemeBildir(location.pathname);
    }
  }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [menuOpen]);
  const workspacePath = user?.rol === "yonetici" ? "/yonetim" : "/panel";
  const workspaceActive =
    Boolean(user) &&
    (location.pathname === workspacePath ||
      location.pathname.startsWith(`${workspacePath}/`));
  const profileRoute = isProfileRoute(location.pathname);
  return (
    <>
      <a className="skip-link" href="#icerik">
        İçeriğe geç
      </a>
      {legal.data?.gelistirme && (
        <div className="dev-banner">
          Geliştirme önizlemesi · Profiller kurgusaldır. Gerçek danışan bilgisi
          girmeyin.
        </div>
      )}
      {!profileRoute && (
        <header className={`site-header${whiteLabel ? " is-whitelabel" : ""}`}>
          <div className="header-inner">
            <Link className="brand" to="/">
              <img
                className="brand-logo"
                src="/brand/terapistco-wordmark.png"
                alt="terapist.co"
                width="1829"
                height="472"
              />
            </Link>
            <button
              ref={menuButton}
              className="nav-toggle"
              type="button"
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-controls="site-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X size={22} aria-hidden="true" />
              ) : (
                <Menu size={22} aria-hidden="true" />
              )}
              <span>Menü</span>
            </button>
            <nav
              id="site-navigation"
              className={menuOpen ? "is-open" : undefined}
              aria-label="Ana menü"
            >
              <div className="nav-cluster nav-primary-links">
                <span className="nav-group-label">Keşfet</span>
                <Link
                  className={
                    location.pathname === "/kesfet" ? "nav-active" : undefined
                  }
                  aria-current={
                    location.pathname === "/kesfet" ? "page" : undefined
                  }
                  to="/kesfet"
                  onClick={() => setMenuOpen(false)}
                >
                  <Search className="nav-icon" size={17} aria-hidden="true" />
                  Terapistleri keşfet
                </Link>
                <Link
                  className={
                    location.pathname === "/ozellikler"
                      ? "nav-active"
                      : undefined
                  }
                  aria-current={
                    location.pathname === "/ozellikler" ? "page" : undefined
                  }
                  to="/ozellikler"
                  onClick={() => setMenuOpen(false)}
                >
                  Özellikler
                </Link>
                <a href="/#meslektas-agi" onClick={() => setMenuOpen(false)}>
                  Meslektaş Ağı
                </a>
                <a href="/#sss" onClick={() => setMenuOpen(false)}>
                  SSS
                </a>
              </div>
              <div className="nav-cluster nav-account-links">
                <span className="nav-group-label">Hesap</span>
                {user ? (
                  <>
                    <NotificationBell
                      userRole={user.rol}
                      onNavigate={() => setMenuOpen(false)}
                    />
                    <Link
                      className={workspaceActive ? "nav-active" : "nav-login"}
                      aria-current={workspaceActive ? "page" : undefined}
                      to={workspacePath}
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard
                        className="nav-icon"
                        size={17}
                        aria-hidden="true"
                      />
                      {user.rol === "yonetici"
                        ? "Yönetim paneli"
                        : "Çalışma alanım"}
                    </Link>
                    <button
                      className="text-button nav-logout"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout().catch(() =>
                          setError(
                            "Sunucuya ulaşılamadı. Bu cihazdaki ekran kapatıldı; oturum sunucuda süresi dolunca sona erer.",
                          ),
                        );
                      }}
                    >
                      <LogOut
                        className="nav-icon"
                        size={17}
                        aria-hidden="true"
                      />
                      Çıkış yap
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      className="nav-login nav-login-link"
                      aria-current={
                        location.pathname === "/giris" ? "page" : undefined
                      }
                      to="/giris"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LogIn
                        className="nav-icon"
                        size={17}
                        aria-hidden="true"
                      />
                      Uzman girişi
                    </Link>
                    <Link
                      className={`nav-signup-pill${location.pathname === "/basvuru" ? " is-active" : ""}`}
                      aria-current={
                        location.pathname === "/basvuru" ? "page" : undefined
                      }
                      to="/basvuru"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserPlus
                        className="nav-icon"
                        size={17}
                        aria-hidden="true"
                      />
                      Uzman olarak katıl
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </header>
      )}
      <main
        id="icerik"
        className={`container${profileRoute ? " is-profile-canvas" : ""}`}
      >
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ozellikler" element={<Features />} />
          <Route path="/kesfet" element={<Directory />} />
          <Route path="/giris" element={<Login />} />
          <Route path="/basvuru" element={<Apply />} />
          <Route path="/davet/:token" element={<InvitationAccept />} />
          <Route path="/r/:token" element={<Referral />} />
          <Route path="/uzman/:id" element={<Profile />} />
          <Route
            path="/panel/onizleme"
            element={
              <Protected role="uzman">
                <Profile />
              </Protected>
            }
          />
          <Route
            path="/karsilastirma"
            element={<SeoHubPage initialCategory="karsilastirma" />}
          />
          <Route path="/karsilastirma/:slug" element={<SeoDetailPage />} />
          <Route
            path="/cozumler"
            element={<SeoHubPage initialCategory="cozumler" />}
          />
          <Route path="/cozumler/:slug" element={<SeoDetailPage />} />
          <Route
            path="/rehber"
            element={<SeoHubPage initialCategory="rehber" />}
          />
          <Route path="/rehber/:slug" element={<SeoDetailPage />} />
          <Route path="/:username" element={<Profile />} />
          <Route path="/aydinlatma" element={<Privacy />} />
          <Route
            path="/panel"
            element={
              <Protected role="uzman">
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/yonetim"
            element={
              <Protected role="yonetici">
                <Admin />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Sayfa bulunamadı</h1>
                <Link className="button" to="/kesfet">
                  Uzmanlara dön
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      {!profileRoute && (
        <footer className={`site-footer${whiteLabel ? " is-whitelabel" : ""}`}>
          <div className="site-footer-grid">
            <div className="site-footer-brand-col">
              <Link
                className="brand"
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <img
                  className="brand-logo"
                  src="/brand/terapistco-wordmark.png"
                  alt="terapist.co"
                  width="1829"
                  height="472"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <p className="site-footer-lead">
                Klinik psikologlar ve ruh sağlığı uzmanları için doğrulanmış
                dijital profil, akıllı randevu takvimi, şifreli değerlendirme
                formları ve etik meslektaş ağı.
              </p>
              <Link to="/basvuru" className="site-footer-cta-pill">
                <span>Profil adresini sahiplen</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <nav className="site-footer-col" aria-label="Karşılaştırmalar">
              <h3>Karşılaştırmalar</h3>
              <ul>
                {SEO_FOOTER_GROUPS.karsilastirma.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.footerLabel}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="site-footer-col" aria-label="Klinik Çözümler">
              <h3>Klinik Çözümler</h3>
              <ul>
                {SEO_FOOTER_GROUPS.cozumler.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.footerLabel}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="site-footer-col" aria-label="Uzman Rehberleri">
              <h3>Uzman Rehberleri</h3>
              <ul>
                {SEO_FOOTER_GROUPS.rehber.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path}>{item.footerLabel}</Link>
                  </li>
                ))}
                <li>
                  <Link to="/karsilastirma">
                    Tüm Karşılaştırma &amp; Rehberler
                  </Link>
                </li>
              </ul>
            </nav>

            <nav className="site-footer-col" aria-label="Platform ve Kurumsal">
              <h3>Platform</h3>
              <ul>
                <li>
                  <Link to="/kesfet">Terapistleri keşfet</Link>
                </li>
                <li>
                  <Link to="/basvuru">Uzman olarak katıl</Link>
                </li>
                <li>
                  <Link to="/giris">Uzman girişi</Link>
                </li>
                <li>
                  <Link to="/ozellikler">Özellikler</Link>
                </li>
                <li>
                  <a href="/#sss">Sıkça sorulan sorular</a>
                </li>
                <li>
                  <Link to="/aydinlatma">Kişisel verilerin korunması</Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="site-footer-bottom">
            <span>
              © {new Date().getFullYear()} terapist.co · Klinik psikologlar ve
              terapistler için mesleki mikro-site altyapısı.
            </span>
            <div className="site-footer-badges">
              <span>KVKK &amp; Veri Minimasyonu</span>
              <span>Doğrulanmış Uzman Ağı</span>
              <span>%0 Komisyon</span>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
