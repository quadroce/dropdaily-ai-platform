import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(process.cwd(), "client"),
  publicDir: path.resolve(process.cwd(), "client", "public"),
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "client", "src"),
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist", "public"),
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false
  },
  optimizeDeps: {
    exclude: ["lightningcss", "@babel/preset-typescript/package.json"]
  }
});
