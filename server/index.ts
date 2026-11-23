import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { serveStatic } from "./static";
import { log } from "./log";
import { startReminderSchedule } from "./reminder-mailer";

(async () => {
  const app = await createApp();
  const httpServer = createServer(app);
  const isProd = process.env.NODE_ENV === "production";

  // Vite (dev) or the built bundle (prod) go last so API routes win.
  if (isProd) {
    serveStatic(app);
    startReminderSchedule();
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: isProd ? "0.0.0.0" : "localhost" }, () => log(`serving on port ${port}`));
})().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
