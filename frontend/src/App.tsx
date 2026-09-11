import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Directory } from "./pages/Directory";
import { useApi } from "./lib/useApi";
import { Aydinlatma } from "./lib/api";
import { useAuth, Protected } from "./lib/auth";
import { Login } from "./pages/Login";
import { Apply } from "./pages/Apply";
import { Profile } from "./pages/Profile";
import { Privacy } from "./pages/Privacy";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";

export default function App() {
  const legal = useApi<Aydinlatma>("/aydinlatma");
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
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
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            terapist<span>.co</span>
            <span className="brand-mark" aria-hidden="true">
              ✳
            </span>
          </Link>
          <nav aria-label="Ana menü">
            <Link className="nav-active" to="/">
              Uzman bul
            </Link>
            {user ? (
              <>
                <Link
                  className="nav-login"
                  to={user.rol === "yonetici" ? "/yonetim" : "/panel"}
                >
                  Çalışma alanım
                </Link>
                <button
                  className="text-button"
                  onClick={() =>
                    logout().catch(() =>
                      setError(
                        "Sunucuya ulaşılamadı. Bu cihazdaki ekran kapatıldı; oturum sunucuda süresi dolunca sona erer.",
                      ),
                    )
                  }
                >
                  Çıkış yap
                </button>
              </>
            ) : (
              <>
                <Link to="/basvuru">
                  Uzman olarak katıl <ArrowUpRight size={15} />
                </Link>
                <Link className="nav-login" to="/giris">
                  Uzman girişi
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="icerik" className="container">
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <Routes>
          <Route path="/" element={<Directory />} />
          <Route path="/giris" element={<Login />} />
          <Route path="/basvuru" element={<Apply />} />
          <Route path="/uzman/:id" element={<Profile />} />
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
                <Link className="button" to="/">
                  Uzmanlara dön
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <Link className="brand" to="/">
          terapist<span>.co</span>
        </Link>
        <p>Kendinize ayırdığınız zaman, iyi bir başlangıç.</p>
        <Link to="/aydinlatma">Kişisel verilerin korunması</Link>
        <span>© {new Date().getFullYear()} terapist.co</span>
      </footer>
    </>
  );
}
