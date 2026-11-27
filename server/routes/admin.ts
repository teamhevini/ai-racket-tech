import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { brands, users } from "@shared/schema";
import { invalidateCatalog } from "../b2b";
import { asyncHandler, currentUser, requireAdmin } from "../auth";
import { storage } from "../storage";
import { parseBody, parseId } from "./util";

export const adminRouter = Router();
adminRouter.use("/api/admin", requireAdmin);

adminRouter.get(
  "/api/admin/users",
  asyncHandler(async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        tier: u.tier,
        isAdmin: u.isAdmin,
        hasPassword: !!u.passwordHash,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    );
  }),
);

adminRouter.patch(
  "/api/admin/users/:id/tier",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ tier: z.enum(["free", "pro", "club"]) }), req.body, res);
    if (!data) return;
    if (!id || !(await storage.getUserById(id))) return res.status(404).json({ message: "User not found" });
    await storage.setUserTier(id, data.tier);
    res.json({ success: true });
  }),
);

adminRouter.patch(
  "/api/admin/users/:id/admin",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ isAdmin: z.boolean() }), req.body, res);
    if (!data) return;
    if (id === currentUser(req).id && !data.isAdmin) {
      return res.status(400).json({ message: "You can't remove your own admin access." });
    }
    if (!id || !(await storage.getUserById(id))) return res.status(404).json({ message: "User not found" });
    await storage.updateUser(id, { isAdmin: data.isAdmin });
    res.json({ success: true });
  }),
);

// ─── Launch helpers ─────────────────────────────────────────────────────────

/** Which integrations are configured. Booleans only: key values never leave the server. */
adminRouter.get(
  "/api/admin/integrations",
  asyncHandler(async (_req, res) => {
    const set = (k: string) => !!process.env[k]?.trim();
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
    const appUrl = process.env.APP_URL ?? "";
    res.json([
      { key: "SESSION_SECRET", label: "Login security", ok: set("SESSION_SECRET"), required: true },
      { key: "APP_URL", label: "Site address", ok: /^https:\/\//.test(appUrl), required: true, note: appUrl || undefined },
      {
        key: "STRIPE_SECRET_KEY",
        label: "Stripe payments",
        ok: set("STRIPE_SECRET_KEY"),
        required: true,
        note: stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_") ? "live mode" : stripeKey ? "test mode" : undefined,
      },
      { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook (upgrades after payment)", ok: set("STRIPE_WEBHOOK_SECRET"), required: true },
      { key: "OPENAI_API_KEY", label: "AI recommendations and chat", ok: set("OPENAI_API_KEY") || set("AI_INTEGRATIONS_OPENAI_API_KEY"), required: true },
      { key: "GOOGLE_MAPS_API_KEY", label: "Stringer search (Google Maps)", ok: set("GOOGLE_MAPS_API_KEY"), required: true },
      { key: "RESEND_API_KEY", label: "Emails (reminders, invites)", ok: set("RESEND_API_KEY"), required: false },
      { key: "CRON_SECRET", label: "External reminder trigger", ok: set("CRON_SECRET"), required: false },
      { key: "AFFILIATE_POSTBACK_SECRET", label: "Retailer sale reports", ok: set("AFFILIATE_POSTBACK_SECRET"), required: false },
    ]);
  }),
);

/** Brands and retailers, newest first, so the team can verify real companies. */
adminRouter.get(
  "/api/admin/brands",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: brands.id,
        name: brands.name,
        kind: brands.kind,
        website: brands.website,
        plan: brands.plan,
        claimed: brands.claimed,
        createdAt: brands.createdAt,
        ownerEmail: users.email,
      })
      .from(brands)
      .leftJoin(users, eq(users.id, brands.ownerUserId))
      .where(eq(brands.isDemo, false))
      .orderBy(desc(brands.createdAt));
    res.json(rows);
  }),
);

adminRouter.patch(
  "/api/admin/brands/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ claimed: z.boolean().optional(), ownerEmail: z.string().email().optional() }), req.body, res);
    if (!data) return;
    const [brand] = id ? await db.select().from(brands).where(eq(brands.id, id)) : [];
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    const patch: Partial<typeof brands.$inferInsert> = {};
    if (data.claimed !== undefined) patch.claimed = data.claimed;
    if (data.ownerEmail) {
      // Hand a listed brand (e.g. Luxilon) to the person who proved they work there.
      const owner = await storage.getUserByEmail(data.ownerEmail.toLowerCase());
      if (!owner) return res.status(400).json({ message: "No 10IS account uses that email. Ask them to sign up first.", field: "ownerEmail" });
      const [other] = await db.select({ id: brands.id }).from(brands).where(and(eq(brands.ownerUserId, owner.id)));
      if (other && other.id !== brand.id) return res.status(409).json({ message: "That account already manages another brand." });
      patch.ownerUserId = owner.id;
    }
    if (!Object.keys(patch).length) return res.json(brand);
    const [updated] = await db.update(brands).set(patch).where(eq(brands.id, brand.id)).returning();
    invalidateCatalog();
    res.json(updated);
  }),
);
