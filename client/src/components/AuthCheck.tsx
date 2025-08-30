import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader, AlertTriangle, Smartphone } from "lucide-react";
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
       <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <AuthCard />
    </div>
    );
  }

  return <>{children}</>;
}
