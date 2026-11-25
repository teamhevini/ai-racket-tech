import crypto from "crypto";
import { Router } from "express";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  affiliateClicks,
  brands,
  campaignEvents,
  campaigns,
  retailOffers,
  samplePrograms,
  sampleProgramShops,
  shops,
  stringSignals,
  strings,
  type OnboardingInputs,
  type RecommendationOutput,
} from "@shared/schema";
import { K_ANONYMITY } from "@shared/tiers";
import { buildFitContext, chooseSponsored, deepFreeze, type CandidateCampaign } from "@shared/sponsor-fit";
import { asyncHandler, loadUser, rateLimit } from "../auth";
import { storage } from "../storage";
import { matchCatalog, recordSignals } from "../b2b";
import { parseBody, parseId } from "./util";
import { onOwnDomain } from "./brands";

export const marketplaceRouter = Router();

export const newCode = () => crypto.randomBytes(9).toString("base64url");

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

marketplaceRouter.get(
  "/api/strings",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
    const family = typeof req.query.family === "string" ? req.query.family : "";
    const conds = [eq(strings.active, true)];
    if (q) conds.push(or(ilike(strings.model, `%${q}%`), ilike(strings.brandName, `%${q}%`))!);
    if (family) conds.push(eq(strings.family, family));
    const rows = await db
      .select({ s: strings, brandSlug: brands.slug, brandClaimed: brands.claimed })
      .from(strings)
      .leftJoin(brands, eq(brands.id, strings.brandId))
      .where(and(...conds))
      .orderBy(asc(strings.brandName), asc(strings.model));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 200));
    res.json(rows.slice(0, limit).map((r) => ({ ...r.s, brandSlug: r.brandSlug, brandVerified: !!r.brandClaimed })));
  }),
);

marketplaceRouter.get(
  "/api/strings/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const [row] = id
      ? await db.select({ s: strings, brand: brands }).from(strings).leftJoin(brands, eq(brands.id, strings.brandId)).where(eq(strings.id, id))
      : [];
    if (!row) return res.status(404).json({ message: "String not found" });
    // Cheapest first. Commission never changes the order.
    const offers = await db
      .select({ id: retailOffers.id, priceCents: retailOffers.priceCents, inStock: retailOffers.inStock, retailer: brands.name, retailerSlug: brands.slug })
      .from(retailOffers)
      .innerJoin(brands, eq(brands.id, retailOffers.retailerId))
      .where(and(eq(retailOffers.stringId, row.s.id), eq(brands.claimed, true)))
      .orderBy(desc(retailOffers.inStock), asc(retailOffers.priceCents));
    const [rating] = await db
      .select({ avg: sql<number | null>`avg(${stringSignals.rating})::float`, players: sql<number>`count(distinct ${stringSignals.playerHash})::int` })
      .from(stringSignals)
      .where(and(eq(stringSignals.stringId, row.s.id), eq(stringSignals.kind, "rated")));
    const sampleShops = await db
      .select({ programId: samplePrograms.id, title: samplePrograms.title, shopSlug: shops.slug, shopName: shops.name, city: shops.city })
      .from(samplePrograms)
      .innerJoin(sampleProgramShops, eq(sampleProgramShops.programId, samplePrograms.id))
      .innerJoin(shops, eq(shops.id, sampleProgramShops.shopId))
      .where(and(eq(samplePrograms.stringId, row.s.id), eq(samplePrograms.status, "active")));
    res.json({
      ...row.s,
      brand: row.brand ? { name: row.brand.name, slug: row.brand.slug, verified: row.brand.claimed, accent: row.brand.accent } : null,
      offers,
      rating: rating.players >= K_ANONYMITY && rating.avg ? { avg: Math.round(rating.avg * 10) / 10, players: rating.players } : null,
      sampleShops,
    });
  }),
);

// ─── Where to buy the AI's pick (affiliate) ─────────────────────────────────

marketplaceRouter.get(
  "/api/recommendation-runs/:id/where-to-buy",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const run = id ? await storage.getRecommendationRun(id) : undefined;
    if (!run) return res.status(404).json({ message: "Recommendation not found" });
    const output = run.outputJson as RecommendationOutput;
    const picks = await matchCatalog([output.setup.mains, output.setup.crosses].filter(Boolean).flatMap((s) => s!.exampleStrings));
    if (!picks.length) return res.json({ strings: [] });
    const offers = await db
      .select({ id: retailOffers.id, stringId: retailOffers.stringId, priceCents: retailOffers.priceCents, inStock: retailOffers.inStock, retailer: brands.name })
      .from(retailOffers)
      .innerJoin(brands, eq(brands.id, retailOffers.retailerId))
      .where(and(inArray(retailOffers.stringId, picks.map((p) => p.id)), eq(brands.claimed, true)))
      .orderBy(desc(retailOffers.inStock), asc(retailOffers.priceCents));
    res.json({
      strings: picks.map((p) => ({
        id: p.id,
        brandName: p.brandName,
        model: p.model,
        family: p.family,
        setPriceCents: p.setPriceCents,
        offers: offers.filter((o) => o.stringId === p.id),
      })),
    });
  }),
);

/** Outbound retailer link. Records the click, then redirects. Linked with rel="sponsored". */
marketplaceRouter.get(
  "/api/go/offer/:offerId",
  rateLimit({ windowMs: 60_000, max: 60 }),
  asyncHandler(async (req, res) => {
    const offerId = parseId(req.params.offerId);
    const [row] = offerId
      ? await db.select({ offer: retailOffers, retailer: brands }).from(retailOffers).innerJoin(brands, eq(brands.id, retailOffers.retailerId)).where(eq(retailOffers.id, offerId))
      : [];
    // Re-checked at click time: a retailer that lost verification or changed domain stops redirecting.
    if (!row || !row.retailer.claimed || !onOwnDomain(row.offer.url, row.retailer.website)) return res.status(404).json({ message: "Offer not found" });
    const offer = row.offer;
    const user = await loadUser(req);
    const runId = parseId(String(req.query.run ?? "")) ?? null;
    const run = runId ? await storage.getRecommendationRun(runId) : undefined;
    const source = ["recommendation", "sponsored", "string-page"].includes(String(req.query.src)) ? String(req.query.src) : "string-page";
    const code = newCode();
    await db.insert(affiliateClicks).values({
      code,
      stringId: offer.stringId,
      offerId: offer.id,
      runId: run?.id ?? null,
      userId: user?.id ?? null,
      source,
      destination: "retailer",
    });
    await recordSignals([{ stringId: offer.stringId, kind: "affiliate_click", player: user?.id ?? req.sessionID }]);
    const url = new URL(offer.url);
    url.searchParams.set("utm_source", "10is");
    url.searchParams.set("ref", code);
    res.redirect(302, url.toString());
  }),
);

/** Retailers report sales against a click code (server-to-server). */
marketplaceRouter.post(
  "/api/affiliate/postback",
  asyncHandler(async (req, res) => {
    const secret = process.env.AFFILIATE_POSTBACK_SECRET;
    if (!secret) return res.status(503).json({ message: "Postbacks aren't configured" });
    if (req.get("authorization") !== `Bearer ${secret}`) return res.status(401).json({ message: "Unauthorized" });
    const data = parseBody(z.object({ code: z.string().min(4).max(40), orderCents: z.number().int().min(0).max(10_000_000) }), req.body, res);
    if (!data) return;
    const [click] = await db
      .select({ click: affiliateClicks, pct: retailOffers.commissionPct })
      .from(affiliateClicks)
      .leftJoin(retailOffers, eq(retailOffers.id, affiliateClicks.offerId))
      .where(eq(affiliateClicks.code, data.code));
    if (!click) return res.status(404).json({ message: "Unknown click" });
    if (click.click.createdAt && Date.now() - click.click.createdAt.getTime() > 30 * 86_400_000) {
      return res.status(409).json({ message: "Outside the 30-day attribution window" });
    }
    const commissionCents = Math.round((data.orderCents * (click.pct ?? 0)) / 100);
    await db
      .update(affiliateClicks)
      .set({ convertedAt: new Date(), orderCents: data.orderCents, commissionCents })
      .where(eq(affiliateClicks.id, click.click.id));
    res.json({ ok: true, commissionCents });
  }),
);

// ─── Sponsored slot ─────────────────────────────────────────────────────────

async function liveCampaigns(): Promise<CandidateCampaign[]> {
  const rows = await db
    .select({ c: campaigns, s: strings })
    .from(campaigns)
    .innerJoin(strings, eq(strings.id, campaigns.stringId))
    .innerJoin(brands, eq(brands.id, campaigns.brandId))
    // Only verified brands are ever served.
    .where(and(eq(campaigns.status, "active"), eq(strings.active, true), eq(brands.claimed, true)));
  if (!rows.length) return [];
  const spend = await db
    .select({ id: campaignEvents.campaignId, cents: sql<number>`coalesce(sum(${campaignEvents.costCents}),0)::int` })
    .from(campaignEvents)
    .where(and(inArray(campaignEvents.campaignId, rows.map((r) => r.c.id)), gte(campaignEvents.createdAt, monthStart())))
    .groupBy(campaignEvents.campaignId);
  const spent = new Map(spend.map((s) => [s.id, s.cents]));
  return rows.map((r) => ({
    id: r.c.id,
    cpcCents: r.c.cpcCents,
    levels: r.c.levels,
    remainingBudgetCents: r.c.monthlyBudgetCents - (spent.get(r.c.id) ?? 0),
    string: r.s,
  }));
}

/**
 * The sponsored slot is a separate request made after the recommendation is
 * already stored and on screen. It reads a frozen copy of the stored output and
 * returns its own object; it has no way to write to the recommendation.
 */
marketplaceRouter.get(
  "/api/recommendation-runs/:id/sponsored",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const run = id ? await storage.getRecommendationRun(id) : undefined;
    if (!run) return res.status(404).json({ message: "Recommendation not found" });
    const user = await loadUser(req);
    if (req.entitlements?.adFree) return res.json({ placement: null, reason: "ad-free" });

    const output = deepFreeze(structuredClone(run.outputJson) as RecommendationOutput);
    const inputs = (run.inputsJson ?? {}) as OnboardingInputs;
    const racket = run.racketId ? await storage.getRacket(run.racketId) : undefined;
    const ctx = buildFitContext(output, inputs, racket);
    const pick = chooseSponsored(await liveCampaigns(), ctx);
    if (!pick) return res.json({ placement: null, reason: "no-eligible-sponsor" });

    const [row] = await db
      .select({ c: campaigns, s: strings, b: brands })
      .from(campaigns)
      .innerJoin(strings, eq(strings.id, campaigns.stringId))
      .innerJoin(brands, eq(brands.id, campaigns.brandId))
      .where(eq(campaigns.id, pick.campaignId));
    // One impression per run per campaign; impressions are free, clicks are billed.
    const [seen] = await db
      .select({ id: campaignEvents.id })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, row.c.id), eq(campaignEvents.runId, run.id), eq(campaignEvents.kind, "impression")));
    if (!seen) await db.insert(campaignEvents).values({ campaignId: row.c.id, runId: run.id, kind: "impression", fitScore: pick.fit.score });
    void user;

    res.json({
      placement: {
        label: "Sponsored",
        paidBy: row.b.name,
        campaignId: row.c.id,
        headline: row.c.headline,
        fitScore: pick.fit.score,
        whyShown: pick.fit.reasons,
        disclosure: `Paid placement by ${row.b.name}. It passed the same fit and safety checks as your setup, but it did not influence your recommendation above.`,
        string: {
          id: row.s.id,
          brandName: row.s.brandName,
          model: row.s.model,
          family: row.s.family,
          gauges: row.s.gauges,
          setPriceCents: row.s.setPriceCents,
          description: row.s.description,
        },
      },
    });
  }),
);

marketplaceRouter.post(
  "/api/sponsored/:campaignId/click",
  rateLimit({ windowMs: 60_000, max: 30 }),
  asyncHandler(async (req, res) => {
    const campaignId = parseId(req.params.campaignId);
    const data = parseBody(z.object({ runId: z.number().int().positive() }), req.body, res);
    if (!data || !campaignId) return data ? res.status(404).json({ message: "Not found" }) : undefined;
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    if (!c) return res.status(404).json({ message: "Not found" });
    // Only bill clicks on placements we actually showed for this run.
    const [shown] = await db
      .select({ id: campaignEvents.id, fit: campaignEvents.fitScore })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, c.id), eq(campaignEvents.runId, data.runId), eq(campaignEvents.kind, "impression")));
    if (!shown) return res.status(400).json({ message: "That placement wasn't shown for this setup." });
    const [clicked] = await db
      .select({ id: campaignEvents.id })
      .from(campaignEvents)
      .where(and(eq(campaignEvents.campaignId, c.id), eq(campaignEvents.runId, data.runId), eq(campaignEvents.kind, "click")));
    if (!clicked) await db.insert(campaignEvents).values({ campaignId: c.id, runId: data.runId, kind: "click", costCents: c.cpcCents, fitScore: shown.fit });
    const user = await loadUser(req);
    const code = newCode();
    await db.insert(affiliateClicks).values({
      code,
      stringId: c.stringId,
      campaignId: c.id,
      runId: data.runId,
      userId: user?.id ?? null,
      source: "sponsored",
      destination: "booking",
    });
    res.json({ code, stringId: c.stringId });
  }),
);

// ─── Public brand pages ─────────────────────────────────────────────────────

marketplaceRouter.get(
  "/api/brands",
  asyncHandler(async (_req, res) => {
    const rows = await db.select().from(brands).orderBy(asc(brands.name));
    res.json(rows.map((b) => ({ id: b.id, slug: b.slug, name: b.name, kind: b.kind, tagline: b.tagline, verified: b.claimed, accent: b.accent, isDemo: b.isDemo })));
  }),
);

marketplaceRouter.get(
  "/api/brands/:slug",
  asyncHandler(async (req, res) => {
    const [b] = await db.select().from(brands).where(eq(brands.slug, String(req.params.slug).toLowerCase()));
    if (!b) return res.status(404).json({ message: "Brand not found" });
    const list = await db.select().from(strings).where(and(eq(strings.brandId, b.id), eq(strings.active, true))).orderBy(asc(strings.model));
    const programs = await db
      .select({ id: samplePrograms.id, title: samplePrograms.title, pitch: samplePrograms.pitch, stringId: samplePrograms.stringId })
      .from(samplePrograms)
      .where(and(eq(samplePrograms.brandId, b.id), eq(samplePrograms.status, "active")));
    res.json({
      id: b.id,
      slug: b.slug,
      name: b.name,
      kind: b.kind,
      tagline: b.tagline,
      about: b.about,
      website: b.website,
      accent: b.accent,
      verified: b.claimed,
      isDemo: b.isDemo,
      strings: list,
      programs,
    });
  }),
);
