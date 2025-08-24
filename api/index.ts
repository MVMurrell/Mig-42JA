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
import { customAlphabet } from "nanoid";

const PGSession = connectPgSimple(session);
const nano = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  48
);

// --- DB ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "moderator" | "admin";
  email_verified: boolean;
};

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query(
    "select id, email, password_hash, role, email_verified from users where lower(email)=lower($1) limit 1",
    [email]
  );
  return rows[0] ?? null;
}

async function findUserById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query(
    "select id, email, password_hash, role, email_verified from users where id = $1 limit 1",
    [id]
  );
  return rows[0] ?? null;
}

async function createUser(email: string, password: string): Promise<UserRow> {
  const hash = await argon2.hash(password);
  const { rows } = await pool.query(
    "insert into users (email, password_hash) values (lower($1), $2) returning id, email, password_hash, role, email_verified",
    [email, hash]
  );
  return rows[0];
}

async function createToken(
  userId: string,
  purpose: "email_verify" | "password_reset",
  ttlMinutes: number
) {
  const token = nano();
  const { rows } = await pool.query(
    `INSERT INTO auth_tokens (user_id, token, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
     RETURNING token, expires_at`,
    [userId, token, purpose, String(ttlMinutes)]
  );
  return rows[0];
}
async function consumeToken(
  token: string,
  purpose: "email_verify" | "password_reset"
) {
  const { rows } = await pool.query(
    `UPDATE auth_tokens
       SET used_at = NOW()
     WHERE token = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [token, purpose]
  );
  return rows[0]?.user_id as string | undefined;
}

// DEV mailer: logs link; swap to Resend/SMTP later
async function sendEmail(
  devLabel: string,
  to: string,
  subject: string,
  html: string
) {
  console.log(`[MAIL:${devLabel}] to=${to} subject="${subject}"\n${html}`);
}

// --- Passport (local) ---
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        const ok = await argon2.verify(user.password_hash, password);
        if (!ok) return done(null, false, { message: "Invalid credentials" });
        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role,
        } as any); // cast to quiet TS
      } catch (e) {
        return done(e as any);
      }
    }
  )
);

const local = new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      const user = await findUserByEmail(email);
      if (!user) return done(null, false, { message: "Invalid credentials" });
      const ok = await argon2.verify(user.password_hash, password);
      if (!ok) return done(null, false, { message: "Invalid credentials" });
      return done(null, {
        id: user.id,
        email: user.email,
        role: user.role,
      } as any);
    } catch (e) {
      return done(e as any);
    }
  }
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const u = await findUserById(id);
    done(
      null,
      u ? ({ id: u.id, email: u.email, role: u.role } as any) : (false as any)
    );
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
// ----- REGISTER (ensure session fields are set) -----
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ error: "email & password required" });
  try {
    const existing = await findUserByEmail(String(email).toLowerCase());
    if (existing) return res.status(409).json({ error: "email in use" });
    const user = await createUser(
      String(email).toLowerCase(),
      String(password)
    );
    req.login({ id: user.id, email: user.email } as any, async (err) => {
      if (err) return res.status(500).json({ error: "login failed" });
      (req.session as any).userId = (user as any).id;
      (req.session as any).auth_state = "local";

      // send verify email
      const { token } = await createToken(user.id, "email_verify", 60 * 24);
      const verifyUrl = `${
        process.env.BASE_URL
      }/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      await sendEmail(
        "verify",
        user.email,
        "Confirm your email",
        `<p>Confirm: <a href="${verifyUrl}">${verifyUrl}</a></p>`
      );
      res.json({ id: user.id, email: user.email, emailed_verification: true });
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

// ----- LOGIN (persist session fields) -----
app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res.status(401).json({ error: info?.message ?? "Unauthorized" });
    req.login(user, (err2) => {
      if (err2) return next(err2);
      (req.session as any).userId = (user as any).id;
      (req.session as any).auth_state = "local";

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

app.post("/api/auth/request-verify-email", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: "not authenticated" });
    const { token } = await createToken(userId, "email_verify", 60 * 24);
    const verifyUrl = `${
      process.env.BASE_URL
    }/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    // lookup email
    const { rows } = await pool.query("select email from users where id=$1", [
      userId,
    ]);
    await sendEmail(
      "verify",
      rows[0].email,
      "Confirm your email",
      `<p>Confirm: <a href="${verifyUrl}">${verifyUrl}</a></p>`
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

app.get("/api/auth/verify-email", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).send("missing token");
  try {
    const userId = await consumeToken(token, "email_verify");
    if (!userId) return res.status(400).send("invalid or expired token");
    await pool.query("update users set email_verified=true where id=$1", [
      userId,
    ]);
    res.send("Email verified. You can close this window.");
  } catch (e: any) {
    res.status(500).send("server error");
  }
});

// ----- PASSWORD RESET (request + reset) -----
app.post("/api/auth/request-reset", async (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase();
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const user = await findUserByEmail(email);
    if (user) {
      const { token } = await createToken(user.id, "password_reset", 30);
      const resetUrl = `${
        process.env.BASE_URL
      }/reset?token=${encodeURIComponent(token)}`; // or an API endpoint
      await sendEmail(
        "reset",
        user.email,
        "Reset your password",
        `<p>Reset: <a href="${resetUrl}">${resetUrl}</a></p>`
      );
    }
    // Always OK to avoid user enumeration
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

app.post("/api/auth/reset", async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword)
    return res.status(400).json({ error: "token & newPassword required" });
  try {
    const userId = await consumeToken(String(token), "password_reset");
    if (!userId)
      return res.status(400).json({ error: "invalid or expired token" });
    const hash = await (await import("argon2")).hash(String(newPassword));
    await pool.query("update users set password_hash=$1 where id=$2", [
      hash,
      userId,
    ]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("API ERROR", { message: err?.message, stack: err?.stack });
  res.status(500).json({ error: "server_error" });
});

export default serverless(app);
