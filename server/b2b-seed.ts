import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import {
  bookings,
  brands,
  campaignEvents,
  campaigns,
  recommendationRuns,
  retailOffers,
  sampleProgramShops,
  samplePrograms,
  savedRackets,
  savedStringers,
  shops,
  stringJobs,
  stringSignals,
  strings,
  users,
  type BookingStatus,
  type RecommendationOutput,
  type TennisString,
  type UserTier,
} from "@shared/schema";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DEMO_RACKET_BRAND,
  DEMO_RETAILER,
  DEMO_SHOPS,
  DEMO_STRING_BRAND,
  DEMO_STRINGS,
  STRING_BRANDS,
  STRING_CATALOG,
} from "./b2b-seed-data";
import { invalidateCatalog, playerHash } from "./b2b";
import { log } from "./log";

/** Public string catalogue: add missing brands and strings, never delete or overwrite edits. */
export async function seedStrings(): Promise<void> {
  const existingBrands = await db.select().from(brands);
  const brandId = new Map(existingBrands.map((b) => [b.name, b.id]));
  for (const b of STRING_BRANDS) {
    if (brandId.has(b.name)) continue;
    const [row] = await db.insert(brands).values({ ...b, kind: "string", claimed: false }).onConflictDoNothing().returning();
    if (row) brandId.set(b.name, row.id);
  }
  const existing = await db.select({ brandName: strings.brandName, model: strings.model }).from(strings);
  const have = new Set(existing.map((s) => `${s.brandName}|${s.model}`));
  const missing = STRING_CATALOG.filter((s) => !have.has(`${s.brandName}|${s.model}`));
  if (missing.length) {
    await db.insert(strings).values(missing.map((s) => ({ ...s, brandId: brandId.get(s.brandName) ?? null }))).onConflictDoNothing();
    invalidateCatalog();
    log(`string catalogue: ${missing.length} added`, "seed");
  }
}

// ─── Demo data ──────────────────────────────────────────────────────────────

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

async function demoUser(email: string, firstName: string, lastName: string, tier: UserTier = "free") {
  const [found] = await db.select().from(users).where(eq(users.email, email));
  if (found) return found;
  const [u] = await db
    .insert(users)
    .values({ email, firstName, lastName, tier, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10), reminderEnabled: true })
    .returning();
  return u;
}

export async function seedDemo(): Promise<void> {
  const [already] = await db.select({ id: shops.id }).from(shops).where(eq(shops.slug, DEMO_SHOPS[0].slug));
  if (already) return;
  const rand = rng(10_15);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

  // Accounts
  const player = await demoUser(DEMO_ACCOUNTS.player, "Maya", "Okafor", "pro");
  const free = await demoUser(DEMO_ACCOUNTS.free, "Sam", "Rivera", "free");
  const brandOwner = await demoUser(DEMO_ACCOUNTS.brand, "Jordan", "Lee");
  const retailOwner = await demoUser(DEMO_RETAILER.email, "Priya", "Shah");
  const racketOwner = await demoUser(DEMO_RACKET_BRAND.email, "Theo", "Marsh");

  // Shops
  const shopRows = [];
  for (const s of DEMO_SHOPS) {
    const owner = await demoUser(s.email, s.name.split(" ")[0], "Stringer");
    const { email: _e, ...rest } = s;
    const [row] = await db.insert(shops).values({ ...rest, email: s.email, ownerUserId: owner.id, isDemo: true }).returning();
    shopRows.push(row);
  }
  const [baseline, netcord] = shopRows;

  // String brand
  const [northline] = await db
    .insert(brands)
    .values({ ...DEMO_STRING_BRAND, kind: "string", plan: "partner", claimed: true, ownerUserId: brandOwner.id, isDemo: true })
    .returning();
  await db.insert(strings).values(DEMO_STRINGS.map((s) => ({ ...s, brandId: northline.id }))).onConflictDoNothing();
  invalidateCatalog();
  const allStrings: TennisString[] = await db.select().from(strings);
  const byName = (brand: string, model: string) => allStrings.find((s) => s.brandName === brand && s.model === model)!;
  const ridgeSoft = byName("Northline", "Ridge Soft");
  const ridgeTour = byName("Northline", "Ridge Tour");
  const cloud = byName("Northline", "Cloud Multi");

  // Retailer + racket brand
  const { email: _r, ...retailer } = DEMO_RETAILER;
  const [courtside] = await db.insert(brands).values({ ...retailer, kind: "retailer", claimed: true, ownerUserId: retailOwner.id, isDemo: true }).returning();
  const { email: _k, ...racketBrand } = DEMO_RACKET_BRAND;
  await db.insert(brands).values({ ...racketBrand, kind: "racket", plan: "insights", claimed: true, ownerUserId: racketOwner.id, isDemo: true });

  const offerStrings = allStrings.filter((s) => s.setPriceCents).slice(0, 18);
  const offers = await db
    .insert(retailOffers)
    .values(
      offerStrings.map((s) => ({
        retailerId: courtside.id,
        stringId: s.id,
        priceCents: Math.round((s.setPriceCents ?? 1500) * (0.9 + rand() * 0.15)),
        url: `https://example.com/courtside/strings/${s.id}`,
        commissionPct: 6,
        inStock: rand() > 0.1,
      })),
    )
    .returning();

  // Sponsored campaigns and a sample programme
  const [softCampaign] = await db
    .insert(campaigns)
    .values({ brandId: northline.id, stringId: ridgeSoft.id, name: "Ridge Soft launch", headline: "Spin without the sting — try Ridge Soft", status: "active", cpcCents: 120, monthlyBudgetCents: 60000, levels: [] })
    .returning();
  await db.insert(campaigns).values({ brandId: northline.id, stringId: cloud.id, name: "Cloud Multi comfort", headline: "Plush feel that lasts longer than most multis", status: "active", cpcCents: 90, monthlyBudgetCents: 30000, levels: [] });
  const [program] = await db
    .insert(samplePrograms)
    .values({ brandId: northline.id, stringId: ridgeSoft.id, title: "Free Ridge Soft restring", pitch: "Northline covers the string and the labour. Rate it after three hits.", unitsTotal: 200, installFeeCents: 1800 })
    .returning();
  await db.insert(sampleProgramShops).values({ programId: program.id, shopId: baseline.id });

  // Player bag
  const [aero] = await db.insert(savedRackets).values({ userId: player.id, nickname: "Match racket", brand: "Babolat", model: "Pure Aero 98", headSize: "98", stringPattern: "16x20", hoursPerWeek: 5 }).returning();
  const [blade] = await db.insert(savedRackets).values({ userId: player.id, nickname: "Backup", brand: "Wilson", model: "Blade 98 v9", headSize: "98", stringPattern: "16x19", hoursPerWeek: 5 }).returning();
  const [freeRacket] = await db.insert(savedRackets).values({ userId: free.id, nickname: "My racket", brand: "Head", model: "Speed MP", headSize: "100", stringPattern: "16x19", hoursPerWeek: 3 }).returning();
  const [playerStringer] = await db
    .insert(savedStringers)
    .values({ userId: player.id, stringerName: baseline.name, stringerAddress: `${baseline.address}, ${baseline.city}`, phone: baseline.phone, shopId: baseline.id })
    .returning();
  const [freeStringer] = await db
    .insert(savedStringers)
    .values({ userId: free.id, stringerName: netcord.name, stringerAddress: `${netcord.address}, ${netcord.city}`, phone: netcord.phone, shopId: netcord.id })
    .returning();

  const hyperG = byName("Solinco", "Hyper-G");
  const rpm = byName("Babolat", "RPM Blast");
  const synth = byName("Prince", "Synthetic Gut Duraflex");

  async function pastBooking(opts: {
    shop: typeof baseline;
    user: typeof player | null;
    racket: typeof aero | null;
    name: string;
    racketLabel: string;
    string: TennisString;
    tension: number;
    at: Date;
    rating?: number | null;
    stringerId?: number | null;
    sampleProgramId?: number | null;
  }) {
    const labour = opts.shop.labourCents + (opts.sampleProgramId ? 0 : opts.string.setPriceCents ?? 0);
    const [b] = await db
      .insert(bookings)
      .values({
        shopId: opts.shop.id,
        playerUserId: opts.user?.id ?? null,
        savedRacketId: opts.racket?.id ?? null,
        customerName: opts.name,
        customerEmail: opts.user?.email ?? null,
        racketLabel: opts.racketLabel,
        stringId: opts.string.id,
        mains: `${opts.string.brandName} ${opts.string.model}`,
        gauge: "16L",
        tensionMains: opts.tension,
        tensionCrosses: opts.tension,
        dropOffAt: opts.at,
        dueAt: new Date(opts.at.getTime() + opts.shop.turnaroundHours * 3_600_000),
        status: "collected",
        statusLog: [
          { status: "requested", at: opts.at.toISOString() },
          { status: "ready", at: new Date(opts.at.getTime() + 20 * 3_600_000).toISOString() },
          { status: "collected", at: new Date(opts.at.getTime() + 30 * 3_600_000).toISOString() },
        ],
        priceCents: opts.sampleProgramId ? 0 : labour,
        rating: opts.rating ?? null,
        sampleProgramId: opts.sampleProgramId ?? null,
        source: opts.user ? "app" : "walk-in",
        shareHistory: !!opts.user,
        createdAt: opts.at,
        updatedAt: opts.at,
      })
      .returning();
    if (opts.user && opts.racket) {
      const [job] = await db
        .insert(stringJobs)
        .values({
          userId: opts.user.id,
          savedRacketId: opts.racket.id,
          stringerId: opts.stringerId ?? null,
          strungAt: new Date(opts.at.getTime() + 20 * 3_600_000),
          mains: b.mains,
          gauge: "16L",
          tensionMains: opts.tension,
          tensionCrosses: opts.tension,
          price: (b.priceCents ?? 0) / 100,
          rating: opts.rating ?? null,
          bookingId: b.id,
          stringId: opts.string.id,
          notes: `Strung by ${opts.shop.name}`,
        })
        .returning();
      await db.update(bookings).set({ stringJobId: job.id }).where(eq(bookings.id, b.id));
    }
    return b;
  }

  // Maya's history: an older job elsewhere (no booking), then Baseline.
  await db.insert(stringJobs).values({ userId: player.id, savedRacketId: aero.id, strungAt: daysAgo(80), mains: "Babolat RPM Blast", gauge: "17", tensionMains: 52, tensionCrosses: 50, price: 38, rating: 3, notes: "Old club stringer", stringId: rpm.id });
  await pastBooking({ shop: baseline, user: player, racket: aero, name: "Maya Okafor", racketLabel: "Match racket · Babolat Pure Aero 98", string: hyperG, tension: 50, at: daysAgo(50), rating: 4, stringerId: playerStringer.id });
  await pastBooking({ shop: baseline, user: player, racket: aero, name: "Maya Okafor", racketLabel: "Match racket · Babolat Pure Aero 98", string: ridgeSoft, tension: 49, at: daysAgo(24), rating: 5, stringerId: playerStringer.id, sampleProgramId: program.id });
  await pastBooking({ shop: baseline, user: player, racket: blade, name: "Maya Okafor", racketLabel: "Backup · Wilson Blade 98 v9", string: hyperG, tension: 51, at: daysAgo(40), rating: 4, stringerId: playerStringer.id });
  // Sam (free) last strung 70 days ago at Net Cord — the reminder is overdue.
  await pastBooking({ shop: netcord, user: free, racket: freeRacket, name: "Sam Rivera", racketLabel: "My racket · Head Speed MP", string: synth, tension: 55, at: daysAgo(70), rating: 4, stringerId: freeStringer.id });

  // Baseline's live queue
  const now = Date.now();
  const live: Array<{ name: string; racket: string; s: TennisString; t: number; status: BookingStatus; dueIn: number; rush?: boolean; user?: typeof player; racketRow?: typeof aero; note?: string }> = [
    { name: "Maya Okafor", racket: "Backup · Wilson Blade 98 v9", s: ridgeSoft, t: 50, status: "requested", dueIn: 26, user: player, racketRow: blade, note: "Same as my match racket please" },
    { name: "Daniel Kim", racket: "Yonex EZONE 100", s: byName("Yonex", "Poly Tour Pro"), t: 52, status: "accepted", dueIn: 30 },
    { name: "Aisha Bello", racket: "Head Speed Pro", s: byName("Luxilon", "ALU Power"), t: 48, status: "accepted", dueIn: 5, rush: true },
    { name: "Tom Hughes", racket: "Babolat Pure Drive", s: byName("Tecnifibre", "X-One Biphase"), t: 55, status: "in_progress", dueIn: 2 },
    { name: "Lena Fischer", racket: "Wilson Pro Staff 97", s: byName("Babolat", "Touch VS"), t: 56, status: "accepted", dueIn: 20 },
    { name: "Marco Rossi", racket: "Tecnifibre TF40 305", s: byName("Tecnifibre", "Razor Code"), t: 51, status: "ready", dueIn: -3 },
    { name: "Grace Park", racket: "Prince Phantom 100X", s: cloud, t: 54, status: "ready", dueIn: -1 },
  ];
  for (const j of live) {
    const drop = new Date(now - 6 * 3_600_000);
    await db.insert(bookings).values({
      shopId: baseline.id,
      playerUserId: j.user?.id ?? null,
      savedRacketId: j.racketRow?.id ?? null,
      customerName: j.name,
      customerEmail: j.user?.email ?? null,
      customerPhone: j.user ? null : "+1 555 01" + String(Math.floor(rand() * 90 + 10)),
      racketLabel: j.racket,
      stringId: j.s.id,
      mains: `${j.s.brandName} ${j.s.model}`,
      gauge: "16",
      tensionMains: j.t,
      tensionCrosses: j.t - (rand() > 0.6 ? 2 : 0),
      rush: !!j.rush,
      dropOffAt: drop,
      dueAt: new Date(now + j.dueIn * 3_600_000),
      status: j.status,
      statusLog: [{ status: "requested", at: drop.toISOString() }, ...(j.status !== "requested" ? [{ status: j.status, at: new Date(now - 3_600_000).toISOString() }] : [])],
      priceCents: baseline.labourCents + (j.s.setPriceCents ?? 0) + (j.rush ? baseline.rushCents : 0),
      notes: j.note ?? null,
      shareHistory: !!j.user,
      source: j.user ? "app" : "walk-in",
    });
  }

  // Six months of completed jobs at Baseline for shop insights.
  const regulars = ["Chris Doyle", "Nina Patel", "Owen Brooks", "Ivy Chen", "Ravi Menon", "Kate Moss", "Leo Grant", "Zoe Adams", "Ben Carter", "Mia Lopez"];
  const popular = [hyperG, rpm, ridgeSoft, byName("Luxilon", "ALU Power"), byName("Tecnifibre", "X-One Biphase"), cloud, byName("Head", "Lynx Tour")];
  for (let i = 0; i < 70; i++) {
    await pastBooking({
      shop: baseline,
      user: null,
      racket: null,
      name: pick(regulars),
      racketLabel: pick(["Babolat Pure Aero", "Wilson Blade 98", "Head Speed MP", "Yonex VCORE 100", "Prince Tour 100"]),
      string: pick(popular),
      tension: 46 + Math.floor(rand() * 10),
      at: daysAgo(2 + Math.floor(rand() * 175)),
      rating: rand() > 0.4 ? 3 + Math.floor(rand() * 3) : null,
      sampleProgramId: rand() > 0.85 ? program.id : null,
    });
  }

  // Recent recommendation runs, so brands can preview reach.
  type Tpl = { inputs: Record<string, unknown>; output: RecommendationOutput };
  const setup = (family: string, ex: string[], gauge: string, tension: string) => ({ stringFamily: family, exampleStrings: ex, gauge, tension });
  const templates: Tpl[] = [
    { inputs: { level: "advanced", playstyle: "baseliner", goals: ["Spin", "Control"], swingSpeed: "fast", injuryRisk: "none" }, output: { setup: { mains: setup("Polyester", ["Solinco Hyper-G 17", "Babolat RPM Blast 17"], "17", "50") }, alternatives: [setup("Polyester", ["Luxilon ALU Power 125"], "16L", "49"), setup("Hybrid", ["Luxilon ALU Power / Babolat Touch VS"], "16/16", "50/52")], explanation: "", warnings: [], confidenceReason: "" } },
    { inputs: { level: "intermediate", playstyle: "all-court", goals: ["Comfort", "Spin"], swingSpeed: "medium", injuryRisk: "none" }, output: { setup: { mains: setup("Soft polyester", ["Luxilon Element 125", "Head Lynx Tour 17"], "16L", "50") }, alternatives: [setup("Multifilament", ["Tecnifibre X-One Biphase 16"], "16", "54")], explanation: "", warnings: [], confidenceReason: "" } },
    { inputs: { level: "intermediate", playstyle: "defensive", goals: ["Comfort", "Power"], swingSpeed: "slow", injuryRisk: "elbow" }, output: { setup: { mains: setup("Multifilament", ["Tecnifibre NRG2 16", "Wilson NXT 16"], "16", "53") }, alternatives: [setup("Natural Gut", ["Babolat Touch VS 16"], "16", "55")], explanation: "", warnings: [], confidenceReason: "" } },
    { inputs: { level: "beginner", playstyle: "baseliner", goals: ["Power", "Durability"], swingSpeed: "slow", injuryRisk: "none" }, output: { setup: { mains: setup("Synthetic Gut", ["Prince Synthetic Gut Duraflex 16"], "16", "55") }, alternatives: [setup("Multifilament", ["Head Velocity MLT 16"], "16", "54")], explanation: "", warnings: [], confidenceReason: "" } },
    { inputs: { level: "advanced", playstyle: "aggressive", goals: ["Control", "Spin", "Comfort"], swingSpeed: "fast", injuryRisk: "shoulder" }, output: { setup: { mains: setup("Hybrid", ["Babolat Touch VS 16"], "16", "54"), crosses: setup("Soft polyester", ["Solinco Hyper-G Soft 17"], "17", "52") }, alternatives: [setup("Multifilament", ["Tecnifibre X-One Biphase 16"], "16", "53")], explanation: "", warnings: [], confidenceReason: "" } },
  ];
  for (let i = 0; i < 60; i++) {
    const t = templates[i % templates.length];
    await db.insert(recommendationRuns).values({ inputsJson: { racketId: null, ...t.inputs }, outputJson: t.output, confidence: "medium", createdAt: daysAgo(Math.floor(rand() * 30)) });
  }

  // Twelve weeks of anonymised signals for brand insights.
  const regions = ["Portland", "Seattle", "San Francisco", "Austin", "Boston", "Denver"];
  const levels = ["beginner", "intermediate", "advanced", "pro"];
  const styles = ["baseliner", "all-court", "aggressive", "defensive", "serve&volley"];
  const frames = ["Babolat", "Wilson", "Head", "Yonex", "Arcfield", "Arcfield", "Arcfield", "Tecnifibre"];
  const weighted: TennisString[] = [];
  for (const s of allStrings) {
    const w = s.brandName === "Northline" ? 3 : ["Hyper-G", "RPM Blast", "ALU Power", "X-One Biphase", "Lynx Tour", "NXT"].includes(s.model) ? 5 : 2;
    for (let k = 0; k < w; k++) weighted.push(s);
  }
  const signals: Array<typeof stringSignals.$inferInsert> = [];
  for (let p = 0; p < 420; p++) {
    const hash = playerHash(`demo-${p}`);
    const level = pick(levels);
    const playstyle = pick(styles);
    const region = pick(regions);
    const racketBrand = pick(frames);
    let current = pick(weighted);
    let t = 5 + Math.floor(rand() * 75);
    const sessions = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < sessions && t > 0; k++) {
      const at = daysAgo(t);
      // Northline grows over the window (launch effect).
      if (rand() < 0.12 * (1 - t / 90)) current = pick([ridgeSoft, ridgeTour, cloud]);
      signals.push({ stringId: current.id, kind: "recommended", playerHash: hash, level, playstyle, region, racketBrand, createdAt: at });
      if (rand() < 0.5) signals.push({ stringId: pick(weighted).id, kind: "alternative", playerHash: hash, level, playstyle, region, racketBrand, createdAt: at });
      if (rand() < 0.3) signals.push({ stringId: current.id, kind: "affiliate_click", playerHash: hash, createdAt: at });
      if (rand() < 0.55) {
        signals.push({ stringId: current.id, kind: "booked", playerHash: hash, region, createdAt: at });
        signals.push({ stringId: current.id, kind: "installed", playerHash: hash, region, createdAt: new Date(at.getTime() + DAY) });
        if (rand() < 0.7) {
          const base = current.brandName === "Northline" ? 4.3 : 3.8;
          signals.push({ stringId: current.id, kind: "rated", playerHash: hash, region, rating: Math.max(1, Math.min(5, Math.round(base + (rand() - 0.5) * 2))), createdAt: new Date(at.getTime() + 5 * DAY) });
        }
      }
      // Next restring: loyal ~60% of the time.
      if (rand() > 0.6) current = pick(weighted);
      t -= 14 + Math.floor(rand() * 20);
    }
  }
  for (let i = 0; i < signals.length; i += 500) await db.insert(stringSignals).values(signals.slice(i, i + 500));

  // Campaign history this month and last.
  const softRuns = await db.select({ id: recommendationRuns.id }).from(recommendationRuns).limit(60);
  for (let i = 0; i < softRuns.length; i++) {
    const at = daysAgo(Math.floor(rand() * 20));
    await db.insert(campaignEvents).values({ campaignId: softCampaign.id, runId: softRuns[i].id, kind: "impression", fitScore: 72 + Math.floor(rand() * 18), createdAt: at });
    if (rand() < 0.18) await db.insert(campaignEvents).values({ campaignId: softCampaign.id, runId: softRuns[i].id, kind: "click", costCents: softCampaign.cpcCents, fitScore: 80, createdAt: at });
  }
  void offers;
  void and;
  log(`demo data seeded (${signals.length} signals)`, "seed");
}
