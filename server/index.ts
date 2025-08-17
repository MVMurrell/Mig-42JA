import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.ts";
import { setupVite, serveStatic, log } from "./vite.ts";
// Replit Auth will be setup in registerRoutes
import { questCompletionChecker } from "./questCompletionChecker.ts";
import { pendingAIProcessor } from "./pendingAIProcessor.ts";
import { simpleTreasureChestService as treasureChestService } from "./simpleTreasureService.ts";
import { setupMobileAuth } from "./mobileAuth.ts";
import cookieParser from 'cookie-parser';


const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Add cookie parser for secure authentication cookies
app.use(cookieParser());

// Replit Auth setup moved to registerRoutes function

// Serve gem assets for Google Maps
app.use('/assets', express.static('attached_assets'));
app.use('/map_icons', express.static('public/map_icons'));
app.use('/icons', express.static('public/icons'));

// Serve public files including logo
app.use(express.static('public'));

// Serve uploaded quest images
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('🚀 Server startup beginning...', {
      isProduction: !!process.env.REPLIT_DEPLOYMENT,
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
    
    const server = await registerRoutes(app);
    console.log('✅ Routes registered successfully');
    
    // Setup mobile authentication endpoints
    setupMobileAuth(app);
    console.log('📱 Mobile authentication endpoints registered');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('🚨 SERVER ERROR:', {
      status,
      message,
      stack: err.stack,
      url: _req.url,
      method: _req.method,
      isProduction: !!process.env.REPLIT_DEPLOYMENT,
      nodeEnv: process.env.NODE_ENV
    });

    // In production, send a simplified error message
    if (process.env.REPLIT_DEPLOYMENT) {
      res.status(status).json({ message: "Service temporarily unavailable" });
    } else {
      res.status(status).json({ message });
    }
    
    console.error('Server error handled:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (!process.env.REPLIT_DEPLOYMENT) {
    console.log('🔧 Starting development mode with Vite');
    await setupVite(app, server);
  } else {
    console.log('🚀 Starting production mode with static files');
    serveStatic(app);
  }

  // All services now use CONTENT_MODERATION_WORKER_JUN_26_2025 credentials directly
  console.log('✅ Using new CONTENT_MODERATION_WORKER credentials for all Google Cloud services');


 const port = process.env.PORT || 3000;

app.listen(Number(process.env.PORT) || 3000, () => { 
  log(`🚀 Serving on port ${port}`);

  // Start quest completion checker
  questCompletionChecker.start();

  // Start automatic processor for pending AI analysis videos
  console.log("🤖 Starting automatic processor for pending AI analysis videos");

  // Start treasure chest system
  console.log("🎁 Starting treasure chest spawning system...");
  setInterval(async () => {
    try {
      await treasureChestService.cleanupExpiredChests();
      await treasureChestService.spawnTreasureChest();
    } catch (error) {
      console.error("🎁 TREASURE: Error in scheduled spawn:", error);
    }
  }, 3 * 60 * 60 * 1000);

  setTimeout(async () => {
    try {
      await treasureChestService.spawnTreasureChest();
      console.log("🎁 TREASURE: Initial spawn attempt completed");
    } catch (error) {
      console.error("🎁 TREASURE: Error in initial spawn:", error);
    }
  }, 10000);

  // Start mystery box system
  console.log("🎁 MYSTERY BOX: Starting mystery box spawning system...");
  setInterval(async () => {
    try {
      const { mysteryBoxService } = await import("./mysteryBoxService.ts");
      await mysteryBoxService.spawnMysteryBox(false);
    } catch (error) {
      console.error("🎁 MYSTERY BOX: Error in scheduled spawn:", error);
    }
  }, 2 * 60 * 60 * 1000);

  setTimeout(async () => {
    try {
      const { mysteryBoxService } = await import("./mysteryBoxService.ts");
      await mysteryBoxService.spawnMysteryBox(true);
      console.log("🎁 MYSTERY BOX: Initial spawn attempt completed");
    } catch (error) {
      console.error("🎁 MYSTERY BOX: Error in initial spawn:", error);
    }
  }, 12000);

  // Start dragon system
  console.log("🐉 Starting dragon system...");
  setTimeout(async () => {
    try {
      const { dragonService } = await import("./dragonService.ts");
      dragonService.startDragonSystem();
      console.log("🐉 DRAGON: System started successfully");
    } catch (error) {
      console.error("🐉 DRAGON: Error starting system:", error);
    }
  }, 15000);
});


  
  } catch (error) {
    console.error('🚨 CRITICAL STARTUP ERROR:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
