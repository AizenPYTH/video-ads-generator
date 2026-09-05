import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      // Keeps dev same-origin so downloads and video playback behave like prod.
      "/api": {
        target: process.env.VITE_PROXY_TARGET ?? "http://localhost:3001",
        changeOrigin: true,
      },
      "/assets": {
        target: process.env.VITE_PROXY_TARGET ?? "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
