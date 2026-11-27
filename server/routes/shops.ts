import { Router, type Request } from "express";
import { and, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  affiliateClicks,
  bookingInputSchema,
  bookings,
  sampleProgramShops,
  samplePrograms,
  savedRackets,
  savedStringers,
  shopInputSchema,
  shops,
  stringerInvites,
  stringJobs,
  strings,
  brands,
  walkInInputSchema,
  type Booking,
  type BookingStatus,
  type Shop,
} from "@shared/schema";
import { FREE_SHOP_MONTHLY_BOOKINGS, SAMPLE_PLATFORM_FEE_PCT, SHOP_PLANS } from "@shared/tiers";
import { reminderState } from "@shared/reminders";
import { asyncHandler, currentUser, rateLimit, requireAuth } from "../auth";
import {
  NEXT_STATUS,
  bookingsThisMonth,
  matchCatalog,
  dueFrom,
  httpError,
  notifyPlayer,
  priceFor,
  recordSignals,
  shopForOwner,
  uniqueSlug,
  usersByIds,
  writeJobToBag,
} from "../b2b";
import { getStripe } from "./billing";
import { newCode } from "./marketplace";
import { parseBody, parseId } from "./util";

export const shopsRouter = Router();

const appUrl = (req: Request) => process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;

const ACTIVE: BookingStatus[] = ["requested", "accepted", "in_progress", "ready"];

/** What the public (and players) may see about a shop. */
function publicShop(s: Shop, extra: Record<string, unknown> = {}) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    bio: s.bio,
    address: s.address,
    city: s.city,
    phone: s.phone,
    email: s.email,
    website: s.website,
    certifications: s.certifications,
    machine: s.machine,
    openingHours: s.openingHours,
    labourCents: s.labourCents,
    rushCents: s.rushCents,
    turnaroundHours: s.turnaroundHours,
    acceptingBookings: s.acceptingBookings,
    pro: s.plan === "pro",
    isDemo: s.isDemo,
    ...extra,
  };
}

async function shopRatings(shopIds: number[]) {
  if (!shopIds.length) return new Map<number, { avg: number | null; count: number; jobs: number }>();
  const rows = await db
    .select({
      shopId: bookings.shopId,
      avg: sql<number | null>`avg(${bookings.rating})::float`,
      count: sql<number>`count(${bookings.rating})::int`,
      jobs: sql<number>`count(*) filter (where ${bookings.status} in ('ready','collected'))::int`,
    })
    .from(bookings)
    .where(inArray(bookings.shopId, shopIds))
    .groupBy(bookings.shopId);
  return new Map(rows.map((r) => [r.shopId, { avg: r.avg ? Math.round(r.avg * 10) / 10 : null, count: r.count, jobs: r.jobs }]));
}

// ═══ Public directory ═══════════════════════════════════════════════════════

shopsRouter.get(
  "/api/shops",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase().slice(0, 60) : "";
    let rows = await db.select().from(shops).orderBy(shops.name);
    if (q) rows = rows.filter((s) => [s.name, s.city, s.address].some((f) => f?.toLowerCase().includes(q)));
    const ratings = await shopRatings(rows.map((r) => r.id));
    // Sorted by name and distance-free for now. Never by plan: paying doesn't buy rank.
    res.json(rows.map((s) => publicShop(s, { rating: ratings.get(s.id) ?? { avg: null, count: 0, jobs: 0 } })));
  }),
);

shopsRouter.get(
  "/api/shops/:slug",
  asyncHandler(async (req, res) => {
    const [shop] = await db.select().from(shops).where(eq(shops.slug, String(req.params.slug).toLowerCase()));
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const ratings = await shopRatings([shop.id]);
    const popular = await db
      .select({ id: strings.id, brandName: strings.brandName, model: strings.model, family: strings.family, n: sql<number>`count(*)::int` })
      .from(bookings)
      .innerJoin(strings, eq(strings.id, bookings.stringId))
      .where(eq(bookings.shopId, shop.id))
      .groupBy(strings.id)
      .orderBy(desc(sql`count(*)`))
      .limit(5);
    const programs = await db
      .select({
        id: samplePrograms.id,
        title: samplePrograms.title,
        pitch: samplePrograms.pitch,
        brandName: brands.name,
        stringId: samplePrograms.stringId,
        model: strings.model,
        unitsLeft: sql<number>`(${samplePrograms.unitsTotal} - (select count(*) from bookings b where b.sample_program_id = ${samplePrograms.id} and b.status not in ('cancelled','declined')))::int`,
      })
      .from(sampleProgramShops)
      .innerJoin(samplePrograms, eq(samplePrograms.id, sampleProgramShops.programId))
      .innerJoin(brands, eq(brands.id, samplePrograms.brandId))
      .innerJoin(strings, eq(strings.id, samplePrograms.stringId))
      .where(and(eq(sampleProgramShops.shopId, shop.id), eq(samplePrograms.status, "active")));
    res.json(
      publicShop(shop, {
        rating: ratings.get(shop.id) ?? { avg: null, count: 0, jobs: 0 },
        popularStrings: popular.filter((p) => p.n >= 2).map(({ n: _n, ...p }) => p),
        samplePrograms: programs.filter((p) => p.unitsLeft > 0),
      }),
    );
  }),
);

// ═══ Player bookings ════════════════════════════════════════════════════════

shopsRouter.post(
  "/api/shops/:slug/bookings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(bookingInputSchema, req.body, res);
    if (!data) return;
    const [shop] = await db.select().from(shops).where(eq(shops.slug, String(req.params.slug).toLowerCase()));
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (shop.ownerUserId === user.id) return res.status(400).json({ message: "That's your own shop — add it as a walk-in from your queue." });
    if (!shop.acceptingBookings) return res.status(409).json({ message: `${shop.name} isn't taking online bookings right now.` });
    if (shop.plan === "free" && (await bookingsThisMonth(shop.id)) >= FREE_SHOP_MONTHLY_BOOKINGS) {
      return res.status(409).json({ message: `${shop.name} is fully booked online this month. Call them to drop off.` });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (data.dropOffAt.getTime() < today.getTime()) return res.status(400).json({ message: "Pick a drop-off day from today on.", field: "dropOffAt" });
    if (data.dropOffAt.getTime() > Date.now() + 60 * 86_400_000) return res.status(400).json({ message: "Book within the next 60 days.", field: "dropOffAt" });

    let racketLabel = data.racketLabel;
    let savedRacketId: number | null = null;
    if (data.savedRacketId) {
      const [r] = await db.select().from(savedRackets).where(and(eq(savedRackets.id, data.savedRacketId), eq(savedRackets.userId, user.id)));
      if (!r) return res.status(400).json({ message: "That racket isn't in your bag.", field: "savedRacketId" });
      savedRacketId = r.id;
      racketLabel = racketLabel || [r.nickname, [r.brand, r.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
    }
    if (!racketLabel) return res.status(400).json({ message: "Which racket? Pick one from your bag or name it.", field: "racketLabel" });

    let [string] = data.stringId ? await db.select().from(strings).where(eq(strings.id, data.stringId)) : [];
    if (data.stringId && !string) return res.status(400).json({ message: "Unknown string", field: "stringId" });
    // "Book this setup" sends the AI's wording ("Luxilon ALU Power 125"); link it to the catalogue when it names one.
    if (!string && data.mains) [string] = await matchCatalog([data.mains]);
    const mains = data.mains ?? (string ? `${string.brandName} ${string.model}` : null);

    // Sample installs must be at a participating shop and within the programme's units.
    let sampleProgramId: number | null = null;
    if (data.sampleProgramId) {
      const [p] = await db
        .select({ program: samplePrograms })
        .from(sampleProgramShops)
        .innerJoin(samplePrograms, eq(samplePrograms.id, sampleProgramShops.programId))
        .where(and(eq(sampleProgramShops.shopId, shop.id), eq(samplePrograms.id, data.sampleProgramId), eq(samplePrograms.status, "active")));
      if (!p) return res.status(400).json({ message: "That sample isn't available at this shop.", field: "sampleProgramId" });
      const [{ used }] = await db
        .select({ used: sql<number>`count(*)::int` })
        .from(bookings)
        .where(and(eq(bookings.sampleProgramId, p.program.id), notInArray(bookings.status, ["cancelled", "declined"])));
      if (used >= p.program.unitsTotal) return res.status(409).json({ message: "This sample programme has run out." });
      const [already] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.sampleProgramId, p.program.id), eq(bookings.playerUserId, user.id), notInArray(bookings.status, ["cancelled", "declined"])));
      if (already) return res.status(409).json({ message: "You've already claimed this sample." });
      sampleProgramId = p.program.id;
    }

    let affiliateClickId: number | null = null;
    if (data.affiliateCode) {
      const [click] = await db.select().from(affiliateClicks).where(eq(affiliateClicks.code, data.affiliateCode));
      if (click && !click.convertedAt) affiliateClickId = click.id;
    }

    const rush = !!data.rush;
    const supplies = !!data.playerSuppliesString;
    const sample = sampleProgramId !== null;
    const priceCents = sample ? 0 : priceFor(shop, string, { rush, supplies });
    const [booking] = await db
      .insert(bookings)
      .values({
        shopId: shop.id,
        playerUserId: user.id,
        savedRacketId,
        customerName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0],
        customerEmail: user.email,
        racketLabel,
        stringId: string?.id ?? null,
        mains,
        crosses: data.crosses,
        gauge: data.gauge,
        tensionMains: data.tensionMains,
        tensionCrosses: data.tensionCrosses ?? data.tensionMains,
        playerSuppliesString: supplies,
        rush,
        dropOffAt: data.dropOffAt,
        dueAt: dueFrom(data.dropOffAt, shop, rush),
        priceCents,
        notes: data.notes,
        shareHistory: data.shareHistory ?? true,
        recommendationRunId: data.recommendationRunId ?? null,
        sampleProgramId,
        affiliateClickId,
        source: sample ? "sample" : (data.source ?? "app"),
        statusLog: [{ status: "requested", at: new Date().toISOString() }],
      })
      .returning();
    if (affiliateClickId) {
      await db
        .update(affiliateClicks)
        .set({ convertedAt: new Date(), orderCents: priceCents })
        .where(eq(affiliateClicks.id, affiliateClickId));
    }
    if (string) {
      await recordSignals([{ stringId: string.id, kind: sample ? "sample" : "booked", player: user.id, region: shop.city }]);
    }
    res.status(201).json(booking);
  }),
);

async function playerBooking(id: number, userId: number) {
  const [row] = await db
    .select({ booking: bookings, shop: shops })
    .from(bookings)
    .innerJoin(shops, eq(shops.id, bookings.shopId))
    .where(and(eq(bookings.id, id), eq(bookings.playerUserId, userId)));
  return row;
}

function playerView(b: Booking, s: Shop) {
  const { shopNotes: _internal, affiliateClickId: _a, ...rest } = b;
  return { ...rest, shopNotes: b.status === "ready" || b.status === "collected" ? b.shopNotes : null, shop: publicShop(s) };
}

shopsRouter.get(
  "/api/bookings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select({ booking: bookings, shop: shops })
      .from(bookings)
      .innerJoin(shops, eq(shops.id, bookings.shopId))
      .where(eq(bookings.playerUserId, user.id))
      .orderBy(desc(bookings.createdAt))
      .limit(100);
    res.json(rows.map((r) => playerView(r.booking, r.shop)));
  }),
);

/**
 * Prefill for "Book a restring" — used when a reminder fires. Suggests the
 * shop that strung this racket last and the setup it was strung with.
 */
shopsRouter.get(
  "/api/bookings/suggest",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const racketId = parseId(String(req.query.racketId ?? ""));
    let lastShop: Shop | undefined;
    let prefill: Record<string, unknown> | null = null;
    let invitable: { savedStringerId: number; name: string } | null = null;
    if (racketId) {
      const [job] = await db
        .select({ job: stringJobs, stringer: savedStringers })
        .from(stringJobs)
        .leftJoin(savedStringers, eq(savedStringers.id, stringJobs.stringerId))
        .where(and(eq(stringJobs.savedRacketId, racketId), eq(stringJobs.userId, user.id)))
        .orderBy(desc(stringJobs.strungAt))
        .limit(1);
      if (job) {
        // Hand-logged jobs only have text ("Wilson NXT"); resolve it so the estimate includes the string.
        const stringId = job.job.stringId ?? (job.job.mains ? (await matchCatalog([job.job.mains]))[0]?.id ?? null : null);
        prefill = {
          stringId,
          mains: job.job.mains,
          crosses: job.job.crosses,
          gauge: job.job.gauge,
          tensionMains: job.job.tensionMains,
          tensionCrosses: job.job.tensionCrosses,
        };
        if (job.stringer?.shopId) [lastShop] = await db.select().from(shops).where(eq(shops.id, job.stringer.shopId));
        // Their usual stringer isn't on 10IS yet: offer an invite instead of a stranger's shop.
        else if (job.stringer) invitable = { savedStringerId: job.stringer.id, name: job.stringer.stringerName };
      }
    }
    if (!lastShop && !invitable) {
      const [b] = await db
        .select({ shop: shops })
        .from(bookings)
        .innerJoin(shops, eq(shops.id, bookings.shopId))
        .where(eq(bookings.playerUserId, user.id))
        .orderBy(desc(bookings.createdAt))
        .limit(1);
      lastShop = b?.shop;
    }
    res.json({ shop: lastShop ? publicShop(lastShop) : null, prefill, invitable });
  }),
);

shopsRouter.get(
  "/api/bookings/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const row = id ? await playerBooking(id, currentUser(req).id) : undefined;
    if (!row) return res.status(404).json({ message: "Booking not found" });
    res.json(playerView(row.booking, row.shop));
  }),
);

shopsRouter.post(
  "/api/bookings/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const row = id ? await playerBooking(id, currentUser(req).id) : undefined;
    if (!row) return res.status(404).json({ message: "Booking not found" });
    if (!["requested", "accepted"].includes(row.booking.status)) {
      return res.status(409).json({ message: "It's already on the machine — call the shop to change it." });
    }
    const [b] = await db
      .update(bookings)
      .set({ status: "cancelled", statusLog: [...row.booking.statusLog, { status: "cancelled", at: new Date().toISOString(), note: "Cancelled by player" }], updatedAt: new Date() })
      .where(eq(bookings.id, row.booking.id))
      .returning();
    res.json(playerView(b, row.shop));
  }),
);

shopsRouter.post(
  "/api/bookings/:id/rate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const data = parseBody(z.object({ rating: z.number().int().min(1).max(5) }), req.body, res);
    if (!data) return;
    const row = id ? await playerBooking(id, user.id) : undefined;
    if (!row) return res.status(404).json({ message: "Booking not found" });
    if (!["ready", "collected"].includes(row.booking.status)) return res.status(409).json({ message: "Rate it once you've hit with it." });
    const first = row.booking.rating == null;
    const [b] = await db.update(bookings).set({ rating: data.rating, updatedAt: new Date() }).where(eq(bookings.id, row.booking.id)).returning();
    if (b.stringJobId) await db.update(stringJobs).set({ rating: data.rating }).where(and(eq(stringJobs.id, b.stringJobId), eq(stringJobs.userId, user.id)));
    if (first && b.stringId) await recordSignals([{ stringId: b.stringId, kind: "rated", rating: data.rating, player: user.id, region: row.shop.city, sampled: !!b.sampleProgramId }]);
    res.json(playerView(b, row.shop));
  }),
);

// ═══ Stringer: my shop ══════════════════════════════════════════════════════

shopsRouter.use("/api/shop", requireAuth);

async function requireShop(req: Request): Promise<Shop> {
  const shop = await shopForOwner(currentUser(req).id);
  if (!shop) throw httpError(404, "You don't have a shop yet.");
  return shop;
}

shopsRouter.post(
  "/api/shop",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (await shopForOwner(user.id)) return res.status(409).json({ message: "You already have a shop." });
    const data = parseBody(shopInputSchema, req.body, res);
    if (!data) return;
    if (data.slug) {
      const [taken] = await db.select({ id: shops.id }).from(shops).where(eq(shops.slug, data.slug));
      if (taken) return res.status(409).json({ message: "That address is taken.", field: "slug" });
    }
    const { inviteCode, ...fields } = data;
    const slug = fields.slug ?? (await uniqueSlug(shops, fields.name));
    const [shop] = await db
      .insert(shops)
      .values({ ...fields, slug, ownerUserId: user.id, email: fields.email ?? user.email })
      .returning();
    if (inviteCode) await acceptInvite(inviteCode, shop, user.id);
    res.status(201).json(shop);
  }),
);

shopsRouter.get(
  "/api/shop/me",
  asyncHandler(async (req, res) => {
    const shop = await shopForOwner(currentUser(req).id);
    if (!shop) return res.json({ shop: null });
    const [counts] = await db
      .select({
        active: sql<number>`count(*) filter (where ${bookings.status} in ('requested','accepted','in_progress','ready'))::int`,
        requested: sql<number>`count(*) filter (where ${bookings.status} = 'requested')::int`,
        ready: sql<number>`count(*) filter (where ${bookings.status} = 'ready')::int`,
        dueToday: sql<number>`count(*) filter (where ${bookings.status} in ('accepted','in_progress') and ${bookings.dueAt} < now() + interval '1 day')::int`,
      })
      .from(bookings)
      .where(eq(bookings.shopId, shop.id));
    res.json({
      shop,
      counts,
      usage: { bookingsThisMonth: await bookingsThisMonth(shop.id), limit: shop.plan === "pro" ? null : FREE_SHOP_MONTHLY_BOOKINGS },
      plans: SHOP_PLANS,
    });
  }),
);

shopsRouter.patch(
  "/api/shop",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const data = parseBody(shopInputSchema.partial(), req.body, res);
    if (!data) return;
    if (data.slug && data.slug !== shop.slug) {
      const [taken] = await db.select({ id: shops.id }).from(shops).where(and(eq(shops.slug, data.slug), ne(shops.id, shop.id)));
      if (taken) return res.status(409).json({ message: "That address is taken.", field: "slug" });
    }
    const [updated] = await db.update(shops).set(data).where(eq(shops.id, shop.id)).returning();
    res.json(updated);
  }),
);

function queueItem(b: Booking, extra: Record<string, unknown> = {}) {
  return { ...b, ...extra };
}

shopsRouter.get(
  "/api/shop/queue",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const view = req.query.view === "done" ? "done" : "active";
    const rows = await db
      .select({ booking: bookings, string: strings })
      .from(bookings)
      .leftJoin(strings, eq(strings.id, bookings.stringId))
      .where(and(eq(bookings.shopId, shop.id), view === "active" ? inArray(bookings.status, ACTIVE) : notInArray(bookings.status, ACTIVE)))
      .orderBy(view === "active" ? bookings.dueAt : desc(bookings.updatedAt))
      .limit(view === "active" ? 200 : 60);
    const programIds = [...new Set(rows.map((r) => r.booking.sampleProgramId).filter((x): x is number => !!x))];
    const progs = programIds.length
      ? await db.select({ id: samplePrograms.id, title: samplePrograms.title, fee: samplePrograms.installFeeCents }).from(samplePrograms).where(inArray(samplePrograms.id, programIds))
      : [];
    const byProg = new Map(progs.map((p) => [p.id, { ...p, payoutCents: Math.round((p.fee * (100 - SAMPLE_PLATFORM_FEE_PCT)) / 100) }]));
    res.json(
      rows.map((r) =>
        queueItem(r.booking, {
          string: r.string ? { id: r.string.id, brandName: r.string.brandName, model: r.string.model, family: r.string.family } : null,
          sample: r.booking.sampleProgramId ? byProg.get(r.booking.sampleProgramId) ?? null : null,
        }),
      ),
    );
  }),
);

async function shopBooking(shop: Shop, id: number | null) {
  if (!id) return undefined;
  const [b] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.shopId, shop.id)));
  return b;
}

shopsRouter.get(
  "/api/shop/bookings/:id",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const b = await shopBooking(shop, parseId(req.params.id));
    if (!b) return res.status(404).json({ message: "Job not found" });

    // This shop's own past jobs for the same racket (or the same walk-in customer).
    const sameCustomer = b.savedRacketId
      ? eq(bookings.savedRacketId, b.savedRacketId)
      : b.customerEmail
        ? eq(bookings.customerEmail, b.customerEmail)
        : eq(bookings.customerName, b.customerName);
    const atThisShop = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.shopId, shop.id), sameCustomer, ne(bookings.id, b.id), inArray(bookings.status, ["ready", "collected"])))
      .orderBy(desc(bookings.dropOffAt))
      .limit(20);

    // The racket's full history from every stringer: only with the player's consent, and only on Shop Pro.
    let fullHistory: unknown[] | null = null;
    let historyState: "shared" | "not-shared" | "locked" | "none" = "none";
    if (b.playerUserId && b.savedRacketId) {
      if (!b.shareHistory) historyState = "not-shared";
      else if (shop.plan !== "pro") historyState = "locked";
      else {
        historyState = "shared";
        const jobs = await db
          .select({ job: stringJobs, stringerName: savedStringers.stringerName })
          .from(stringJobs)
          .leftJoin(savedStringers, eq(savedStringers.id, stringJobs.stringerId))
          .where(and(eq(stringJobs.savedRacketId, b.savedRacketId), eq(stringJobs.userId, b.playerUserId)))
          .orderBy(desc(stringJobs.strungAt))
          .limit(12);
        fullHistory = jobs.map((j) => ({
          id: j.job.id,
          strungAt: j.job.strungAt,
          mains: j.job.mains,
          crosses: j.job.crosses,
          gauge: j.job.gauge,
          tensionMains: j.job.tensionMains,
          tensionCrosses: j.job.tensionCrosses,
          rating: j.job.rating,
          stringerName: j.stringerName ?? null,
          // Players' private notes stay private.
        }));
      }
    }
    const [racket] = b.savedRacketId && b.playerUserId
      ? await db
          .select({ brand: savedRackets.brand, model: savedRackets.model, headSize: savedRackets.headSize, stringPattern: savedRackets.stringPattern })
          .from(savedRackets)
          .where(eq(savedRackets.id, b.savedRacketId))
      : [];
    const [string] = b.stringId ? await db.select().from(strings).where(eq(strings.id, b.stringId)) : [];
    const [sample] = b.sampleProgramId ? await db.select().from(samplePrograms).where(eq(samplePrograms.id, b.sampleProgramId)) : [];
    res.json({
      booking: b,
      racket: racket ?? null,
      string: string ?? null,
      sample: sample ? { id: sample.id, title: sample.title, payoutCents: Math.round((sample.installFeeCents * (100 - SAMPLE_PLATFORM_FEE_PCT)) / 100) } : null,
      atThisShop,
      fullHistory,
      historyState,
      next: NEXT_STATUS[b.status],
    });
  }),
);

shopsRouter.post(
  "/api/shop/bookings/:id/status",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const data = parseBody(
      z.object({
        status: z.enum(["requested", "accepted", "in_progress", "ready", "collected", "cancelled", "declined"]),
        note: z.string().trim().max(300).optional(),
      }),
      req.body,
      res,
    );
    if (!data) return;
    const b = await shopBooking(shop, parseId(req.params.id));
    if (!b) return res.status(404).json({ message: "Job not found" });
    if (!NEXT_STATUS[b.status].includes(data.status)) {
      return res.status(409).json({ message: `Can't go from ${b.status.replace("_", " ")} to ${data.status.replace("_", " ")}.` });
    }
    let stringJobId = b.stringJobId;
    if (data.status === "ready" && !stringJobId) {
      stringJobId = await writeJobToBag(b, shop);
      if (b.stringId) await recordSignals([{ stringId: b.stringId, kind: "installed", player: b.playerUserId ?? `walkin:${shop.id}:${b.customerName}`, region: shop.city, sampled: !!b.sampleProgramId }]);
    }
    const [updated] = await db
      .update(bookings)
      .set({
        status: data.status,
        stringJobId,
        statusLog: [...b.statusLog, { status: data.status, at: new Date().toISOString(), ...(data.note ? { note: data.note } : {}) }],
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, b.id))
      .returning();
    await notifyPlayer(updated, shop, data.status);
    res.json({ ...updated, next: NEXT_STATUS[updated.status] });
  }),
);

shopsRouter.patch(
  "/api/shop/bookings/:id",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const data = parseBody(
      z.object({
        shopNotes: z.string().trim().max(600).nullable().optional(),
        priceCents: z.coerce.number().int().min(0).max(100000).optional(),
        mains: z.string().trim().max(120).nullable().optional(),
        crosses: z.string().trim().max(120).nullable().optional(),
        tensionMains: z.coerce.number().min(20).max(90).nullable().optional(),
        tensionCrosses: z.coerce.number().min(20).max(90).nullable().optional(),
        dueAt: z.coerce.date().optional(),
      }),
      req.body,
      res,
    );
    if (!data) return;
    const b = await shopBooking(shop, parseId(req.params.id));
    if (!b) return res.status(404).json({ message: "Job not found" });
    const [updated] = await db.update(bookings).set({ ...data, updatedAt: new Date() }).where(eq(bookings.id, b.id)).returning();
    res.json(updated);
  }),
);

shopsRouter.post(
  "/api/shop/walk-ins",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const data = parseBody(walkInInputSchema, req.body, res);
    if (!data) return;
    const [string] = data.stringId ? await db.select().from(strings).where(eq(strings.id, data.stringId)) : [];
    const dropOffAt = data.dropOffAt ?? new Date();
    const rush = !!data.rush;
    const [b] = await db
      .insert(bookings)
      .values({
        shopId: shop.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        racketLabel: data.racketLabel,
        stringId: string?.id ?? null,
        mains: data.mains ?? (string ? `${string.brandName} ${string.model}` : null),
        crosses: data.crosses,
        gauge: data.gauge,
        tensionMains: data.tensionMains,
        tensionCrosses: data.tensionCrosses ?? data.tensionMains,
        playerSuppliesString: !!data.playerSuppliesString,
        rush,
        dropOffAt,
        dueAt: dueFrom(dropOffAt, shop, rush),
        status: "accepted",
        priceCents: priceFor(shop, string, { rush, supplies: !!data.playerSuppliesString }),
        notes: data.notes,
        shareHistory: false,
        source: "walk-in",
        statusLog: [{ status: "accepted", at: new Date().toISOString(), note: "Walk-in" }],
      })
      .returning();
    res.status(201).json(b);
  }),
);

/** Regulars, and — on Shop Pro — which of them are due a restring. */
shopsRouter.get(
  "/api/shop/customers",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const rows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.shopId, shop.id), inArray(bookings.status, ["ready", "collected"])))
      .orderBy(desc(bookings.dropOffAt));
    const groups = new Map<string, { key: string; name: string; email: string | null; phone: string | null; playerUserId: number | null; jobs: number; spentCents: number; lastAt: string; rackets: Map<number | string, { label: string; savedRacketId: number | null }> }>();
    for (const b of rows) {
      const key = b.playerUserId ? `u${b.playerUserId}` : `w:${(b.customerEmail ?? b.customerName).toLowerCase()}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, name: b.customerName, email: b.customerEmail, phone: b.customerPhone, playerUserId: b.playerUserId, jobs: 0, spentCents: 0, lastAt: b.dropOffAt.toISOString(), rackets: new Map() };
        groups.set(key, g);
      }
      g.jobs++;
      g.spentCents += b.priceCents ?? 0;
      g.rackets.set(b.savedRacketId ?? b.racketLabel, { label: b.racketLabel, savedRacketId: b.savedRacketId });
    }
    const pro = shop.plan === "pro";
    const out = [];
    for (const g of groups.values()) {
      let due: Array<{ label: string; status: string; daysLeft: number | null }> = [];
      if (pro && g.playerUserId) {
        for (const r of g.rackets.values()) {
          if (!r.savedRacketId) continue;
          const [racket] = await db.select().from(savedRackets).where(eq(savedRackets.id, r.savedRacketId));
          if (!racket) continue;
          const [job] = await db.select().from(stringJobs).where(eq(stringJobs.savedRacketId, racket.id)).orderBy(desc(stringJobs.strungAt)).limit(1);
          const state = reminderState({
            hoursPerWeek: racket.hoursPerWeek,
            restringIntervalDays: racket.restringIntervalDays,
            mains: job?.mains,
            crosses: job?.crosses,
            lastStrungAt: job?.strungAt ?? null,
          });
          if (state.status === "overdue" || state.status === "due-soon") due.push({ label: r.label, status: state.status, daysLeft: state.daysLeft });
        }
      }
      out.push({
        key: g.key,
        name: g.name,
        email: g.email,
        phone: g.phone,
        app: !!g.playerUserId,
        jobs: g.jobs,
        spentCents: g.spentCents,
        lastAt: g.lastAt,
        rackets: [...g.rackets.values()].map((r) => r.label),
        due: pro ? due : null,
      });
    }
    out.sort((a, b) => (b.due?.length ?? 0) - (a.due?.length ?? 0) || b.jobs - a.jobs);
    res.json({ pro, customers: out });
  }),
);

shopsRouter.get(
  "/api/shop/insights",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    if (shop.plan !== "pro") return res.status(403).json({ message: "Shop insights come with Shop Pro.", upgrade: true });
    const done = and(eq(bookings.shopId, shop.id), inArray(bookings.status, ["ready", "collected"]));
    const monthly = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${bookings.dropOffAt}), 'YYYY-MM')`,
        jobs: sql<number>`count(*)::int`,
        revenueCents: sql<number>`coalesce(sum(${bookings.priceCents}),0)::int`,
        app: sql<number>`count(*) filter (where ${bookings.playerUserId} is not null)::int`,
      })
      .from(bookings)
      .where(and(done, sql`${bookings.dropOffAt} > now() - interval '6 months'`))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    const topStrings = await db
      .select({ brandName: strings.brandName, model: strings.model, jobs: sql<number>`count(*)::int`, avgRating: sql<number | null>`round(avg(${bookings.rating})::numeric,1)::float` })
      .from(bookings)
      .innerJoin(strings, eq(strings.id, bookings.stringId))
      .where(done)
      .groupBy(strings.id)
      .orderBy(desc(sql`count(*)`))
      .limit(8);
    const [repeat] = await db
      .select({
        customers: sql<number>`count(distinct coalesce(${bookings.playerUserId}::text, ${bookings.customerName}))::int`,
        repeaters: sql<number>`(select count(*)::int from (select coalesce(player_user_id::text, customer_name) k from bookings where shop_id = ${shop.id} and status in ('ready','collected') group by 1 having count(*) > 1) t)`,
        avgRating: sql<number | null>`round(avg(${bookings.rating})::numeric,1)::float`,
        sampleInstalls: sql<number>`count(*) filter (where ${bookings.sampleProgramId} is not null)::int`,
      })
      .from(bookings)
      .where(done);
    const samplePayout = await db
      .select({ cents: sql<number>`coalesce(sum(${samplePrograms.installFeeCents}),0)::int` })
      .from(bookings)
      .innerJoin(samplePrograms, eq(samplePrograms.id, bookings.sampleProgramId))
      .where(done);
    res.json({
      monthly,
      topStrings,
      repeatRate: repeat.customers ? Math.round((repeat.repeaters / repeat.customers) * 100) : null,
      customers: repeat.customers,
      avgRating: repeat.avgRating,
      sampleInstalls: repeat.sampleInstalls,
      samplePayoutCents: Math.round(((samplePayout[0]?.cents ?? 0) * (100 - SAMPLE_PLATFORM_FEE_PCT)) / 100),
    });
  }),
);

// ─── Sample programmes a shop can join ──────────────────────────────────────

shopsRouter.get(
  "/api/shop/programs",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const rows = await db
      .select({ program: samplePrograms, brandName: brands.name, string: strings })
      .from(samplePrograms)
      .innerJoin(brands, eq(brands.id, samplePrograms.brandId))
      .innerJoin(strings, eq(strings.id, samplePrograms.stringId))
      .where(eq(samplePrograms.status, "active"));
    const joined = new Set(
      (await db.select({ id: sampleProgramShops.programId }).from(sampleProgramShops).where(eq(sampleProgramShops.shopId, shop.id))).map((r) => r.id),
    );
    res.json({
      pro: shop.plan === "pro",
      feePct: SAMPLE_PLATFORM_FEE_PCT,
      programs: rows.map((r) => ({
        id: r.program.id,
        title: r.program.title,
        pitch: r.program.pitch,
        brandName: r.brandName,
        string: { id: r.string.id, brandName: r.string.brandName, model: r.string.model, family: r.string.family },
        payoutCents: Math.round((r.program.installFeeCents * (100 - SAMPLE_PLATFORM_FEE_PCT)) / 100),
        joined: joined.has(r.program.id),
      })),
    });
  }),
);

shopsRouter.post(
  "/api/shop/programs/:id/join",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    if (shop.plan !== "pro") return res.status(403).json({ message: "Paid sample installs come with Shop Pro.", upgrade: true });
    const id = parseId(req.params.id);
    const [p] = id ? await db.select().from(samplePrograms).where(and(eq(samplePrograms.id, id), eq(samplePrograms.status, "active"))) : [];
    if (!p) return res.status(404).json({ message: "Programme not found" });
    await db.insert(sampleProgramShops).values({ programId: p.id, shopId: shop.id }).onConflictDoNothing();
    res.json({ joined: true });
  }),
);

shopsRouter.post(
  "/api/shop/programs/:id/leave",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const id = parseId(req.params.id);
    if (id) await db.delete(sampleProgramShops).where(and(eq(sampleProgramShops.programId, id), eq(sampleProgramShops.shopId, shop.id)));
    res.json({ joined: false });
  }),
);

// ─── Shop Pro billing (Stripe test mode) ────────────────────────────────────

shopsRouter.post(
  "/api/shop/checkout",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const shop = await requireShop(req);
    if (shop.plan === "pro") return res.status(400).json({ message: "You're already on Shop Pro." });
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: shop.stripeCustomerId ?? undefined,
      customer_email: shop.stripeCustomerId ? undefined : user.email,
      client_reference_id: String(user.id),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "10IS Shop Pro" },
            unit_amount: SHOP_PLANS.pro.amountCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl(req)}/shop/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl(req)}/shop/billing`,
      metadata: { kind: "shop", shopId: String(shop.id), userId: String(user.id) },
      subscription_data: { metadata: { kind: "shop", shopId: String(shop.id) } },
    });
    res.json({ url: session.url });
  }),
);

shopsRouter.post(
  "/api/shop/checkout/verify",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const data = parseBody(z.object({ session_id: z.string().min(1).max(300) }), req.body, res);
    if (!data) return;
    const session = await getStripe().checkout.sessions.retrieve(data.session_id);
    if (session.metadata?.kind !== "shop" || session.metadata?.shopId !== String(shop.id)) {
      return res.status(403).json({ message: "This payment belongs to a different shop." });
    }
    if (session.payment_status === "unpaid") return res.status(402).json({ message: "Payment isn't complete yet." });
    const [updated] = await db
      .update(shops)
      .set({
        plan: "pro",
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? shop.stripeCustomerId,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? shop.stripeSubscriptionId,
      })
      .where(eq(shops.id, shop.id))
      .returning();
    res.json({ shop: updated });
  }),
);

shopsRouter.post(
  "/api/shop/billing-portal",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    if (!shop.stripeCustomerId) return res.status(400).json({ message: "No billing history yet." });
    const portal = await getStripe().billingPortal.sessions.create({ customer: shop.stripeCustomerId, return_url: `${appUrl(req)}/shop/billing` });
    res.json({ url: portal.url });
  }),
);


// ═══ Invite your stringer ═══════════════════════════════════════════════════
// The player shares a link from their own phone. 10IS never contacts the stringer.

const inviteLimit = rateLimit({ windowMs: 60 * 60_000, max: 20, key: (req) => `inv${req.user?.id}` });
const firstNameOf = (u: { firstName: string | null } | undefined) => (u?.firstName?.trim() || "One of your customers").split(/\s+/)[0];

shopsRouter.post(
  "/api/stringers/saved/:id/invite",
  requireAuth,
  inviteLimit,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const [stringer] = id ? await db.select().from(savedStringers).where(and(eq(savedStringers.id, id), eq(savedStringers.userId, user.id))) : [];
    if (!stringer) return res.status(404).json({ message: "Stringer not found" });
    if (stringer.shopId) return res.status(409).json({ message: `${stringer.stringerName} already takes bookings on 10IS.` });
    let [invite] = await db.select().from(stringerInvites).where(eq(stringerInvites.savedStringerId, stringer.id));
    if (!invite) [invite] = await db.insert(stringerInvites).values({ code: newCode(), inviterUserId: user.id, savedStringerId: stringer.id }).returning();
    const url = `${appUrl(req)}/shop/new?invite=${invite.code}`;
    const who = user.firstName?.trim() || "I";
    res.json({
      code: invite.code,
      url,
      stringerName: stringer.stringerName,
      phone: stringer.phone,
      message: `Hi ${stringer.stringerName.split(/\s+/)[0]}, ${who === "I" ? "I" : `it's ${who}. I`} track my racket and restrings in the 10IS app. You can take bookings from me there for free, with a queue that shows me when it's ready: ${url}`,
    });
  }),
);

/** What a stringer sees when they open an invite link. Only the inviter's first name is shown. */
shopsRouter.get(
  "/api/invites/:code",
  asyncHandler(async (req, res) => {
    const code = String(req.params.code).slice(0, 40);
    const [row] = await db
      .select({ invite: stringerInvites, stringer: savedStringers })
      .from(stringerInvites)
      .innerJoin(savedStringers, eq(savedStringers.id, stringerInvites.savedStringerId))
      .where(eq(stringerInvites.code, code));
    if (!row) return res.status(404).json({ message: "This invite link isn't valid." });
    if (!row.invite.acceptedAt) await db.update(stringerInvites).set({ opens: row.invite.opens + 1 }).where(eq(stringerInvites.id, row.invite.id));
    const inviter = (await usersByIds([row.invite.inviterUserId])).get(row.invite.inviterUserId);
    res.json({
      inviterFirstName: firstNameOf(inviter),
      stringerName: row.stringer.stringerName,
      city: row.stringer.stringerAddress?.split(",").map((s) => s.trim()).filter(Boolean).at(-1) ?? null,
      accepted: !!row.invite.acceptedAt,
    });
  }),
);

/** A stringer who already has a shop opens a customer's invite: link it to the existing shop. */
shopsRouter.post(
  "/api/shop/invites/:code/accept",
  asyncHandler(async (req, res) => {
    const shop = await requireShop(req);
    const [invite] = await db.select().from(stringerInvites).where(eq(stringerInvites.code, String(req.params.code).slice(0, 40)));
    if (!invite) return res.status(404).json({ message: "This invite link isn't valid." });
    if (invite.acceptedAt) return res.status(409).json({ message: "This invite has already been used." });
    if (invite.inviterUserId === currentUser(req).id) return res.status(400).json({ message: "That's your own invite." });
    await acceptInvite(invite.code, shop, currentUser(req).id);
    res.json({ linked: true });
  }),
);

/** Link the new shop to the customer who invited it, so their next "Book a restring" goes straight there. */
async function acceptInvite(code: string, shop: Shop, ownerUserId: number) {
  const [invite] = await db.select().from(stringerInvites).where(eq(stringerInvites.code, code));
  if (!invite || invite.acceptedAt || invite.inviterUserId === ownerUserId) return;
  await db.update(stringerInvites).set({ acceptedShopId: shop.id, acceptedAt: new Date() }).where(eq(stringerInvites.id, invite.id));
  await db
    .update(savedStringers)
    .set({ shopId: shop.id })
    .where(and(eq(savedStringers.id, invite.savedStringerId), eq(savedStringers.userId, invite.inviterUserId)));
}
