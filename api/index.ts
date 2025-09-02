import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { customAlphabet } from "nanoid";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { Router } from "express";
import type { RequestHandler } from "express";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";

// --- Types & Helpers ---
type ExpressUser = Express.User;
type Req = import("express").Request & { session?: any; user?: any };
type Res = import("express").Response;
const authOnly = (req: Req, res: Res, next: any) =>
  req.session?.user
    ? next()
    : res.status(401).json({ error: "UNAUTHENTICATED" });
const resend = new Resend(process.env.RESEND_API_KEY!);
const MAIL_FROM = process.env.MAIL_FROM || "Jemzy <no-reply@app.jemzy.net>";

// --- Setup ---
const PGSession = connectPgSimple(session);
const nano = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  48
);

const local = new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      const user = await findUserByEmail(email);
      if (!user) return done(null, false, { message: "Invalid credentials" });

      const ok = await argonVerify(user.password_hash, password);
      if (!ok) return done(null, false, { message: "Invalid credentials" });

      const safeUser: ExpressUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        claims: { sub: user.id, email: user.email, role: user.role },
      };
      return done(null, safeUser);
    } catch (e) {
      return done(e as any);
    }
  }
);

// Keep the passport-local vs passport types happy on Vercel
import type { Strategy as PassportStrategy } from "passport";
passport.use(local as unknown as PassportStrategy);

const store = new PGSession({
  conObject: {
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  },
  tableName: "user_sessions",
  schemaName: "public",
  createTableIfMissing: true,
  disableTouch: true,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  // keep these small to avoid 300s hangs
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
  max: 2,
});

const sessionOptions: session.SessionOptions = {
  store: new PGSession({
    // use conObject so connect-pg-simple uses these timeouts too
    conObject: {
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      max: 1,
    },
    tableName: "user_sessions",
    createTableIfMissing: true,
    disableTouch: true,
    schemaName: "public",
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

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
  const hash = await argonHash(password);
  const { rows } = await pool.query(
    `insert into users (email, password_hash)
     values (lower($1), $2)
     returning id, email, password_hash, role, email_verified`,
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

async function sendMail(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({
      from: MAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("RESEND ERROR", e);
    return false;
  }
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const u = await findUserById(id);
    done(
      null,
      u
        ? ({
            id: u.id,
            email: u.email,
            role: u.role,
            claims: { sub: u.id, email: u.email, role: u.role },
          } as Express.User) // ✅
        : (false as any)
    );
  } catch (e) {
    done(e as any);
  }
});

// --- App ---
const app = express();
const allowed = (process.env.ALLOWED_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.set("trust proxy", 1);
app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow same-origin
      // exact or wildcard *.vercel.app
      const ok = allowed.some((rule) => {
        if (rule.startsWith("*.")) {
          const base = rule.slice(2);
          return origin === `https://${base}` || origin.endsWith(`.${base}`);
        }
        return origin === rule;
      });
      cb(ok ? null : new Error("CORS blocked"), ok);
    },
    credentials: true,
  })
);

app.use(express.json());

// ultra-light routes first (no session / no DB)
app.get("/api/ping", (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// optional: a simple health that never blocks
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(
  session({
    store: new PGSession({
      conObject: {
        connectionString: process.env.DATABASE_URL!,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000, // fail fast
      },
      schemaName: "public",
      tableName: "user_sessions",
      createTableIfMissing: true,
      disableTouch: true,
    }),
    secret: process.env.SESSION_SECRET!,
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

app.get("/api/health-session", (_req, res) => res.json({ ok: true }));

app.use(passport.initialize());
app.use(passport.session());

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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15m
  limit: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

const authRouter = Router();

// only these routes pay the cost of session + deserialize
authRouter.use(session(sessionOptions) as RequestHandler);
authRouter.use(passport.initialize() as RequestHandler);
authRouter.use(passport.session() as RequestHandler);

authRouter.post("/register", authLimiter, async (req, res) => {
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
    const safe: ExpressUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      claims: { sub: user.id, email: user.email, role: user.role },
    };
    req.login(
      // { id: user.id, email: user.email, role: user.role } as any,
      safe,
      (err) => {
        if (err) return res.status(500).json({ error: "login failed" });
        (req.session as any).userId = user.id;
        (req.session as any).auth_state = "local";
        res.json({ id: user.id, email: user.email });
      }
    );
  } catch (e: any) {
    if (e?.code === "23505")
      return res.status(409).json({ error: "email in use" });
    console.error("REGISTER ERROR", e);
    res.status(500).json({ error: "server_error" });
  }
});

// ----- LOGIN (persist session fields) -----
authRouter.post("/login", authLimiter, (req, res, next) => {
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

// ----- LOGOUT (destroy session) -----
authRouter.post("/logout", (req, res) => {
  req.logout(() => {
    (req.session as any)?.destroy?.(() => res.json({ ok: true }));
  });
});

// ----- GET CURRENT USER -----

app.get("/api/auth/me", (req, res) => {
  if (!req.isAuthenticated?.()) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

// ----- EMAIL VERIFY (request + verify) -----
authRouter.post("/request-verify-email", async (req, res) => {
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
    await sendMail(
      rows[0].email,
      "Confirm your email",
      `<p>Confirm your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
    );

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

// ----- EMAIL VERIFY (via link) -----
authRouter.get("/verify-email", async (req, res) => {
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
authRouter.post("/request-reset", authLimiter, async (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase();
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const user = await findUserByEmail(email);
    if (user) {
      const { token } = await createToken(user.id, "password_reset", 30);
      const resetUrl = `${
        process.env.BASE_URL
      }/reset?token=${encodeURIComponent(token)}`; // or an API endpoint
      await sendMail(
        user.email,
        "Reset your password",
        `<p>Reset link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      );
    }
    // Always OK to avoid user enumeration
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

authRouter.post("/reset", async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword)
    return res.status(400).json({ error: "token & newPassword required" });
  try {
    const userId = await consumeToken(String(token), "password_reset");
    if (!userId)
      return res.status(400).json({ error: "invalid or expired token" });
    const hash = await argonHash(String(newPassword));
    await pool.query("update users set password_hash=$1 where id=$2", [
      hash,
      userId,
    ]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

authRouter.get("/user", authOnly, (req, res) => {
  const u = (req as any).user ?? null;
  if (!u)
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  return res.json({ ok: true, user: u });
});

app.use("/api/auth", authRouter);

// server/index.ts
app.get("/api/config/maps-key", (req: Req, res: Res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey)
    return res.status(404).json({ error: "MAPS_KEY_NOT_CONFIGURED" });

  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=600"
  );

  const payload: { apiKey: string; mapId?: string } = { apiKey };
  if (process.env.GOOGLE_MAPS_MAP_ID)
    payload.mapId = process.env.GOOGLE_MAPS_MAP_ID;

  res.json(payload);
});

// ---- PROFILE (camelCase JSON, matches users columns) ----
app.get("/api/users/me/profile", authOnly, async (req: Req, res: Res) => {
  const uid = req.session.user?.id;
  if (!uid) return res.status(401).json({ error: "unauthenticated" });

  const { rows } = await pool.query(
    `select
       id,
       email,
       username,
       bio,
       profile_image_url,
       ready_player_me_avatar_url,
       gem_coins,
       lanterns,
       current_xp,
       current_level,
       email_verified,
       created_at,
       updated_at
     from users
     where id = $1
     limit 1`,
    [uid]
  );
  if (!rows[0]) return res.status(404).json({ error: "profile_not_found" });
  const r = rows[0];

  // send camelCase the UI expects (and avoid toLocaleString() on undefined)
  res.json({
    id: r.id,
    email: r.email,
    username: r.username ?? "",
    bio: r.bio ?? "",
    profileImageUrl: r.profile_image_url ?? null,
    readyPlayerMeAvatarUrl: r.ready_player_me_avatar_url ?? null,
    gemCoins: Number(r.gem_coins ?? 0),
    lanterns: Number(r.lanterns ?? 0),
    currentXp: Number(r.current_xp ?? 0),
    currentLevel: Number(r.current_level ?? 0),
    emailVerified: !!r.email_verified,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
  });
});

function bbox(lat: number, lng: number, r: number) {
  const dLat = r / 111_320,
    dLng = r / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}
function distM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371_000,
    toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat),
    dLng = toRad(bLng - aLng);
  const A =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(A));
}

app.get("/api/videos/nearby", async (req, res) => {
  const lat = Number(req.query.lat),
    lng = Number(req.query.lng);
  const radius = Number(req.query.radius ?? 1000);
  if (!isFinite(lat) || !isFinite(lng))
    return res.status(400).json({ error: "lat_lng_required" });

  const { minLat, maxLat, minLng, maxLng } = bbox(lat, lng, radius);

  const { rows } = await pool.query(
    `select id, title, category, latitude, longitude, user_id, created_at
       from videos
      where latitude between $1 and $2
        and longitude between $3 and $4
      order by created_at desc
      limit 500`,
    [minLat, maxLat, minLng, maxLng]
  );

  res.json(
    rows
      .map((v: any) => {
        const vlat = Number(v.latitude),
          vlng = Number(v.longitude);
        return {
          id: v.id,
          title: v.title,
          category: v.category,
          latitude: v.latitude, // your code reads strings fine
          longitude: v.longitude,
          userId: v.user_id ?? null,
          createdAt: v.created_at ? new Date(v.created_at).toISOString() : null,
          distance: distM(lat, lng, vlat, vlng),
        };
      })
      .filter((v) => v.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
  );
});
app.get("/api/quests/active", async (_req, res) => {
  const { rows } = await pool.query(
    `select id, title, description, image_url,
            latitude, longitude, radius_in_feet,
            start_date, end_date, created_at
       from quests
      where (start_date is null or start_date <= now())
        and (end_date   is null or end_date   >= now())
      order by created_at desc
      limit 100`
  );

  res.json(
    rows.map((q: any) => ({
      id: q.id,
      title: q.title,
      description: q.description ?? "",
      latitude: Number(q.latitude),
      longitude: Number(q.longitude),
      radiusInMeters: Math.round(Number(q.radius_in_feet ?? 100) * 0.3048), // feet → meters
      startDate: q.start_date ? new Date(q.start_date).toISOString() : null,
      endDate: q.end_date ? new Date(q.end_date).toISOString() : null,
      createdAt: q.created_at ? new Date(q.created_at).toISOString() : null,
      imageUrl: q.image_url ?? null,
      status: "active",
    }))
  );
});

app.get("/api/treasure-chests", async (_req, res) => {
  const { rows } = await pool.query(
    `select id, latitude, longitude, coin_reward, difficulty,
            spawned_at, expires_at, is_collected
       from treasure_chests
      where (is_collected is false or is_collected is null)
        and (expires_at is null or expires_at > now())
      order by spawned_at desc
      limit 200`
  );

  res.json(
    rows.map((c: any) => ({
      id: c.id,
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      coinReward: Number(c.coin_reward ?? 0),
      difficulty: c.difficulty ?? "easy",
      spawnedAt: c.spawned_at ? new Date(c.spawned_at).toISOString() : null,
      expiresAt: c.expires_at ? new Date(c.expires_at).toISOString() : null,
      isCollected: !!c.is_collected,
    }))
  );
});

app.get("/api/mystery-boxes", async (_req, res) => {
  const { rows } = await pool.query(
    `select id, latitude, longitude, coin_reward, xp_reward, lantern_reward,
            rarity, spawned_at, expires_at, is_collected
       from mystery_boxes
      where (is_collected is false or is_collected is null)
        and (expires_at is null or expires_at > now())
      order by spawned_at desc
      limit 200`
  );

  res.json(
    rows.map((b: any) => ({
      id: b.id,
      latitude: String(b.latitude),
      longitude: String(b.longitude),
      coinReward: Number(b.coin_reward ?? 0),
      xpReward: Number(b.xp_reward ?? 0),
      lanternReward: Number(b.lantern_reward ?? 0),
      rarity: b.rarity ?? "common",
      spawnedAt: b.spawned_at ? new Date(b.spawned_at).toISOString() : null,
      expiresAt: b.expires_at ? new Date(b.expires_at).toISOString() : null,
      isCollected: !!b.is_collected,
    }))
  );
});

app.get("/api/dragons", async (_req, res) => {
  const { rows } = await pool.query(
    `select id, latitude, longitude, coin_reward, total_health, current_health,
            required_videos_in_radius, radius_meters, spawned_at, expires_at,
            is_defeated, defeated_at, video_count
       from dragons
      where (expires_at is null or expires_at > now())
        and (is_defeated is false or is_defeated is null)
      order by expires_at nulls last, coin_reward desc
      limit 100`
  );

  res.json(
    rows.map((d: any) => ({
      id: d.id,
      latitude: d.latitude, // varchar per your schema
      longitude: d.longitude,
      coinReward: Number(d.coin_reward ?? 0),
      totalHealth: Number(d.total_health ?? 100),
      currentHealth: Number(d.current_health ?? 100),
      videoCount: Number(d.video_count ?? 0),
      radiusMeters: Number(d.radius_meters ?? 60.96),
      spawnedAt: d.spawned_at ? new Date(d.spawned_at).toISOString() : null,
      expiresAt: d.expires_at ? new Date(d.expires_at).toISOString() : null,
    }))
  );
});

app.get("/api/xp/user", (req: Req, res: Res) => {
  // if you want, read a session value when present; otherwise just return zeros
  const xp = (req as any).session?.user?.xp ?? 0;
  res.json({ xp, level: 1 });
});

// GET /api/videos/in-bounds?minLat=&minLng=&maxLat=&maxLng=
app.get("/api/videos/in-bounds", async (req, res) => {
  const minLat = Number(req.query.minLat);
  const minLng = Number(req.query.minLng);
  const maxLat = Number(req.query.maxLat);
  const maxLng = Number(req.query.maxLng);
  if (![minLat, minLng, maxLat, maxLng].every(Number.isFinite)) {
    return res.status(400).json({ error: "bounds_required" });
  }

  const { rows } = await pool.query(
    `select id, title, category, latitude, longitude, user_id, video_url, created_at
       from videos
      where latitude  between $1 and $2
        and longitude between $3 and $4
      order by created_at desc
      limit 500`,
    [minLat, maxLat, minLng, maxLng]
  );

  res.json(
    rows.map((v: any) => ({
      id: v.id,
      title: v.title,
      category: v.category,
      latitude: String(v.latitude),
      longitude: String(v.longitude),
      userId: v.user_id,
      videoUrl: v.video_url,
      createdAt: v.created_at ? new Date(v.created_at).toISOString() : null,
    }))
  );
});

app.get("/api/search/keywords", (req: Req, res: Res) => res.json([]));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("API ERROR", { message: err?.message, stack: err?.stack });
  res.status(err?.status ?? 500).json({ error: "server_error" });
});

export default app as any;
