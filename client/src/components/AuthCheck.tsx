import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader, AlertTriangle, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">Welcome to Jemzy</h1>
          <p className="text-lg mb-8">Your video sharing platform with AI-powered content discovery</p>

          {/* existing error blocks stay the same */}
          {authError && (
            /* ... your existing authError block ... */
            <></>
          )}

          {/* EMAIL/PASSWORD FORM */}
          <form className="space-y-3 mb-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-md px-3 py-2 text-slate-900"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-md px-3 py-2 text-slate-900"
            />
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={onLoginClick} className="w-full bg-white text-purple-900 hover:bg-gray-100">
                Sign in
              </Button>
              <Button onClick={onRegisterClick} className="w-full bg-purple-700 hover:bg-purple-600">
                Create account
              </Button>
            </div>
          </form>

          {/* PWA help + notes (unchanged) */}
          {isPWA && !authError && (
            /* ... your existing PWA help block ... */
            <></>
          )}

          <div className="text-sm opacity-75 space-y-1">
            <p>Authentication uses secure cookies</p>
            <p>PWA apps may have storage restrictions</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
