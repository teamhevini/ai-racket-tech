import { and, eq, gte, ilike, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { affiliateClicks, bookings, brands, campaignEvents, campaigns, retailOffers, samplePrograms, savedRackets, stringSignals, strings, type Brand } from "@shared/schema";
import { K_ANONYMITY } from "@shared/tiers";

/**
 * Brand insights built only from the anonymised string_signals table. Every
 * group is suppressed unless it contains at least K_ANONYMITY distinct players.
 */

const WEEKS = 12;
const weekKey = (d: Date) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // Monday
  return x.toISOString().slice(0, 10);
};

type Sig = typeof stringSignals.$inferSelect;

function kSafe<T>(players: Set<string>, value: T): T | null {
  return players.size >= K_ANONYMITY ? value : null;
}

export async function stringBrandInsights(brand: Brand) {
  const since = new Date(Date.now() - WEEKS * 7 * 86_400_000);
  const catalog = await db.select({ id: strings.id, brandId: strings.brandId, brandName: strings.brandName, model: strings.model }).from(strings);
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const mine = new Set(catalog.filter((s) => s.brandId === brand.id).map((s) => s.id));
  const sigs: Sig[] = await db.select().from(stringSignals).where(gte(stringSignals.createdAt, since));
  const isMine = (s: Sig) => mine.has(s.stringId);

  // Demand: share of the AI's primary recommendations, week by week.
  const weeks: string[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) weeks.push(weekKey(new Date(Date.now() - i * 7 * 86_400_000)));
  const weekly = weeks.map((w) => ({ week: w, recommended: 0, total: 0, share: 0 }));
  const idx = new Map(weeks.map((w, i) => [w, i]));
  for (const s of sigs) {
    if (s.kind !== "recommended") continue;
    const i = idx.get(weekKey(s.createdAt));
    if (i === undefined) continue;
    weekly[i].total++;
    if (isMine(s)) weekly[i].recommended++;
  }
  for (const w of weekly) w.share = w.total ? Math.round((w.recommended / w.total) * 1000) / 10 : 0;

  // Funnel by distinct players.
  const stages = ["recommended", "alternative", "affiliate_click", "booked", "installed", "rated"] as const;
  const funnelSets = Object.fromEntries(stages.map((k) => [k, new Set<string>()])) as Record<(typeof stages)[number], Set<string>>;
  for (const s of sigs) if (isMine(s) && s.playerHash && (stages as readonly string[]).includes(s.kind)) funnelSets[s.kind as (typeof stages)[number]].add(s.playerHash);
  const funnel = stages.map((k) => ({ stage: k, players: funnelSets[k].size >= K_ANONYMITY ? funnelSets[k].size : null }));

  // Ratings per string.
  const ratingMap = new Map<number, { sum: number; n: number; players: Set<string> }>();
  for (const s of sigs) {
    if (s.kind !== "rated" || !s.rating || !isMine(s)) continue;
    const r = ratingMap.get(s.stringId) ?? { sum: 0, n: 0, players: new Set() };
    r.sum += s.rating;
    r.n++;
    if (s.playerHash) r.players.add(s.playerHash);
    ratingMap.set(s.stringId, r);
  }
  const ratings = [...mine].map((id) => {
    const r = ratingMap.get(id);
    const label = byId.get(id)?.model ?? "?";
    return { stringId: id, model: label, avg: r ? kSafe(r.players, Math.round((r.sum / r.n) * 10) / 10) : null, players: r && r.players.size >= K_ANONYMITY ? r.players.size : null };
  });

  // Segments: our share of recommendations by level and playstyle.
  const segment = (field: "level" | "playstyle") => {
    const groups = new Map<string, { mine: number; total: number; players: Set<string> }>();
    for (const s of sigs) {
      if (s.kind !== "recommended" || !s[field]) continue;
      const g = groups.get(s[field]!) ?? { mine: 0, total: 0, players: new Set() };
      g.total++;
      if (isMine(s)) g.mine++;
      if (s.playerHash) g.players.add(s.playerHash);
      groups.set(s[field]!, g);
    }
    return [...groups.entries()]
      .map(([name, g]) => ({ name, share: kSafe(g.players, g.total ? Math.round((g.mine / g.total) * 1000) / 10 : 0), players: g.players.size >= K_ANONYMITY ? g.players.size : null }))
      .sort((a, b) => (b.share ?? -1) - (a.share ?? -1));
  };

  // Retention: after one of our strings was installed, what did the same player install next?
  const installs = new Map<string, Sig[]>();
  for (const s of sigs) {
    if (s.kind !== "installed" || !s.playerHash) continue;
    const list = installs.get(s.playerHash) ?? [];
    list.push(s);
    installs.set(s.playerHash, list);
  }
  const stayed = new Set<string>();
  const left = new Set<string>();
  const switchedTo = new Map<string, Set<string>>();
  for (const [player, list] of installs) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 0; i < list.length - 1; i++) {
      if (!isMine(list[i])) continue;
      const next = list[i + 1];
      if (isMine(next)) stayed.add(player);
      else {
        left.add(player);
        const b = byId.get(next.stringId)?.brandName ?? "Other";
        const set = switchedTo.get(b) ?? new Set();
        set.add(player);
        switchedTo.set(b, set);
      }
      break;
    }
  }
  const cohort = new Set([...stayed, ...left]);
  const retention = {
    cohort: cohort.size >= K_ANONYMITY ? cohort.size : null,
    rate: kSafe(cohort, cohort.size ? Math.round((stayed.size / cohort.size) * 100) : 0),
    switchedTo: [...switchedTo.entries()]
      .filter(([, p]) => p.size >= K_ANONYMITY)
      .map(([name, p]) => ({ brand: name, players: p.size }))
      .sort((a, b) => b.players - a.players)
      .slice(0, 4),
  };

  // Where bookings of our strings happen.
  const regionMap = new Map<string, Set<string>>();
  for (const s of sigs) {
    if (!isMine(s) || !s.region || !["booked", "installed"].includes(s.kind) || !s.playerHash) continue;
    const set = regionMap.get(s.region) ?? new Set();
    set.add(s.playerHash);
    regionMap.set(s.region, set);
  }
  const regions = [...regionMap.entries()].filter(([, p]) => p.size >= K_ANONYMITY).map(([name, p]) => ({ name, players: p.size })).sort((a, b) => b.players - a.players).slice(0, 6);

  // Frames our strings are recommended for.
  const frameMap = new Map<string, Set<string>>();
  for (const s of sigs) {
    if (!isMine(s) || s.kind !== "recommended" || !s.racketBrand || !s.playerHash) continue;
    const set = frameMap.get(s.racketBrand) ?? new Set();
    set.add(s.playerHash);
    frameMap.set(s.racketBrand, set);
  }
  const frames = [...frameMap.entries()].filter(([, p]) => p.size >= K_ANONYMITY).map(([name, p]) => ({ name, players: p.size })).sort((a, b) => b.players - a.players).slice(0, 6);

  return {
    windowWeeks: WEEKS,
    kAnonymity: K_ANONYMITY,
    weekly,
    funnel,
    ratings,
    levels: segment("level"),
    playstyles: segment("playstyle"),
    retention,
    regions,
    frames,
    samples: await sampleStats(brand.id),
  };
}

export async function sampleStats(brandId: number) {
  const progs = await db.select().from(samplePrograms).where(eq(samplePrograms.brandId, brandId));
  const out = [];
  for (const p of progs) {
    const rows = await db
      .select({ status: bookings.status, rating: bookings.rating, player: bookings.playerUserId, stringId: bookings.stringId, createdAt: bookings.createdAt })
      .from(bookings)
      .where(eq(bookings.sampleProgramId, p.id));
    const claimed = rows.filter((r) => !["cancelled", "declined"].includes(r.status));
    const installed = claimed.filter((r) => ["ready", "collected"].includes(r.status));
    const rated = installed.filter((r) => r.rating != null);
    // Rebought: the same player later booked the same string without a sample.
    const players = [...new Set(installed.map((r) => r.player).filter((x): x is number => !!x))];
    let rebought = 0;
    if (players.length) {
      const later = await db
        .select({ player: bookings.playerUserId })
        .from(bookings)
        .where(and(inArray(bookings.playerUserId, players), eq(bookings.stringId, p.stringId), sql`${bookings.sampleProgramId} is null`, inArray(bookings.status, ["accepted", "in_progress", "ready", "collected"])));
      rebought = new Set(later.map((l) => l.player)).size;
    }
    out.push({
      id: p.id,
      title: p.title,
      status: p.status,
      unitsTotal: p.unitsTotal,
      claimed: claimed.length,
      installed: installed.length,
      avgRating: rated.length >= K_ANONYMITY ? Math.round((rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
      rebought,
      rebuyRate: installed.length >= K_ANONYMITY ? Math.round((rebought / installed.length) * 100) : null,
      spendCents: installed.length * p.installFeeCents,
    });
  }
  return out;
}

export async function campaignStats(brandId: number) {
  const list = await db.select({ c: campaigns, model: strings.model }).from(campaigns).innerJoin(strings, eq(strings.id, campaigns.stringId)).where(eq(campaigns.brandId, brandId));
  if (!list.length) return [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const ev = await db
    .select({
      id: campaignEvents.campaignId,
      impressions: sql<number>`count(*) filter (where ${campaignEvents.kind} = 'impression')::int`,
      clicks: sql<number>`count(*) filter (where ${campaignEvents.kind} = 'click')::int`,
      spendCents: sql<number>`coalesce(sum(${campaignEvents.costCents}),0)::int`,
      monthSpendCents: sql<number>`coalesce(sum(${campaignEvents.costCents}) filter (where ${campaignEvents.createdAt} >= ${monthStart}),0)::int`,
      avgFit: sql<number | null>`round(avg(${campaignEvents.fitScore}) filter (where ${campaignEvents.kind} = 'impression'))::int`,
    })
    .from(campaignEvents)
    .where(inArray(campaignEvents.campaignId, list.map((l) => l.c.id)))
    .groupBy(campaignEvents.campaignId);
  const conv = await db
    .select({ id: affiliateClicks.campaignId, n: sql<number>`count(*) filter (where ${affiliateClicks.convertedAt} is not null)::int` })
    .from(affiliateClicks)
    .where(inArray(affiliateClicks.campaignId, list.map((l) => l.c.id)))
    .groupBy(affiliateClicks.campaignId);
  const byId = new Map(ev.map((e) => [e.id, e]));
  const convBy = new Map(conv.map((c) => [c.id, c.n]));
  return list.map(({ c, model }) => {
    const e = byId.get(c.id);
    const impressions = e?.impressions ?? 0;
    const clicks = e?.clicks ?? 0;
    return {
      ...c,
      stringModel: model,
      impressions,
      clicks,
      ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      spendCents: e?.spendCents ?? 0,
      monthSpendCents: e?.monthSpendCents ?? 0,
      avgFit: e?.avgFit ?? null,
      bookings: convBy.get(c.id) ?? 0,
    };
  });
}

/** Racket brands: which strings the AI pairs with their frames, and who plays them. */
export async function racketBrandInsights(brand: Brand) {
  const since = new Date(Date.now() - WEEKS * 7 * 86_400_000);
  const sigs = await db
    .select({ s: stringSignals, brandName: strings.brandName, model: strings.model })
    .from(stringSignals)
    .innerJoin(strings, eq(strings.id, stringSignals.stringId))
    .where(and(gte(stringSignals.createdAt, since), eq(stringSignals.kind, "recommended"), ilike(stringSignals.racketBrand, brand.name)));
  const pair = new Map<string, Set<string>>();
  const levels = new Map<string, Set<string>>();
  const all = new Set<string>();
  for (const { s, brandName, model } of sigs) {
    if (!s.playerHash) continue;
    all.add(s.playerHash);
    const k = `${brandName} ${model}`;
    pair.set(k, (pair.get(k) ?? new Set()).add(s.playerHash));
    if (s.level) levels.set(s.level, (levels.get(s.level) ?? new Set()).add(s.playerHash));
  }
  const [bags] = await db.select({ n: sql<number>`count(distinct ${savedRackets.userId})::int` }).from(savedRackets).where(ilike(savedRackets.brand, brand.name));
  return {
    windowWeeks: WEEKS,
    kAnonymity: K_ANONYMITY,
    players: all.size >= K_ANONYMITY ? all.size : null,
    playersWithFrameInBag: (bags?.n ?? 0) >= K_ANONYMITY ? bags.n : null,
    pairings: [...pair.entries()].filter(([, p]) => p.size >= K_ANONYMITY).map(([name, p]) => ({ name, players: p.size })).sort((a, b) => b.players - a.players).slice(0, 8),
    levels: [...levels.entries()].filter(([, p]) => p.size >= K_ANONYMITY).map(([name, p]) => ({ name, players: p.size })).sort((a, b) => b.players - a.players),
  };
}

/** Retailers: clicks and sales from 10IS, per string. */
export async function retailerInsights(brand: Brand) {
  const rows = await db
    .select({
      stringId: retailOffers.stringId,
      model: strings.model,
      brandName: strings.brandName,
      clicks: sql<number>`count(${affiliateClicks.id})::int`,
      orders: sql<number>`count(${affiliateClicks.convertedAt})::int`,
      revenueCents: sql<number>`coalesce(sum(${affiliateClicks.orderCents}),0)::int`,
      commissionCents: sql<number>`coalesce(sum(${affiliateClicks.commissionCents}),0)::int`,
    })
    .from(retailOffers)
    .innerJoin(strings, eq(strings.id, retailOffers.stringId))
    .leftJoin(affiliateClicks, eq(affiliateClicks.offerId, retailOffers.id))
    .where(eq(retailOffers.retailerId, brand.id))
    .groupBy(retailOffers.stringId, strings.model, strings.brandName);
  return { offers: rows };
}

void brands;
