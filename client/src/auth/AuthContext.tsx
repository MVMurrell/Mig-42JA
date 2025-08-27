import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "user" | "moderator" | "admin";
export type Me = { id: string; email: string; role: Role } | null;

type Ctx = {
  user: Me;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerify: () => Promise<void>;
  requestReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  // Load current session on boot
  useEffect(() => {
    api.get<{ user: Me }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await api.post<{ id: string; email: string; role: Role }>("/api/auth/login", { email, password });
    setUser(u);
  };

  const register = async (email: string, password: string) => {
    const u = await api.post<{ id: string; email: string; role: Role }>("/api/auth/register", { email, password });
    setUser(u);
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };

  const resendVerify = async () => {
    await api.post("/api/auth/request-verify-email", null);
  };

  const requestReset = async (email: string) => {
    await api.post("/api/auth/request-reset", { email });
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await api.post("/api/auth/reset", { token, newPassword });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resendVerify, requestReset, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
