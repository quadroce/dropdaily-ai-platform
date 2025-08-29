// server/vite.ts
import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import type { Server } from "http";
import { createServer as createViteServer, InlineConfig } from "vite";

export async function setupVite(app: Express, httpServer: Server) {
  // ✅ Carichiamo il config file alla root (dove c'è l'alias "@")
  const inline: InlineConfig = {
    // NON mettere root qui: lo prende dal config file
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    appType: "spa",
    server: {
      middlewareMode: true,
      hmr: {
        // HMR via lo stesso server HTTP → niente più WS che cade
        server: httpServer,
      },
    },
  };

  const vite = await createViteServer(inline);
  app.use(vite.middlewares);

  // Fallback SPA in dev (usa il root letto dal config)
  const clientRoot = vite.config.root; // es: <repo>/client
  const clientIndex = path.join(clientRoot, "index.html");

  app.get("*", async (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    try {
      const htmlTpl = await fs.readFile(clientIndex, "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, htmlTpl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).end(html);
    } catch (e: any) {
      vite.ssrFixStacktrace?.(e);
      next(e);
    }
  });
}

export async function serveStatic(app: Express) {
  const distPublic = path.resolve(process.cwd(), "dist", "public");
  const distIndex = path.join(distPublic, "index.html");

  const exists = await fs
    .access(distIndex)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    console.warn("ℹ️ dist/public non trovato: modalità API-only");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res
        .status(200)
        .send(`<!doctype html><h1>DropDaily API-only</h1><p>No frontend build found.</p>`);
    });
    return;
  }

  const express = (await import("express")).default;
  app.use(express.static(distPublic));
  app.get("*", (_req, res) => res.sendFile(distIndex));
}
