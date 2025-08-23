// server/vite.ts
import type { Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import type { Server } from "http";
import fs from "node:fs/promises";
import path from "node:path";

const log = createLogger();

export async function setupVite(app: Express, _server: Server) {
  // Usa SEMPRE il config del progetto (dove c’è l’alias "@")
  const configFile = path.resolve(process.cwd(), "vite.config.ts");

  const vite = await createViteServer({
    configFile,
    appType: "custom",
    // Non passare root qui: lo prende dal config (root: "client")
  });

  app.use(vite.middlewares);

  // index.html dal client, con transform di Vite
  app.use("*", async (req, res, next) => {
    try {
      const templatePath = path.resolve(process.cwd(), "client", "index.html");
      let template = await fs.readFile(templatePath, "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      log.error(e as any);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export async function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const exists = await fs.stat(distPath).then(() => true).catch(() => false);
  if (!exists) {
    throw new Error(
      `dist/public non trovato. Esegui prima "npm run build". Path: ${distPath}`
    );
  }
  const express = (await import("express")).default;
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}
