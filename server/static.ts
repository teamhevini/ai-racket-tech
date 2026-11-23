import express from "express";
import type { Express } from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express): void {
  const distPath = path.resolve(process.cwd(), "dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build directory not found: ${distPath}. Run npm run build first.`);
  }
  // Hashed assets can be cached forever; index.html must always be fresh.
  app.use("/assets", express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(distPath, { index: false }));
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
