import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { initDb, pool } from "./db";
import { seedAdmin, seedCatalog } from "./seed";
import { log } from "./log";
import { accountRouter } from "./routes/account";
import { bagRouter } from "./routes/bag";
import { stringersRouter } from "./routes/stringers";
import { recommendRouter } from "./routes/recommend";
import { billingRouter } from "./routes/billing";
import { adminRouter } from "./routes/admin";
import { chatRouter } from "./routes/chat";
import { shopsRouter } from "./routes/shops";
import { brandsRouter } from "./routes/brands";
import { marketplaceRouter } from "./routes/marketplace";
import { seedStrings, seedDemo } from "./b2b-seed";
import { runReminderJob } from "./reminder-mailer";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const isProd = process.env.NODE_ENV === "production";

export async function createApp(opts: { seed?: boolean; demo?: boolean } = {}) {
  await initDb();
  if (opts.seed !== false) {
    await seedCatalog();
    await seedAdmin();
    await seedStrings();
    // Demo businesses only where asked for (preview, tests) — never in production by default.
    if (opts.demo ?? process.env.SEED_DEMO === "1") await seedDemo();
  }

  const app = express();
  app.disable("x-powered-by");
  // Trust Railway's reverse proxy so secure cookies and req.ip work over HTTPS.
  app.set("trust proxy", 1);

  app.use(
    express.json({
      limit: "200kb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  if (isProd && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  const PgStore = ConnectPgSimple(session);
  app.use(
    session({
      // Postgres-backed sessions in production; in-memory for local PGlite/tests.
      store: pool ? new PgStore({ pool, createTableIfMissing: true, tableName: "user_sessions" }) : undefined,
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://umami-production-e10c.up.railway.app`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        `connect-src 'self'${isProd ? "" : " ws: wss:"} https://api.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://umami-production-e10c.up.railway.app`,
        "frame-src https://js.stripe.com https://hooks.stripe.com",
        "base-uri 'self'",
        "form-action 'self' https://checkout.stripe.com",
      ].join("; "),
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) return next();
    const start = Date.now();
    res.on("finish", () => log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`));
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.post("/api/cron/reminders", async (req, res, next) => {
    try {
      if (!process.env.CRON_SECRET || req.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json(await runReminderJob());
    } catch (err) {
      next(err);
    }
  });

  app.use(accountRouter);
  app.use(bagRouter);
  app.use(stringersRouter);
  app.use(recommendRouter);
  app.use(billingRouter);
  app.use(adminRouter);
  app.use(chatRouter);
  app.use(shopsRouter);
  app.use(brandsRouter);
  app.use(marketplaceRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  // v1 re-threw here after responding, which crashed the whole server on any error.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Errors thrown by the Stripe SDK carry Stripe's HTTP status; to the player they are a 502.
    const fromStripe = typeof err.type === "string" && err.type.startsWith("Stripe");
    const status = fromStripe ? 502 : err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    if (res.headersSent) return;
    // Only messages we wrote on purpose reach the player; unexpected errors stay generic.
    const safe = status < 500 || err.expose;
    res.status(status).json({ message: safe ? err.message : "Something went wrong on our side. Please try again." });
  });

  return app;
}
