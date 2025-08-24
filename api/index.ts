import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import * as argon2 from "argon2";
import serverless from "serverless-http";

const PGSession = connectPgSimple(session);

// --- DB ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Replace with your actual users table/columns
type UserRow = { id: string; email: string; password_hash: string };

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const q = `select id, email, password_hash from users where email = $1 limit 1`;
  const { rows } = await pool.query(q, [email]);
  return rows[0] ?? null;
}
async function findUserById(id: string): Promise<UserRow | null> {
  const q = `select id, email, password_hash from users where id = $1 limit 1`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] ?? null;
}
async function createUser(email: string, password: string): Promise<UserRow> {
  const hash = await argon2.hash(password);
  const q = `insert into users (email, password_hash) values ($1, $2) returning id, email, password_hash`;
  const { rows } = await pool.query(q, [email, hash]);
  return rows[0];
}

// --- Passport (local) ---
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email.toLowerCase());
        if (!user) return done(null, false, { message: "Invalid credentials" });
        const ok = await argon2.verify(user.password_hash, password);
        if (!ok) return done(null, false, { message: "Invalid credentials" });
        return done(null, { id: user.id, email: user.email });
      } catch (e) {
        return done(e as any);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const u = await findUserById(id);
    done(null, u ? { id: u.id, email: u.email } : false);
  } catch (e) {
    done(e as any);
  }
});

// --- App ---
const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin:
      (process.env.ALLOWED_ORIGIN ?? "").split(",").filter(Boolean) || true,
    credentials: true,
  })
);
app.use(express.json());

// FIX: use conString instead of Pool here to avoid the TS mismatch
app.use(
  session({
    store: new PGSession({
      conString: process.env.DATABASE_URL as string,
      tableName: "user_sessions",
    }),
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Health & DB check (served by the same function)
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);
app.get("/api/dbcheck", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ db: "up" });
  } catch (e: any) {
    res.status(500).json({ db: "down", error: e?.message });
  }
});

// Auth
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ error: "email & password required" });
  try {
    const existing = await findUserByEmail(String(email).toLowerCase());
    if (existing) return res.status(409).json({ error: "email in use" });
    const user = await createUser(String(email), String(password));
    req.login({ id: user.id, email: user.email } as any, (err) => {
      if (err) return res.status(500).json({ error: "login failed" });
      res.json({ id: user.id, email: user.email });
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res.status(401).json({ error: info?.message ?? "Unauthorized" });
    req.login(user, (err2) => {
      if (err2) return next(err2);
      res.json({ id: (user as any).id, email: (user as any).email });
    });
  })(req, res, next);
});

app.post("/api/auth/logout", (req, res) => {
  req.logout(() => {
    (req.session as any)?.destroy?.(() => res.json({ ok: true }));
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.isAuthenticated?.()) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

export default serverless(app);
