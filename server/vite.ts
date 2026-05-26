import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(server: Server, app: Express): Promise<void> {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(__dirname, "../vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
