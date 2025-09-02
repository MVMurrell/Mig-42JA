import { useAuth } from "@/hooks/useAuth";
import { Loader } from "lucide-react";
import { useLocation } from "wouter";
import AuthCard from "@/components/AuthCard";

import { useEffect, useState } from "react";

interface AuthCheckProps { children: React.ReactNode; }

export default function AuthCheck({ children }: AuthCheckProps) {
  const { user, isLoading, login, register, isAuthenticated, isMobile, authStatus } = useAuth();
  const [location] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPWA, setIsPWA] = useState(false);

  // NEW: local form state (never put passwords on user objects)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Click handlers satisfy MouseEventHandler<...> instead of passing login directly
  const onLoginClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    void login(email.trim(), password);
  };
  const onRegisterClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    void register(email.trim(), password);
  };

  useEffect(() => {
    const isPWAMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");
    setIsPWA(isPWAMode);

    const urlParams = new URLSearchParams(window.location.search);
    const error =
      urlParams.get("auth_error") ||
      urlParams.get("pwa_auth_error") ||
      urlParams.get("mobile_auth_error");
    const isMobileError = urlParams.get("mobile_auth_error");
    const deviceType = urlParams.get("device");
    if (error) {
      if (isMobileError && deviceType === "mobile") setAuthError("mobile_storage_issue");
      else setAuthError(error);
      window.history.replaceState({}, "", "/");
    }
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center px-4">
      {/* LARGE HERO */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/icons/JemzyLogoIcon.png"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/icons/icon-192.png"; }}
          alt="Jemzy"
          className="h-14 w-14 rounded-md shadow-sm object-contain"
        />
        <h1 className="mt-4 text-3xl font-bold text-white">Welcome to Jemzy</h1>
        <p className="mt-2 text-white/80 text-center max-w-md">
          Your video sharing platform with AI-powered content discovery
        </p>
      </div>

      {/* Card without its internal header */}
      <AuthCard showHeader={false} />
    </div>
    );
  }

  return <>{children}</>;
}
