import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { User } from "@shared/schema";
import { entitlementsFor, type Entitlements } from "@shared/tiers";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    /** v1 sessions stored only the email. Still honoured so nobody is logged out by the upgrade. */
    email?: string;
    /** Recommendation runs made before signing in, claimed into history on login. */
    anonRuns?: number[];
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      entitlements?: Entitlements;
    }
  }
}

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "contact@hevini.com").toLowerCase();

/**
 * Who is making this request? Only the signed, server-side session counts.
 * (v1 also trusted a plain `user_email` cookie, which let anyone sign in as anyone.)
 */
export async function loadUser(req: Request): Promise<User | undefined> {
  if (req.user) return req.user;
  let user: User | undefined;
  if (req.session?.userId) {
    user = await storage.getUserById(req.session.userId);
  } else if (req.session?.email) {
    user = await storage.getUserByEmail(req.session.email);
    if (user) req.session.userId = user.id;
  }
  if (user) {
    req.user = user;
    req.entitlements = entitlementsFor(user.tier, user.isAdmin);
  }
  return user;
}

export function signIn(req: Request, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    // Rotate the session id on login to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export function publicUser(user: User | undefined) {
  if (!user) {
    return {
      id: null,
      email: null,
      firstName: null,
      lastName: null,
      tier: "free" as const,
      isAdmin: false,
      entitlements: entitlementsFor("free"),
    };
  }
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    tier: user.tier,
    isAdmin: user.isAdmin,
    entitlements: entitlementsFor(user.tier, user.isAdmin),
  };
}

export const requireAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await loadUser(req);
    if (!user) {
      res.status(401).json({ message: "Please log in to continue." });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    const user = await loadUser(req);
    if (!user) {
      res.status(401).json({ message: "Please log in to continue." });
      return;
    }
    if (!user.isAdmin) {
      res.status(403).json({ message: "Admins only." });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export function requireEntitlement(key: keyof Omit<Entitlements, "tier">, message: string): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await loadUser(req);
      if (!user) {
        res.status(401).json({ message: "Please log in to continue." });
        return;
      }
      if (!req.entitlements?.[key]) {
        res.status(403).json({ message, upgrade: true });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** The authenticated user. Only call after requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw new Error("currentUser() called without requireAuth");
  return req.user;
}

/** Tiny fixed-window rate limiter for expensive endpoints (AI calls, login). */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, res, next) => {
    const key = opts.key?.(req) ?? req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
      }
      return next();
    }
    entry.count++;
    if (entry.count > opts.max) {
      res.setHeader("Retry-After", Math.ceil((entry.reset - now) / 1000));
      res.status(429).json({ message: "Too many requests — please wait a moment and try again." });
      return;
    }
    next();
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
