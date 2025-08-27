// client/src/hooks/useAuth.ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppUser } from "@/types/user";

export function useAuth() {
  const qc = useQueryClient();

  // whoami on app load
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const r = await api.get<{ user: AppUser | null }>("/api/auth/me");
      return r.user;
    },
    retry: false,
  });

  // simple functions instead of UseMutationResult<T>
  const login = useCallback(
    async (email: string, password: string) => {
      const u = await api.post<AppUser>("/api/auth/login", { email, password });
      qc.setQueryData(["me"], u);
    },
    [qc]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const u = await api.post<AppUser>("/api/auth/register", {
        email,
        password,
      });
      qc.setQueryData(["me"], u);
    },
    [qc]
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout", null);
    qc.setQueryData(["me"], null);
  }, [qc]);

  const resendVerify = useCallback(async () => {
    await api.post("/api/auth/request-verify-email", null);
  }, []);

  const requestReset = useCallback(async (email: string) => {
    await api.post("/api/auth/request-reset", { email });
  }, []);

  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      await api.post("/api/auth/reset", { token, newPassword });
    },
    []
  );

  // compatibility fields expected by components
  const user = me.data ?? null;
  const isLoading = me.isLoading;
  const isAuthenticated = !!user;
  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android/i.test(navigator.userAgent);
  }, []);
  const authStatus: "loading" | "authenticated" | "unauthenticated" = isLoading
    ? "loading"
    : isAuthenticated
    ? "authenticated"
    : "unauthenticated";

  // keep original 'loading' name too
  const loading = isLoading;

  return {
    user,
    loading,
    // compat flags
    isLoading,
    isAuthenticated,
    isMobile,
    authStatus,
    // actions as simple functions (so onClick={logout} works)
    login,
    register,
    logout,
    resendVerify,
    requestReset,
    resetPassword,
  };
}

export type { AppUser } from "@/types/user";
