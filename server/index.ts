// PATH: server/index.ts
import { app } from "./app";

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`server http://localhost:${port}`));

// server/index.ts
// import path from "node:path";
// import express, {
//   type Request,
//   type Response,
//   type NextFunction,
// } from "express";
// import cookieParser from "cookie-parser";
// import dotenv from "dotenv";

// import { registerRoutes } from "./routes.ts";
// import { setupVite, serveStatic, log } from "./vite.ts";
// import { questCompletionChecker } from "./questCompletionChecker.ts";
// import { simpleTreasureChestService as treasureChestService } from "./simpleTreasureService.ts";
// import { setupMobileAuth } from "./mobileAuth.ts";
// import { devAuthMiddleware, ensureDevUser, DEV_USER } from "./devAuth";
// import { app } from "./app";

// // Load env (server-side only)
// dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// console.log(
//   process.env.BUNNY_API_KEY?.length,
//   process.env.BUNNY_LIBRARY_ID,
//   process.env.BUNNY_CDN_HOSTNAME
// );

// // Core middleware
// app.use(cookieParser());
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// // Static asset mounts used by features
// app.use("/assets", express.static("attached_assets"));
// app.use("/map_icons", express.static("public/map_icons"));
// app.use("/icons", express.static("public/icons"));
// app.use(express.static("public"));
// app.use("/uploads", express.static("uploads"));

// // Dev-only: ensure a user exists and attach fake user
// app.use(async (_req, _res, next) => {
//   try {
//     await ensureDevUser();
//   } catch {}
//   next();
// });
// app.use(devAuthMiddleware);

// // Dev auth endpoints
// app.get("/api/auth/login", (req, res) => {
//   res.cookie("jid", "dev", { httpOnly: true, sameSite: "lax" });
//   return res.json({ ok: true, user: (req as any).user ?? DEV_USER });
// });

// app.get("/api/auth/user", (req, res) => {
//   const user = (req as any).user ?? null;
//   if (!user)
//     return res.status(401).json({ ok: false, error: "Not authenticated" });
//   return res.json({ ok: true, user });
// });

// app.post("/api/auth/logout", (_req, res) => {
//   res.clearCookie("jid");
//   return res.json({ ok: true });
// });

// // Log API responses
// app.use((req, res, next) => {
//   const start = Date.now();
//   const { path: p } = req;
//   let captured: unknown;

//   const orig = res.json.bind(res);
//   (res as any).json = (body: unknown, ...args: unknown[]) => {
//     captured = body;
//     return orig(body as any, ...(args as any));
//   };

//   res.on("finish", () => {
//     if (p.startsWith("/api")) {
//       let line = `${req.method} ${p} ${res.statusCode} in ${
//         Date.now() - start
//       }ms`;
//       if (captured) line += ` :: ${JSON.stringify(captured)}`;
//       if (line.length > 80) line = line.slice(0, 79) + "…";
//       log(line);
//     }
//   });

//   next();
// });

// const port = Number(process.env.PORT) || 3001;
// app.listen(port, () => console.log(`server http://localhost:${port}`));

// (async () => {
//   try {
//     console.log("🚀 Server startup beginning...", {
//       isProduction: !!process.env.REPLIT_DEPLOYMENT,
//       nodeEnv: process.env.NODE_ENV,
//       hasDatabaseUrl: !!process.env.DATABASE_URL,
//     });

//     // Register your API routes first
//     const server = await registerRoutes(app);
//     console.log("✅ Routes registered successfully");

//     // Mobile auth endpoints
//     setupMobileAuth(app);
//     console.log("📱 Mobile authentication endpoints registered");

//     // Error handler (before Vite/static)
//     app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
//       const status = err.status || err.statusCode || 500;
//       const message = err.message || "Internal Server Error";
//       console.error("🚨 SERVER ERROR:", { status, message, stack: err.stack });
//       if (process.env.REPLIT_DEPLOYMENT) {
//         res.status(status).json({ message: "Service temporarily unavailable" });
//       } else {
//         res.status(status).json({ message });
//       }
//     });

//     // Dev vs prod client serving
//     if (!process.env.REPLIT_DEPLOYMENT) {
//       console.log("🔧 Starting development mode with Vite");
//       await setupVite(app, server);
//     } else {
//       console.log("🚀 Starting production mode with static files");
//       serveStatic(app);
//     }

//     console.log(
//       "✅ Using new CONTENT_MODERATION_WORKER credentials for all Google Cloud services"
//     );

//     const port = Number(process.env.PORT) || 3000;
//     app.listen(port, () => {
//       log(`🚀 Serving on port ${port}`);

//       // Background jobs
//       questCompletionChecker.start();

//       console.log(
//         "🤖 Starting automatic processor for pending AI analysis videos"
//       );
//       console.log("🎁 Starting treasure chest spawning system...");
//       setInterval(async () => {
//         try {
//           await treasureChestService.cleanupExpiredChests();
//           await treasureChestService.spawnTreasureChest();
//         } catch (error) {
//           console.error("🎁 TREASURE: Error in scheduled spawn:", error);
//         }
//       }, 3 * 60 * 60 * 1000);

//       setTimeout(async () => {
//         try {
//           await treasureChestService.spawnTreasureChest();
//           console.log("🎁 TREASURE: Initial spawn attempt completed");
//         } catch (error) {
//           console.error("🎁 TREASURE: Error in initial spawn:", error);
//         }
//       }, 10_000);

//       if (process.env.ENABLE_MYSTERY_BOX !== "false") {
//         console.log("🎁 MYSTERY BOX: Starting mystery box spawning system...");
//         setInterval(async () => {
//           try {
//             const { mysteryBoxService } = await import(
//               "./mysteryBoxService.ts"
//             );
//             await mysteryBoxService.spawnMysteryBox(false);
//           } catch (error) {
//             console.error("🎁 MYSTERY BOX: Error in scheduled spawn:", error);
//           }
//         }, 2 * 60 * 60 * 1000);

//         setTimeout(async () => {
//           try {
//             const { mysteryBoxService } = await import(
//               "./mysteryBoxService.ts"
//             );
//             await mysteryBoxService.spawnMysteryBox(true);
//             console.log("🎁 MYSTERY BOX: Initial spawn attempt completed");
//           } catch (error) {
//             console.error("🎁 MYSTERY BOX: Error in initial spawn:", error);
//           }
//         }, 12_000);
//       }

//       if (process.env.ENABLE_DRAGON !== "false") {
//         console.log("🐉 Starting dragon system...");
//         setTimeout(async () => {
//           try {
//             const { dragonService } = await import("./dragonService.ts");
//             dragonService.startDragonSystem();
//             console.log("🐉 DRAGON: System started successfully");
//           } catch (error) {
//             console.error("🐉 DRAGON: Error starting system:", error);
//           }
//         }, 15_000);
//       }
//     });
//   } catch (error: any) {
//     console.error("🚨 CRITICAL STARTUP ERROR:", error);
//     console.error("Stack trace:", error?.stack);
//     process.exit(1);
//   }
// })();
