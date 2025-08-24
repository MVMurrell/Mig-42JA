// client/src/hooks/useAuth.ts
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export type AppUser = {
  id: string;
  username: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl: string | null;
  email?: string | null;
  role?: "user" | "admin" | string | null;
  gemCoins?: number; // add this since home.tsx reads it
  readyPlayerMeAvatarUrl?: string | null;
  lanterns?: number;
};

export function useAuth() {
  // Basic mobile detection (same intent as what you had)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const mobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
        ua
      );
    setIsMobile(mobile);
  }, []);

  // User fetch
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery<AppUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) return null; // not authenticated
      if (!res.ok) throw new Error(`auth/user ${res.status}`);
      return (await res.json()) as AppUser;
    },
    refetchOnWindowFocus: true,
  });

  // Optional server-side auth status for mobile flow
  const { data: authStatus, isLoading: isLoadingStatus } = useQuery<{
    authenticated: boolean;
    isSuspended?: boolean;
    secure_cookie?: boolean;
  }>({
    queryKey: ["/api/auth/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/status", { credentials: "include" });
      if (!res.ok) throw new Error(`auth/status ${res.status}`);
      return res.json();
    },
    enabled: isMobile, // only ping on mobile
    refetchInterval: 30000, // keep it fresh
  });

  // Derived booleans
  const isAuthenticated = isMobile ? !!authStatus?.authenticated : !!user;

  const isSuspended = isMobile ? !!authStatus?.isSuspended : false;

  const isLoading = isLoadingUser || (isMobile && isLoadingStatus);

  // Actions
  // PATH: client/src/hooks/useAuth.ts  (function body only)
  const login = async () => {
    await fetch("/api/auth/login", { credentials: "include" });
    const me = await fetch("/api/auth/user", { credentials: "include" });
    if (!me.ok) throw new Error(`/api/auth/user ${me.status}`);
    const data = await me.json();
    // TODO: store data.user in your auth state/context
  };

  const logout = () => {
    window.location.href = "/api/auth/logout";
  };

  return {
    user, // AppUser | null
    isLoading, // <- fixes shorthand prop error
    isAuthenticated,
    isSuspended,
    isMobile,
    authStatus: isMobile ? authStatus : null,
    login,
    logout,
    // optionally expose userError if you want
  };
}
export default useAuth;
