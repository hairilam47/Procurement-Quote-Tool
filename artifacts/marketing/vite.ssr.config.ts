import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Minimal config for SSR bundle — no PORT or dev-server plugins needed.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/marketing/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    ssr: "src/entry-server.tsx",
    outDir: path.resolve(import.meta.dirname, "dist/server"),
    rollupOptions: {
      output: { format: "esm", entryFileNames: "[name].js" },
    },
  },
});
