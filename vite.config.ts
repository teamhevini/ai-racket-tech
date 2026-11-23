import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Framework code changes rarely; keep it in its own long-cached chunk.
        manualChunks: {
          react: ["react", "react-dom", "wouter", "@tanstack/react-query"],
          motion: ["framer-motion"],
          ui: ["@radix-ui/react-dialog", "vaul", "sonner"],
        },
      },
    },
  },
});
