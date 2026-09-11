import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Navigate } from "react-router-dom";
import { api, setCsrf } from "./api";
import { Status } from "../components/Status";

type User = { id: string; rol: "uzman" | "yonetici"; csrf: string };
type Auth = {
  user: User | null;
  ready: boolean;
  login: (
    email: string,
    parola: string,
    dogrulama_kodu: string,
  ) => Promise<User>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Auth>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    api<User>("/oturum/ben")
      .then((u) => {
        if (active) {
          setCsrf(u.csrf);
          setUser(u);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    const clear = () => {
      setUser(null);
      setCsrf("");
    };
    window.addEventListener("oturum-bitti", clear);
    return () => {
      active = false;
      window.removeEventListener("oturum-bitti", clear);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    // Sunucu süresinden bağımsız olarak hareketsiz ekrandaki bilgileri temizler.
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          api("/oturum/cikis", { method: "POST", body: "{}" }).catch(() => {});
          setUser(null);
          setCsrf("");
        },
        15 * 60 * 1000,
      );
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [user]);
  const login = async (
    email: string,
    parola: string,
    dogrulama_kodu: string,
  ) => {
    const u = await api<User>("/oturum/giris", {
      method: "POST",
      body: JSON.stringify({ email, parola, dogrulama_kodu }),
    });
    setCsrf(u.csrf);
    setUser(u);
    return u;
  };
  const logout = async () => {
    try {
      await api("/oturum/cikis", { method: "POST", body: "{}" });
    } finally {
      setUser(null);
      setCsrf("");
    }
  };
  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function Protected({
  children,
  role,
}: {
  children: ReactNode;
  role: "uzman" | "yonetici";
}) {
  const { user, ready } = useAuth();
  if (!ready) return <Status loading />;
  if (!user) return <Navigate to="/giris" replace />;
  if (user.rol !== role)
    return (
      <div className="empty-state">
        <h1>Bu sayfa için yetkiniz yok</h1>
      </div>
    );
  return <>{children}</>;
}
