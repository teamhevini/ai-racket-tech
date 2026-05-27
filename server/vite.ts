import type { Express } from "express";
import type { Server } from "http";
import path from "path";

export async function setupVite(server: Server, app: Express): Promise<void> {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
