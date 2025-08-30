import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

export default function AuthCard() {
  const { login } = useAuth(); // we'll call register via fetch (works with your API today)
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isEmailOk = /\S+@\S+\.\S+/.test(email);
  const isPwdOk = password.length >= 8;
  const doPasswordsMatch = mode === "signin" || password === confirm;

  const canSubmit =
    isEmailOk &&
    isPwdOk &&
    doPasswordsMatch &&
    !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!canSubmit) return;

    try {
      setBusy(true);

      if (mode === "signin") {
        // Existing flow
        await login(email, password);
        setInfo("Signed in.");
        return;
      }

      // --- SIGN UP FLOW ---
      // 1) Create the account
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Sign up failed");
      }

      // 2) Fire the verify email (your API needs auth; register logs-in the session)
      await fetch("/api/auth/request-verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
      }).catch(() => { /* non-fatal */ });

      setInfo("Account created. Check your email to verify your address.");
      setMode("signin");
      setPassword("");
      setConfirm("");

    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white/95 rounded-2xl shadow-xl p-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "signin" ? "bg-purple-600 text-white" : "bg-gray-100"}`}
          onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "signup" ? "bg-purple-600 text-white" : "bg-gray-100"}`}
          onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
          type="button"
        >
          Create account
        </button>
      </div>

      {/* Copy changes per mode */}
      <div className="mb-4 text-center">
        {mode === "signin" ? (
          <p className="text-sm text-gray-600">Welcome back! Enter your email and password to continue.</p>
        ) : (
          <p className="text-sm text-gray-600">
            Create your Jemzy account. You’ll verify your email after this step.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
          <Input
            type="password"
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {mode === "signup" && (
            <p className="mt-1 text-[11px] text-gray-500">Use 8+ characters. Add numbers/symbols for extra strength.</p>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm password</label>
            <Input
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            {!doPasswordsMatch && confirm.length > 0 && (
              <p className="mt-1 text-[11px] text-red-600">Passwords don’t match.</p>
            )}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        {info && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{info}</div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {mode === "signup" && (
        <p className="mt-3 text-[11px] text-center text-gray-500">
          By creating an account, you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      )}
    </div>
  );
}
