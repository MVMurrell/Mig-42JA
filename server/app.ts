// PATH: server/app.ts
import path from "node:path";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// --- load env (server only)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// imports you already had (safe on Vercel)
import { registerRoutes } from "./routes";
import { setupMobileAuth } from "./mobileAuth";
import { devAuthMiddleware, ensureDevUser, DEV_USER } from "./devAuth";
// NOTE: do NOT start Vite here; Vercel serves the SPA. Keep your import if needed elsewhere, but don't call it.
// import { setupVite, serveStatic, log } from "./vite"; // not used in serverless

export const app = express();

// core middleware
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// static files your APIs might need (not the SPA)
app.use("/assets", express.static("attached_assets"));
app.use("/map_icons", express.static("public/map_icons"));
app.use("/icons", express.static("public/icons"));
app.use("/uploads", express.static("uploads"));

// dev auth (safe to keep for now)
app.use(async (_req, _res, next) => {
  try {
    await ensureDevUser();
  } catch {}
  next();
});
app.use(devAuthMiddleware);

// auth endpoints used by client
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

// register your other routes
await registerRoutes(app);
setupMobileAuth(app);

// error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

export default app;
