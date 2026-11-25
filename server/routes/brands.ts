import { Router, type Request } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  brandInputSchema,
  brands,
  campaignInputSchema,
  campaigns,
  recommendationRuns,
  retailOfferInputSchema,
  retailOffers,
  sampleProgramInputSchema,
  sampleProgramShops,
  samplePrograms,
  shops,
  stringInputSchema,
  strings,
  type Brand,
  type OnboardingInputs,
  type RecommendationOutput,
} from "@shared/schema";
import { BRAND_PLANS } from "@shared/tiers";
import { assessFit, buildFitContext } from "@shared/sponsor-fit";
import { asyncHandler, currentUser, requireAdmin, requireAuth } from "../auth";
import { brandForOwner, httpError, invalidateCatalog, uniqueSlug } from "../b2b";
import { campaignStats, racketBrandInsights, retailerInsights, sampleStats, stringBrandInsights } from "../insights";
import { storage } from "../storage";
import { getStripe } from "./billing";
import { parseBody, parseId } from "./util";

export const brandsRouter = Router();

const UNVERIFIED_CAMPAIGN =
  "Sponsored placements go live once we've verified your brand, so nobody can advertise under a lookalike name. Save it as a draft and email partners@10is.app.";
const appUrl = (req: Request) => process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;

brandsRouter.use("/api/brand", requireAuth);

async function requireBrand(req: Request, kind?: Brand["kind"]): Promise<Brand> {
  const brand = await brandForOwner(currentUser(req).id);
  if (!brand) throw httpError(404, "You don't have a brand account yet.");
  if (kind && brand.kind !== kind) throw httpError(403, `That's only for ${kind === "retailer" ? "retailers" : kind === "string" ? "string companies" : "racket brands"}.`);
  return brand;
}

export function hostOf(url: string | null | undefined): string | null {
  try {
    return url ? new URL(url).hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** Is `url` on the brand's own site (same host or a subdomain of it)? */
export function onOwnDomain(url: string, website: string | null | undefined): boolean {
  const site = hostOf(website);
  const host = hostOf(url);
  return !!site && !!host && (host === site || host.endsWith(`.${site}`));
}

const hasInsights = (b: Brand) => b.plan === "insights" || b.plan === "partner";

brandsRouter.post(
  "/api/brand",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (await brandForOwner(user.id)) return res.status(409).json({ message: "You already manage a brand." });
    const data = parseBody(brandInputSchema, req.body, res);
    if (!data) return;
    // Listed brands (e.g. Luxilon) can't be taken over from a sign-up form; they are verified by hand.
    const [listed] = await db.select().from(brands).where(sql`lower(${brands.name}) = ${data.name.toLowerCase()}`);
    if (listed) {
      return res.status(409).json({
        message: `${listed.name} is already listed. To manage it, email partners@10is.app from a company address and we'll verify you.`,
        field: "name",
      });
    }
    const slug = await uniqueSlug(brands, data.name);
    const [brand] = await db
      .insert(brands)
      .values({ ...data, kind: data.kind ?? "string", slug, ownerUserId: user.id, claimed: false })
      .returning();
    res.status(201).json(brand);
  }),
);

brandsRouter.get(
  "/api/brand/me",
  asyncHandler(async (req, res) => {
    const brand = await brandForOwner(currentUser(req).id);
    if (!brand) return res.json({ brand: null, plans: BRAND_PLANS });
    const list = brand.kind === "string" ? await db.select().from(strings).where(eq(strings.brandId, brand.id)).orderBy(strings.model) : [];
    res.json({ brand, strings: list, plans: BRAND_PLANS, insightsUnlocked: hasInsights(brand) });
  }),
);

brandsRouter.patch(
  "/api/brand",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req);
    const data = parseBody(brandInputSchema.omit({ kind: true }).partial(), req.body, res);
    if (!data) return;
    const [updated] = await db.update(brands).set(data).where(eq(brands.id, brand.id)).returning();
    res.json(updated);
  }),
);

// ─── Catalogue ──────────────────────────────────────────────────────────────
// Brands manage names, gauges, prices and descriptions. Lab-style scores and
// stiffness feed the fit check, so only 10IS sets them (see admin route below).

const brandStringSchema = stringInputSchema.pick({ model: true, family: true, gauges: true, setPriceCents: true, description: true, active: true });

brandsRouter.post(
  "/api/brand/strings",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const data = parseBody(brandStringSchema, req.body, res);
    if (!data) return;
    const [dupe] = await db.select({ id: strings.id }).from(strings).where(and(eq(strings.brandName, brand.name), eq(strings.model, data.model)));
    if (dupe) return res.status(409).json({ message: "You already list a string with that name.", field: "model" });
    const [s] = await db.insert(strings).values({ ...data, brandId: brand.id, brandName: brand.name }).returning();
    invalidateCatalog();
    res.status(201).json(s);
  }),
);

brandsRouter.patch(
  "/api/brand/strings/:id",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const id = parseId(req.params.id);
    const data = parseBody(brandStringSchema.omit({ family: true }).partial().strict(), req.body, res);
    if (!data) return;
    const [s] = id ? await db.update(strings).set(data).where(and(eq(strings.id, id), eq(strings.brandId, brand.id))).returning() : [];
    if (!s) return res.status(404).json({ message: "String not found" });
    invalidateCatalog();
    res.json(s);
  }),
);

brandsRouter.patch(
  "/api/admin/strings/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = parseBody(stringInputSchema.pick({ stiffness: true, comfort: true, spin: true, control: true, power: true, durability: true }).partial(), req.body, res);
    if (!data) return;
    const [s] = id ? await db.update(strings).set(data).where(eq(strings.id, id)).returning() : [];
    if (!s) return res.status(404).json({ message: "String not found" });
    invalidateCatalog();
    res.json(s);
  }),
);

brandsRouter.patch(
  "/api/admin/brands/:id/verify",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const [b] = id ? await db.update(brands).set({ claimed: true }).where(eq(brands.id, id)).returning() : [];
    if (!b) return res.status(404).json({ message: "Brand not found" });
    res.json(b);
  }),
);

// ─── Sponsored campaigns ────────────────────────────────────────────────────

brandsRouter.get(
  "/api/brand/campaigns",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    res.json(await campaignStats(brand.id));
  }),
);

brandsRouter.post(
  "/api/brand/campaigns",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const data = parseBody(campaignInputSchema, req.body, res);
    if (!data) return;
    const [s] = await db.select().from(strings).where(and(eq(strings.id, data.stringId), eq(strings.brandId, brand.id)));
    if (!s) return res.status(400).json({ message: "Pick one of your own strings.", field: "stringId" });
    if (!brand.claimed && (data.status ?? "active") === "active") return res.status(403).json({ message: UNVERIFIED_CAMPAIGN });
    const [c] = await db
      .insert(campaigns)
      .values({ ...data, levels: data.levels ?? [], status: data.status ?? "active", brandId: brand.id })
      .returning();
    res.status(201).json(c);
  }),
);

brandsRouter.patch(
  "/api/brand/campaigns/:id",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const id = parseId(req.params.id);
    const data = parseBody(campaignInputSchema.omit({ stringId: true }).partial(), req.body, res);
    if (!data) return;
    if (!brand.claimed && data.status === "active") return res.status(403).json({ message: UNVERIFIED_CAMPAIGN });
    const [c] = id ? await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.brandId, brand.id))).returning() : [];
    if (!c) return res.status(404).json({ message: "Campaign not found" });
    res.json(c);
  }),
);

/**
 * Before spending anything, a brand sees how many recent players its string
 * would actually qualify for. This is the fit check, run on the last 300 setups.
 */
brandsRouter.get(
  "/api/brand/strings/:id/reach",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const id = parseId(req.params.id);
    const [s] = id ? await db.select().from(strings).where(and(eq(strings.id, id), eq(strings.brandId, brand.id))) : [];
    if (!s) return res.status(404).json({ message: "String not found" });
    const runs = await db.select().from(recommendationRuns).orderBy(desc(recommendationRuns.createdAt)).limit(300);
    const reasons = new Map<string, number>();
    let eligible = 0;
    let scoreSum = 0;
    const rackets = new Map<number, Awaited<ReturnType<typeof storage.getRacket>>>();
    for (const r of runs) {
      let racket = r.racketId ? rackets.get(r.racketId) : undefined;
      if (r.racketId && !rackets.has(r.racketId)) {
        racket = await storage.getRacket(r.racketId);
        rackets.set(r.racketId, racket);
      }
      const ctx = buildFitContext(r.outputJson as RecommendationOutput, r.inputsJson as OnboardingInputs, racket);
      const fit = assessFit(s, ctx);
      if (fit.eligible) {
        eligible++;
        scoreSum += fit.score;
      } else {
        const why = fit.score > 0 ? "Fit score below the threshold" : fit.reasons[0];
        reasons.set(why, (reasons.get(why) ?? 0) + 1);
      }
    }
    res.json({
      sampled: runs.length,
      eligible,
      eligiblePct: runs.length ? Math.round((eligible / runs.length) * 100) : 0,
      avgFit: eligible ? Math.round(scoreSum / eligible) : null,
      heldBack: [...reasons.entries()].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n),
      specsPending: s.stiffness == null,
    });
  }),
);

// ─── Sample programmes ──────────────────────────────────────────────────────

brandsRouter.get(
  "/api/brand/programs",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const stats = await sampleStats(brand.id);
    const shopCounts = await db
      .select({ id: sampleProgramShops.programId, n: sql<number>`count(*)::int` })
      .from(sampleProgramShops)
      .innerJoin(samplePrograms, eq(samplePrograms.id, sampleProgramShops.programId))
      .where(eq(samplePrograms.brandId, brand.id))
      .groupBy(sampleProgramShops.programId);
    const counts = new Map(shopCounts.map((s) => [s.id, s.n]));
    const progs = await db.select().from(samplePrograms).where(eq(samplePrograms.brandId, brand.id)).orderBy(desc(samplePrograms.createdAt));
    res.json({
      unlocked: brand.plan === "partner",
      programs: progs.map((p) => ({ ...p, shops: counts.get(p.id) ?? 0, stats: stats.find((s) => s.id === p.id) ?? null })),
      shops: (await db.select({ id: shops.id, name: shops.name, city: shops.city, plan: shops.plan }).from(shops)).filter((s) => s.plan === "pro"),
    });
  }),
);

brandsRouter.post(
  "/api/brand/programs",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    if (brand.plan !== "partner") return res.status(403).json({ message: "Sample programmes come with the Partner plan.", upgrade: true });
    const data = parseBody(sampleProgramInputSchema, req.body, res);
    if (!data) return;
    const [s] = await db.select().from(strings).where(and(eq(strings.id, data.stringId), eq(strings.brandId, brand.id)));
    if (!s) return res.status(400).json({ message: "Pick one of your own strings.", field: "stringId" });
    const { shopIds, ...rest } = data;
    const [p] = await db.insert(samplePrograms).values({ ...rest, brandId: brand.id }).returning();
    if (shopIds?.length) {
      const pro = await db.select({ id: shops.id }).from(shops).where(eq(shops.plan, "pro"));
      const allowed = new Set(pro.map((x) => x.id));
      const ids = shopIds.filter((id) => allowed.has(id));
      if (ids.length) await db.insert(sampleProgramShops).values(ids.map((shopId) => ({ programId: p.id, shopId }))).onConflictDoNothing();
    }
    res.status(201).json(p);
  }),
);

brandsRouter.patch(
  "/api/brand/programs/:id",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "string");
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ status: z.enum(["active", "paused", "ended"]).optional(), pitch: z.string().max(400).nullable().optional() }), req.body, res);
    if (!data) return;
    const [p] = id ? await db.update(samplePrograms).set(data).where(and(eq(samplePrograms.id, id), eq(samplePrograms.brandId, brand.id))).returning() : [];
    if (!p) return res.status(404).json({ message: "Programme not found" });
    res.json(p);
  }),
);

// ─── Retailer offers ────────────────────────────────────────────────────────

brandsRouter.get(
  "/api/brand/offers",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "retailer");
    const rows = await db
      .select({ o: retailOffers, brandName: strings.brandName, model: strings.model })
      .from(retailOffers)
      .innerJoin(strings, eq(strings.id, retailOffers.stringId))
      .where(eq(retailOffers.retailerId, brand.id))
      .orderBy(strings.brandName, strings.model);
    res.json(rows.map((r) => ({ ...r.o, brandName: r.brandName, model: r.model })));
  }),
);

brandsRouter.post(
  "/api/brand/offers",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "retailer");
    const data = parseBody(retailOfferInputSchema, req.body, res);
    if (!data) return;
    // 10IS redirects players to these links, so only verified retailers can add them,
    // and only to their own website. Otherwise a sign-up form becomes a phishing relay.
    if (!brand.claimed) {
      return res.status(403).json({ message: "Offers go live once we've verified your store. Email partners@10is.app from your company address." });
    }
    if (!onOwnDomain(data.url, brand.website)) {
      return res.status(400).json({ message: `Links must point to your own website${brand.website ? ` (${hostOf(brand.website)})` : ""}.`, field: "url" });
    }
    const [s] = await db.select({ id: strings.id }).from(strings).where(eq(strings.id, data.stringId));
    if (!s) return res.status(400).json({ message: "Unknown string", field: "stringId" });
    const [o] = await db
      .insert(retailOffers)
      .values({ ...data, retailerId: brand.id })
      .onConflictDoUpdate({
        target: [retailOffers.retailerId, retailOffers.stringId],
        set: { priceCents: data.priceCents, url: data.url, inStock: data.inStock ?? true, commissionPct: data.commissionPct ?? 0, updatedAt: new Date() },
      })
      .returning();
    res.status(201).json(o);
  }),
);

brandsRouter.delete(
  "/api/brand/offers/:id",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req, "retailer");
    const id = parseId(req.params.id);
    if (id) await db.delete(retailOffers).where(and(eq(retailOffers.id, id), eq(retailOffers.retailerId, brand.id)));
    res.json({ ok: true });
  }),
);

// ─── Insights ───────────────────────────────────────────────────────────────

brandsRouter.get(
  "/api/brand/insights",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req);
    if (brand.kind === "retailer") return res.json({ kind: "retailer", unlocked: true, data: await retailerInsights(brand) });
    if (!hasInsights(brand)) {
      return res.status(403).json({ message: "Demand, retention and ratings come with the Insights plan.", upgrade: true });
    }
    const data = brand.kind === "racket" ? await racketBrandInsights(brand) : await stringBrandInsights(brand);
    res.json({ kind: brand.kind, unlocked: true, data });
  }),
);

// ─── Brand plan billing (Stripe test mode) ──────────────────────────────────

brandsRouter.post(
  "/api/brand/checkout/:plan(insights|partner)",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const brand = await requireBrand(req);
    const plan = req.params.plan as "insights" | "partner";
    if (brand.plan === plan) return res.status(400).json({ message: `You're already on ${BRAND_PLANS[plan].name}.` });
    if (plan === "partner" && brand.kind !== "string") return res.status(400).json({ message: "Partner is for string companies." });
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: brand.stripeCustomerId ?? undefined,
      customer_email: brand.stripeCustomerId ? undefined : user.email,
      client_reference_id: String(user.id),
      line_items: [
        {
          price_data: { currency: "usd", product_data: { name: `10IS ${BRAND_PLANS[plan].name}` }, unit_amount: BRAND_PLANS[plan].amountCents, recurring: { interval: "month" } },
          quantity: 1,
        },
      ],
      success_url: `${appUrl(req)}/brand?tab=plan&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl(req)}/brand?tab=plan`,
      metadata: { kind: "brand", brandId: String(brand.id), plan, userId: String(user.id) },
      subscription_data: { metadata: { kind: "brand", brandId: String(brand.id) } },
    });
    res.json({ url: session.url });
  }),
);

brandsRouter.post(
  "/api/brand/checkout/verify",
  asyncHandler(async (req, res) => {
    const brand = await requireBrand(req);
    const data = parseBody(z.object({ session_id: z.string().min(1).max(300) }), req.body, res);
    if (!data) return;
    const session = await getStripe().checkout.sessions.retrieve(data.session_id);
    if (session.metadata?.kind !== "brand" || session.metadata?.brandId !== String(brand.id)) {
      return res.status(403).json({ message: "This payment belongs to a different brand." });
    }
    if (session.payment_status === "unpaid") return res.status(402).json({ message: "Payment isn't complete yet." });
    const plan = session.metadata.plan === "partner" ? "partner" : "insights";
    const [updated] = await db
      .update(brands)
      .set({
        plan,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? brand.stripeCustomerId,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? brand.stripeSubscriptionId,
      })
      .where(eq(brands.id, brand.id))
      .returning();
    res.json({ brand: updated });
  }),
);

