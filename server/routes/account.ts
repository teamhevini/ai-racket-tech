import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { User } from "@shared/schema";
import {
  ADMIN_EMAIL,
  asyncHandler,
  currentUser,
  loadUser,
  publicUser,
  rateLimit,
  requireAuth,
  signIn,
} from "../auth";
import { storage } from "../storage";
import { parseBody, parseId } from "./util";

export const accountRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(160);
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(200);

async function claimAnonymousRuns(req: Request, user: User) {
  const ids = req.session.anonRuns ?? [];
  for (const id of ids) await storage.claimRecommendationRun(id, user.id);
  req.session.anonRuns = [];
}

const authLimit = rateLimit({ windowMs: 15 * 60_000, max: 20 });

// ─── Auth ───────────────────────────────────────────────────────────────────

accountRouter.post(
  "/api/auth/signup",
  authLimit,
  asyncHandler(async (req, res) => {
    const data = parseBody(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        firstName: z.string().trim().min(1, "First name is required").max(60),
        lastName: z.string().trim().min(1, "Last name is required").max(60),
      }),
      req.body,
      res,
    );
    if (!data) return;
    const existing = await storage.getUserByEmail(data.email);
    const passwordHash = await bcrypt.hash(data.password, 12);
    let user: User;
    if (existing?.passwordHash) {
      return res.status(409).json({ message: "An account with this email already exists. Try logging in." });
    } else if (existing) {
      // v1 created password-less accounts for people who paid before signing up.
      // Only the browser that made that purchase (it still carries the v1 session)
      // may claim it — otherwise anyone could take over a paid account by email.
      if (req.session.email?.toLowerCase() !== existing.email) {
        return res.status(409).json({
          message:
            "This email already has a 10IS plan. Open 10IS on the device you paid on, or email contact@hevini.com and we'll link it for you.",
        });
      }
      user = await storage.updateUser(existing.id, {
        passwordHash,
        firstName: existing.firstName ?? data.firstName,
        lastName: existing.lastName ?? data.lastName,
      });
    } else {
      user = await storage.createUser({ ...data, passwordHash });
    }
    const anonRuns = req.session.anonRuns;
    await signIn(req, user);
    req.session.anonRuns = anonRuns;
    await claimAnonymousRuns(req, user);
    res.status(201).json(publicUser(user));
  }),
);

accountRouter.post(
  "/api/auth/login",
  authLimit,
  asyncHandler(async (req, res) => {
    const data = parseBody(z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") }), req.body, res);
    if (!data) return;
    const user = await storage.getUserByEmail(data.email);
    let valid = false;
    if (user?.passwordHash) {
      valid = await bcrypt.compare(data.password, user.passwordHash);
    } else if (user && user.email === ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      valid = data.password === process.env.ADMIN_PASSWORD;
    } else {
      await bcrypt.hash(data.password, 4); // keep timing similar for unknown emails
    }
    if (!user || !valid) {
      const needsPassword = !!user && !user.passwordHash;
      return res.status(401).json({
        message: needsPassword
          ? "This account doesn't have a password yet. On the device you used to pay, sign up with this email to set one — your plan and history carry over."
          : "That email and password don't match.",
        needsPassword,
      });
    }
    const anonRuns = req.session.anonRuns;
    await signIn(req, user);
    req.session.anonRuns = anonRuns;
    await claimAnonymousRuns(req, user);
    res.json(publicUser(user));
  }),
);

accountRouter.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.clearCookie("user_email"); // v1 leftover
    res.json({ success: true });
  });
});

accountRouter.get(
  "/api/auth/me",
  asyncHandler(async (req, res) => {
    res.json(publicUser(await loadUser(req)));
  }),
);

// ─── Profile ────────────────────────────────────────────────────────────────

accountRouter.use("/api/account", requireAuth);

accountRouter.get(
  "/api/account/profile",
  asyncHandler(async (req, res) => {
    const u = currentUser(req);
    res.json({
      ...publicUser(u),
      createdAt: u.createdAt,
      reminderEnabled: u.reminderEnabled,
      hasSubscription: !!u.stripeSubscriptionId,
      hasPassword: !!u.passwordHash,
    });
  }),
);

accountRouter.patch(
  "/api/account/profile",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(
      z.object({
        firstName: z.string().trim().min(1).max(60).optional(),
        lastName: z.string().trim().min(1).max(60).optional(),
        email: emailSchema.optional(),
      }),
      req.body,
      res,
    );
    if (!data) return;
    if (data.email && data.email !== user.email && (await storage.getUserByEmail(data.email))) {
      return res.status(409).json({ message: "That email is already in use." });
    }
    const updated = await storage.updateUser(user.id, data);
    res.json(publicUser(updated));
  }),
);

accountRouter.post(
  "/api/account/change-password",
  authLimit,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(
      z.object({ currentPassword: z.string().optional().default(""), newPassword: passwordSchema }),
      req.body,
      res,
    );
    if (!data) return;
    if (user.passwordHash && !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: "Your current password is incorrect." });
    }
    await storage.updateUser(user.id, { passwordHash: await bcrypt.hash(data.newPassword, 12) });
    res.json({ success: true });
  }),
);

accountRouter.patch(
  "/api/account/notifications",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(z.object({ reminderEnabled: z.boolean() }), req.body, res);
    if (!data) return;
    await storage.updateUser(user.id, { reminderEnabled: data.reminderEnabled });
    res.json({ success: true, reminderEnabled: data.reminderEnabled });
  }),
);

// ─── Recommendation history ─────────────────────────────────────────────────

accountRouter.get(
  "/api/account/recommendations",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const runs = await storage.getRecommendationsByUserId(user.id);
    const ids = Array.from(new Set(runs.map((r) => r.racketId).filter((id): id is number => !!id)));
    const rackets = new Map((await Promise.all(ids.map((id) => storage.getRacket(id)))).filter(Boolean).map((r) => [r!.id, r!]));
    res.json(
      runs.map((run) => {
        const racket = run.racketId ? rackets.get(run.racketId) : undefined;
        return {
          id: run.id,
          createdAt: run.createdAt,
          confidence: run.confidence,
          output: run.outputJson,
          savedRacketId: run.savedRacketId,
          racketLabel: run.racketLabel ?? (racket ? `${racket.brand} ${racket.model}` : null),
        };
      }),
    );
  }),
);

accountRouter.delete(
  "/api/account/recommendations/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    if (id) await storage.deleteRecommendationRun(id, user.id);
    res.json({ success: true });
  }),
);

// ─── Export & delete ────────────────────────────────────────────────────────

async function exportFor(user: User) {
  const [recommendations, savedRackets, savedStringers, stringJobs] = await Promise.all([
    storage.getRecommendationsByUserId(user.id, 10_000),
    storage.getSavedRackets(user.id),
    storage.getSavedStringers(user.id),
    storage.getStringJobsForUser(user.id),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile: { email: user.email, firstName: user.firstName, lastName: user.lastName, tier: user.tier, createdAt: user.createdAt },
    savedRackets,
    stringJobs,
    savedStringers,
    recommendations,
  };
}

accountRouter.get(
  "/api/account/export",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    res.setHeader("Content-Disposition", 'attachment; filename="10is-export.json"');
    res.json(await exportFor(user));
  }),
);

accountRouter.delete(
  "/api/account/delete",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(z.object({ confirm: z.literal("DELETE", { errorMap: () => ({ message: 'Type "DELETE" to confirm' }) }) }), req.body, res);
    if (!data) return;
    const exportData = await exportFor(user);
    await storage.deleteUser(user.id);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true, exportData });
    });
  }),
);
