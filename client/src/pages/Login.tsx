import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
    } catch (e: any) {
      setErr(e?.data?.error || e.message || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">{mode === "login" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={busy} className="w-full rounded bg-black text-white py-2">{busy ? "…" : (mode === "login" ? "Sign in" : "Sign up")}</button>
      </form>
      <button className="underline text-sm mt-3" onClick={()=>setMode(mode==="login"?"register":"login")}>
        {mode==="login" ? "Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
