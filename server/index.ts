// server/index.ts
import "./bootstrap-ipv4";            // deve stare PRIMA di qualsiasi init DB
import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";

const app = express();

// ---------- Health endpoints (sempre veloci) ----------
const health = { status: "healthy", timestamp: Date.now(), server: "running" };
app.get("/health", (_req, res) => res.status(200).json(health));
app.get("/healthz", (_req, res) => res.status(200).json(health));
app.get("/ready", (_req, res) => res.status(200).json(health));
app.head("/", (_req, res) => res.status(200).end());

// ---------- Error & shutdown resilience ----------
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  console.error("Continuo con funzionalità ridotte…");
});
process.on("unhandledRejection", (reason, p) => {
  console.error("💥 Unhandled Rejection at:", p, "reason:", reason);
  console.error("Continuo con funzionalità ridotte…");
});

const server = createServer(app);
process.on("SIGTERM", () => {
  console.log("🔄 SIGTERM: chiusura gracefull…");
  server.close(() => {
    console.log("✅ Server chiuso");
    process.exit(0);
  });
});

// ---------- Avvio server immediato (per health check) ----------
const isProd = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const port = Number(process.env.PORT || 5000);

server.keepAliveTimeout = 15000;
server.headersTimeout = 12000;

server.listen(port, "0.0.0.0", () => {
  console.log(`[BOOT] PORT = ${port}`);
  console.log(`🚀 Server listening on 0.0.0.0:${port}`);
  setupAppInBackground().catch((e) => {
    console.error("Setup error:", e);
    console.log("✅ Proseguo con funzionalità base dopo l’errore di setup");
  });
});

// ======================================================
//  App setup in background (evita di bloccare health)
// ======================================================
async function setupAppInBackground(): Promise<void> {
  console.log("🔧 Background setup starting…");

  // (Opzionale) Log DNS DB senza top-level await
  try {
    if (process.env.DATABASE_URL) {
      const host = new URL(process.env.DATABASE_URL).hostname;
      const all = await dns.lookup(host, { all: true });
      console.log("[DNS] lookup", host, "=>", all);
    }
  } catch (e) {
    console.warn("[DNS] lookup failed:", (e as Error).message);
  }

  // ---------- Middleware base ----------
  console.log("🔧 Setting up middleware…");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Log lento solo per /api
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const dt = Date.now() - start;
      if (req.path.startsWith("/api") && dt > 100) {
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${dt}ms`);
      }
    });
    next();
  });

  // ---------- API routes PRIMA del frontend ----------
  console.log("📥 Loading API routes…");
  const { registerRoutes } = await import("./routes");
  await registerRoutes(app);
  console.log("✅ API routes loaded successfully");

  // Error handler API
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

  // ---------- Frontend: Vite in dev, statico in prod ----------
  console.log("🎯 Setting up frontend (Vite/Static)…");
  let viteModule: any = null;
  try {
    viteModule = await import("./vite");
    console.log("✅ Vite module imported successfully");
  } catch (e) {
    console.warn("⚠️ vite module not available:", (e as Error).message);
  }

  const staticDir = path.resolve(process.cwd(), "dist", "public");
  const builtIndex = path.join(staticDir, "index.html");
  const clientIndex = path.resolve(process.cwd(), "client", "index.html");

  console.log("[frontend] isProd:", isProd);
  console.log("[frontend] client/index.html exists:", fs.existsSync(clientIndex));
  console.log("[frontend] dist/public/index.html exists:", fs.existsSync(builtIndex));

  if (!isProd && viteModule?.setupVite && fs.existsSync(clientIndex)) {
    // DEV LOCALE: sempre Vite middleware
    await viteModule.setupVite(app, server);
    console.log("✅ Vite dev middleware mounted");
  } else if (viteModule?.serveStatic && fs.existsSync(builtIndex)) {
    // PROD / build locale: statico da dist/public
    viteModule.serveStatic(app);
    console.log("✅ Static serving mounted");
  } else {
    // Fallback API-only (evita “Cannot GET /”)
    console.log("ℹ️ No frontend detected – running in API-only mode");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res
        .status(200)
        .send(`<!doctype html>
<h1>DropDaily API-only</h1>
<p>Nessun frontend in esecuzione.</p>
<ul>
  <li><a href="/healthz">/healthz</a></li>
  <li><a href="/api/admin/stats">/api/admin/stats</a></li>
</ul>`);
    });
  }

  console.log("🎉 Core application setup completed!");

  // ---------- DB init (non-blocking) ----------
  setImmediate(async () => {
    try {
      console.log("🗄️ Initializing database…");
      const { initializeDatabase } = await import("./scripts/db-init");
      await initializeDatabase();

      try {
        const { initializeTopics } = await import("./services/contentIngestion");
        await initializeTopics();
      } catch (e) {
        console.warn("⚠️ Topics init skipped:", (e as Error).message);
      }

      console.log("🎉 Database initialization completed successfully");
    } catch (e) {
      console.error("Database initialization failed:", e);
    }
  });
}
