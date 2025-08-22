// server/vite.ts
import type { Express } from "express";
import express from "express";
import fs from "node:fs";
import path from "node:path";

// Dev: Vite in middleware mode (importato solo quando serve)
export async function setupVite(app: Express, server: import("http").Server) {
  const vitePkg = await import("vite");
  const createViteServer = (vitePkg as any).createServer as typeof import("vite").createServer;

  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    root: path.resolve(process.cwd(), "client"),
  });

  app.use(vite.middlewares);
}

// Prod: servi gli asset statici già buildati
export function serveStatic(app: Express) {
  const staticPath = path.resolve(process.cwd(), "dist", "public");

  app.use(express.static(staticPath));

  // SPA fallback: per tutte le route non-API restituisci index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const indexFile = path.join(staticPath, "index.html");
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).send("index.html not found. Did you run `vite build`?");
    }
  });
} // devosolo replyte: uncomment above and remove this line
 