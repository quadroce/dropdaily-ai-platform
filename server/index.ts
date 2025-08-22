// server/index.ts

// (Opzionale) Se lo usi: deve essere PRIMA di qualunque init DB/DNS
// import "./bootstrap-ipv4";

import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import dns from "dns/promises";
import { URL } from "node:url";

// Log DNS del DB (non blocca il boot)
try {
  if (process.env.DATABASE_URL) {
    const host = new URL(process.env.DATABASE_URL).hostname;
    dns.lookup(host, { all: true })
      .then(all => console.log("[DNS] lookup", host, "=>", all))
      .catch(err => console.warn("[DNS] lookup failed:", err?.code || err?.message));
  }
} catch (e: any) {
  console.warn("[DNS] preflight failed:", e?.message);
}

const app = express();
let server: Server | null = null;

// Stato di readiness dell’app
let appInitialized = false;

// ──────────────────────────────────────────────────────────────
// Global error handlers (non uscire: lasciamo vivi gli healthcheck)
// ──────────────────────────────────────────────────────────────
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  console.error("Application continuing with degraded functionality...");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  console.error("Application continuing with degraded functionality...");
});

process.on("exit", (code) => {
  console.log("📤 Process exit", code);
});

process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received (shutdown)...");
  if (server) {
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// ──────────────────────────────────────────────────────────────
// Health & root ultra-leggeri (devono rispondere subito 200)
// ──────────────────────────────────────────────────────────────
const healthResponse = { status: "healthy", timestamp: Date.now(), server: "running" };

app.get("/health", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.status(200).json(healthResponse);
});

app.get("/healthz", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.status(200).json(healthResponse);
});

app.get("/ready", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.status(200).json(healthResponse);
});

// HEAD root per health veloci
app.head("/", (_req, res) => res.status(200).end());

// Root: risponde subito 200; se è un health-like, torna JSON; altrimenti passa avanti
app.get("/", (req, res, next) => {
  res.status(200);
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  const isHealthLike =
    ua.includes("health") ||
    ua.includes("check") ||
    ua.includes("curl") ||
    ua.includes("wget") ||
    String(req.headers["accept"] || "").includes("application/json") ||
    req.query.health !== undefined ||
    req.method === "HEAD";

  if (isHealthLike) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    return res.json(healthResponse);
  }

  if (!appInitialized) {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-cache");
    return res.send(`<!doctype html>
<html><head><title>DropDaily</title><meta http-equiv="refresh" content="2"></head>
<body><h1>DropDaily</h1><p>Starting up...</p></body></html>`);
  }

  next();
});

// ──────────────────────────────────────────────────────────────
// Crea il server SUBITO (health checks) e poi fai setup in background
// ──────────────────────────────────────────────────────────────
server = createServer(app);

// timeouts “agili” per health
server.timeout = 10_000;
server.keepAliveTimeout = 15_000;
server.headersTimeout = 12_000;

// Eventi server (safe con optional chaining)
server?.on("error", (error: any) => {
  console.error("Server error:", error);
  if (error?.code === "EADDRINUSE" || error?.code === "EACCES") {
    console.error("❌ Critical server error - exiting");
    process.exit(1);
  }
});

server?.on("listening", () => {
  const addr = server!.address();
  const bind = typeof addr === "string" ? addr : addr?.port;
  console.log(`🚀 Server listening on port ${bind}`);
});

// Avvia il server usando la porta di Render
const port = Number(process.env.PORT || 5000);
console.log("[BOOT] PORT =", process.env.PORT);
server.listen(port, "0.0.0.0", () => {
  console.log("✅ Server started, initializing app...");
  setupAppInBackground();
});

// Mini keep-alive (diagnostica; non dovrebbe servire, ma evita idle edge cases)
setInterval(() => {}, 60_000);

// ──────────────────────────────────────────────────────────────
// Setup in background: middleware → routes → vite/static → DB init
// ──────────────────────────────────────────────────────────────
function setupAppInBackground(): void {
  Promise.resolve().then(async () => {
    console.log("🔧 Background setup starting...");

    const setupTimeout = setTimeout(() => {
      console.warn("⚠️ Background setup timeout - app will continue with basic functionality");
      appInitialized = true;
    }, 20_000);

    try {
      // 1) Middleware base
      console.log("🔧 Setting up middleware...");
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));

      // Logging API (safe su res.on)
      app.use((req, res, next) => {
        const start = Date.now();
        const anyRes = res as any;
        if (typeof anyRes.on === "function") {
          anyRes.on("finish", () => {
            const duration = Date.now() - start;
            if (req.path?.startsWith("/api") && duration > 100) {
              console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
            }
          });
        }
        next();
      });

      // 2) API routes PRIMA di vite
      console.log("📥 Loading API routes...");
      const { registerRoutes } = await import("./routes");
      await registerRoutes(app);
      console.log("✅ API routes loaded successfully");

      // Error handler globale API
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error("API Error:", err);
        if (err?.message?.includes("429") || err?.message?.includes("quota")) {
          return res.status(200).json({
            message: "Service temporarily limited due to external API constraints",
            fallback: true,
          });
        }
        res.status(err?.status || 500).json({
          message: err?.status === 500 ? "Service temporarily unavailable" : err?.message || "Internal Server Error",
        });
      });

      // 3) Vite/static
      console.log("📥 Importing vite module...");
      let viteModule: any = null;
      try {
        viteModule = await import("./vite");
        console.log("✅ Vite module imported successfully");
      } catch (e) {
        console.error("❌ Failed to import vite module:", e);
      }

      console.log("🎯 Setting up Vite/Static serving...");
      if (process.env.NODE_ENV === "development" && viteModule?.setupVite) {
        await viteModule.setupVite(app, server!);
        console.log("✅ Vite setup completed - React app now available");
      } else if (viteModule?.serveStatic) {
        viteModule.serveStatic(app);
        console.log("✅ Static serving setup completed");
      } else {
        // Fallback static “manuale”
        const path = await import("path");
        const staticPath = path.resolve(process.cwd(), "dist", "public");
        app.use(express.static(staticPath));
        console.log("✅ Fallback static serving is active from", staticPath);
      }

      console.log("🎉 Core application setup completed!");

      clearTimeout(setupTimeout);
      appInitialized = true;
      console.log("✅ App now ready to serve requests!");

      // 4) DB init totalmente indipendente (non blocca readiness)
      setImmediate(() => {
        Promise.resolve().then(async () => {
          try {
            console.log("🗄️ Initializing database...");
            const dbInitPromise = Promise.race([
              (async () => {
                const { initializeDatabase } = await import("./scripts/db-init");
                await initializeDatabase();
                // inizializza i topic dopo DB ready
                const { initializeTopics } = await import("./services/contentIngestion");
                await initializeTopics();
              })(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Database initialization timeout")), 15_000)),
            ]);
            await dbInitPromise;
            console.log("🎉 Database initialization completed successfully");
          } catch (error) {
            console.error("Database initialization failed:", error);
            // Continuiamo comunque
          }
        }).catch(err => {
          console.error("Background setup error:", err);
        });
      });

    } catch (error) {
      console.error("Setup error:", error);
      clearTimeout(setupTimeout);
      appInitialized = true;
      console.log("✅ App continuing with basic functionality after setup error");
    }
  });
}
