// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: path.resolve(here, "client"),

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(here, "client", "src"),
      // mantieni questi solo se davvero li usi:
      // "@shared": path.resolve(here, "shared"),
      // "@assets": path.resolve(here, "attached_assets"),
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },

  build: {
    outDir: path.resolve(here, "dist", "public"),
    emptyOutDir: true,
    sourcemap: true,
  },
});
