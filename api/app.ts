// PATH: api/app.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import path from "node:path";

export const DEV_USER = {
  id: "dev-user-1",
  username: "devuser",
  email: "dev@local.test",
  name: "Dev User",
  createdAt: new Date().toISOString(),
};

const app = express();

// Core middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Static assets needed by APIs (NOT the SPA; Vercel serves the SPA)
app.use("/assets", express.static("attached_assets"));
app.use("/map_icons", express.static("public/map_icons"));
app.use("/icons", express.static("public/icons"));
app.use("/uploads", express.static("uploads"));

// ===== Preview-safe auth stub (no DB, no external deps) =====
app.use((_req, _res, next) => {
  // attach a dev user; real auth can replace this later
  (_req as any).user = DEV_USER;
  next();
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "unknown" });
});

// Auth endpoints
app.get("/api/auth/login", (req, res) => {
  res.cookie("jid", "dev", { httpOnly: true, sameSite: "lax" });
  return res.json({ ok: true, user: (req as any).user ?? DEV_USER });
});

app.get("/api/auth/user", (req, res) => {
  const user = (req as any).user ?? null;
  if (!user)
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  return res.json({ ok: true, user });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("jid");
  return res.json({ ok: true });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API ERROR:", err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

export default app;
