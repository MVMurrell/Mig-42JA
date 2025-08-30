// client/src/hooks/useAuth.ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppUser } from "@/types/user";

async function getMeSafe() {
  const r = await fetch("/api/auth/me", { credentials: "include" });
  if (r.status === 401) return null; // ← important
  if (!r.ok) throw new Error("me_failed");
  const j = await r.json();
  return j.user ?? null;
}

export function useAuth() {
  const qc = useQueryClient();

  // whoami on app load
  const me = useQuery({
    queryKey: ["me"],
    queryFn: getMeSafe,
    retry: false, // ← don't auto-retry 401s
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60_000,
  });

  const user = me.data ?? null;
  const isLoading = me.isLoading;

  // simple functions instead of UseMutationResult<T>
  const login = async (email: string, password: string) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "login_failed");
    const u = await r.json();
    qc.setQueryData(["me"], u); // ← avoid immediate refetch loop
  };

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

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    qc.setQueryData(["me"], null);
  };

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
  // const user = me.data ?? null;
  // const isLoading = me.isLoading;
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
