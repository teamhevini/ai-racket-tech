import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getApp, makeBrand, makeShop, request, signUp } from "./helpers";
import { db } from "../server/db";
import { affiliateClicks, brands, strings, stringSignals } from "../shared/schema";
import { setStripeForTests } from "../server/routes/billing";
import { playerHash } from "../server/b2b";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../server/b2b-seed-data";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

beforeAll(async () => {
  await getApp({ demo: true });
});

describe("brand accounts", () => {
  it("creates a brand but can't take over a listed one", async () => {
    const b = await makeBrand();
    expect((await b.agent.get("/api/auth/me")).body.brand.id).toBe(b.brand.id);
    const other = await signUp();
    const hijack = await other.agent.post("/api/brand").send({ name: "Luxilon" });
    expect(hijack.status).toBe(409);
    expect(hijack.body.message).toMatch(/partners@10is.app/);
    const app = await getApp();
    const lux = (await request(app).get("/api/brands/luxilon")).body;
    expect(lux.verified).toBe(false);
    expect(lux.strings.length).toBeGreaterThan(0);
  });

  it("lets brands manage their catalogue but never the lab scores that drive the fit check", async () => {
    const b = await makeBrand();
    const s = await b.agent.post("/api/brand/strings").send({ model: "Test Poly", family: "polyester", gauges: "16, 17", setPriceCents: 1500 });
    expect(s.status).toBe(201);
    expect(s.body.stiffness).toBeNull();
    // Scores aren't accepted from brands on create (silently dropped) or edit (rejected).
    const sneaky = await b.agent.post("/api/brand/strings").send({ model: "Sneaky", family: "polyester", comfort: 10, stiffness: 120 });
    expect(sneaky.body.comfort).toBeNull();
    expect(sneaky.body.stiffness).toBeNull();
    const edit = await b.agent.patch(`/api/brand/strings/${s.body.id}`).send({ comfort: 10 });
    expect(edit.status).toBe(400);
    const ok = await b.agent.patch(`/api/brand/strings/${s.body.id}`).send({ description: "Soft and spinny" });
    expect(ok.status).toBe(200);
    // Other brands can't edit it; non-admins can't use the admin route.
    const rival = await makeBrand();
    expect((await rival.agent.patch(`/api/brand/strings/${s.body.id}`).send({ description: "x" })).status).toBe(404);
    expect((await b.agent.patch(`/api/admin/strings/${s.body.id}`).send({ comfort: 10 })).status).toBe(403);
  });

  it("campaigns must promote the brand's own strings, at or above the minimum bid", async () => {
    const b = await makeBrand({ verified: true });
    const [lux] = await db.select().from(strings).where(eq(strings.brandName, "Luxilon"));
    expect((await b.agent.post("/api/brand/campaigns").send({ stringId: lux.id, name: "x", headline: "Steal", cpcCents: 100, monthlyBudgetCents: 10000 })).status).toBe(400);
    const s = (await b.agent.post("/api/brand/strings").send({ model: "Own", family: "multifilament" })).body;
    expect((await b.agent.post("/api/brand/campaigns").send({ stringId: s.id, name: "x", headline: "Cheap", cpcCents: 10, monthlyBudgetCents: 10000 })).status).toBe(400);
    const c = await b.agent.post("/api/brand/campaigns").send({ stringId: s.id, name: "x", headline: "Fair bid", cpcCents: 100, monthlyBudgetCents: 10000, levels: ["beginner"] });
    expect(c.status).toBe(201);
    const paused = await b.agent.patch(`/api/brand/campaigns/${c.body.id}`).send({ status: "paused" });
    expect(paused.body.status).toBe("paused");
  });

  it("previews fit reach before spending", async () => {
    const b = await makeBrand();
    const s = (await b.agent.post("/api/brand/strings").send({ model: "Reach Multi", family: "multifilament" })).body;
    const reach = (await b.agent.get(`/api/brand/strings/${s.id}/reach`)).body;
    expect(reach.sampled).toBeGreaterThan(0);
    expect(reach.specsPending).toBe(true);
    expect(reach.eligible + reach.heldBack.reduce((a: number, r: { n: number }) => a + r.n, 0)).toBe(reach.sampled);
  });
});

describe("insights", () => {
  it("are a paid feature", async () => {
    const free = await makeBrand();
    const res = await free.agent.get("/api/brand/insights");
    expect(res.status).toBe(403);
    expect(res.body.upgrade).toBe(true);
  });

  it("suppress any group with fewer than 5 players", async () => {
    const b = await makeBrand({ plan: "insights" });
    const s = (await b.agent.post("/api/brand/strings").send({ model: "Tiny Sample", family: "polyester" })).body;
    // Three players rate it — not enough to show anything.
    await db.insert(stringSignals).values(
      [1, 2, 3].flatMap((i) => [
        { stringId: s.id, kind: "recommended", playerHash: playerHash(`k-${i}`), level: "advanced" },
        { stringId: s.id, kind: "rated", playerHash: playerHash(`k-${i}`), rating: 5 },
      ]),
    );
    const data = (await b.agent.get("/api/brand/insights")).body.data;
    const row = data.ratings.find((r: { stringId: number }) => r.stringId === s.id);
    expect(row.avg).toBeNull();
    expect(data.funnel.find((f: { stage: string }) => f.stage === "recommended").players).toBeNull();
    expect(data.kAnonymity).toBe(5);
    // Two more players cross the threshold.
    await db.insert(stringSignals).values(
      [4, 5].flatMap((i) => [
        { stringId: s.id, kind: "recommended", playerHash: playerHash(`k-${i}`), level: "advanced" },
        { stringId: s.id, kind: "rated", playerHash: playerHash(`k-${i}`), rating: 4 },
      ]),
    );
    const after = (await b.agent.get("/api/brand/insights")).body.data;
    expect(after.ratings.find((r: { stringId: number }) => r.stringId === s.id).avg).toBe(4.6);
    expect(after.funnel.find((f: { stage: string }) => f.stage === "recommended").players).toBe(5);
    // No raw identifiers leave the server.
    expect(JSON.stringify(after)).not.toContain(playerHash("k-1")!);
  });

  it("hides any week of the demand chart with fewer than 5 players", async () => {
    const b = await makeBrand({ plan: "insights" });
    const s = (await b.agent.post("/api/brand/strings").send({ model: `Weekly ${Date.now()}`, family: "polyester" })).body;
    // This week: 3 players pick it — too few to show.
    await db.insert(stringSignals).values([1, 2, 3].map((i) => ({ stringId: s.id, kind: "recommended", playerHash: playerHash(`w-${s.id}-${i}`) })));
    const before = (await b.agent.get("/api/brand/insights")).body.data.weekly.at(-1);
    expect(before.share).toBeNull();
    expect(before.recommended).toBeNull();
    expect(before.total).toBeNull();
    await db.insert(stringSignals).values([4, 5].map((i) => ({ stringId: s.id, kind: "recommended", playerHash: playerHash(`w-${s.id}-${i}`) })));
    const after = (await b.agent.get("/api/brand/insights")).body.data.weekly.at(-1);
    expect(after.recommended).toBe(5);
    expect(after.share).toBeGreaterThan(0);
  });

  it("keeps free-sample ratings out of organic ratings and the funnel", async () => {
    const b = await makeBrand({ plan: "insights" });
    const s = (await b.agent.post("/api/brand/strings").send({ model: `Sampled ${Date.now()}`, family: "multifilament" })).body;
    const rows = [1, 2, 3, 4, 5, 6].flatMap((i) => [
      { stringId: s.id, kind: "installed", playerHash: playerHash(`s-${s.id}-${i}`), sampled: true },
      { stringId: s.id, kind: "rated", rating: 5, playerHash: playerHash(`s-${s.id}-${i}`), sampled: true },
    ]);
    await db.insert(stringSignals).values(rows);
    const data = (await b.agent.get("/api/brand/insights")).body.data;
    expect(data.ratings.find((r: { stringId: number }) => r.stringId === s.id).avg).toBeNull();
    expect(data.funnel.find((f: { stage: string }) => f.stage === "installed").players).toBeNull();
  });

  it("the demo string brand has a populated dashboard", async () => {
    const app = await getApp();
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: DEMO_ACCOUNTS.brand, password: DEMO_PASSWORD });
    expect(login.status).toBe(200);
    const res = await agent.get("/api/brand/insights");
    expect(res.status).toBe(200);
    expect(res.body.data.weekly).toHaveLength(12);
    expect(res.body.data.weekly.some((w: { recommended: number | null }) => (w.recommended ?? 0) > 0)).toBe(true);
    expect(res.body.data.retention.rate).not.toBeNull();
    const camps = (await agent.get("/api/brand/campaigns")).body;
    expect(camps.length).toBeGreaterThan(0);
  });

  it("racket brands see string pairings for their frames", async () => {
    const app = await getApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: DEMO_ACCOUNTS.racketBrand, password: DEMO_PASSWORD });
    const res = await agent.get("/api/brand/insights");
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe("racket");
    expect(res.body.data.pairings.length).toBeGreaterThan(0);
  });
});

describe("sample programmes through partner stringers", () => {
  it("brand funds samples; players claim them free at partner shops, once", async () => {
    const b = await makeBrand();
    const s = (await b.agent.post("/api/brand/strings").send({ model: "Sample Poly", family: "polyester", setPriceCents: 1500 })).body;
    const shop = await makeShop({ pro: true });
    const payload = { stringId: s.id, title: "Free restring", unitsTotal: 10, installFeeCents: 1800, shopIds: [shop.shop.id] };
    expect((await b.agent.post("/api/brand/programs").send(payload)).status).toBe(403); // Partner plan only
    await db.update(brands).set({ plan: "partner" }).where(eq(brands.id, b.brand.id));
    const prog = await b.agent.post("/api/brand/programs").send(payload);
    expect(prog.status).toBe(201);

    const pub = (await request(await getApp()).get(`/api/shops/${shop.shop.slug}`)).body;
    expect(pub.samplePrograms[0].id).toBe(prog.body.id);

    const p = await signUp();
    const racket = (await p.agent.post("/api/bag/rackets").send({ nickname: "R" })).body;
    const claim = await p.agent.post(`/api/shops/${shop.shop.slug}/bookings`).send({ savedRacketId: racket.id, stringId: s.id, sampleProgramId: prog.body.id, dropOffAt: tomorrow() });
    expect(claim.status).toBe(201);
    expect(claim.body.priceCents).toBe(0);
    expect(claim.body.source).toBe("sample");
    const again = await p.agent.post(`/api/shops/${shop.shop.slug}/bookings`).send({ savedRacketId: racket.id, sampleProgramId: prog.body.id, dropOffAt: tomorrow() });
    expect(again.status).toBe(409);

    // Not available at a shop outside the programme.
    const elsewhere = await makeShop();
    const wrongShop = await p.agent.post(`/api/shops/${elsewhere.shop.slug}/bookings`).send({ racketLabel: "R", sampleProgramId: prog.body.id, dropOffAt: tomorrow() });
    expect(wrongShop.status).toBe(400);

    // Stringer sees the sample and its payout (install fee minus the 20% platform fee).
    const job = (await shop.agent.get(`/api/shop/bookings/${claim.body.id}`)).body;
    expect(job.sample.payoutCents).toBe(1440);
    for (const status of ["accepted", "ready"]) await shop.agent.post(`/api/shop/bookings/${claim.body.id}/status`).send({ status });
    const stats = (await b.agent.get("/api/brand/programs")).body.programs[0].stats;
    expect(stats.claimed).toBe(1);
    expect(stats.installed).toBe(1);
    // The install and the player's rating are tagged as sampled.
    await p.agent.post(`/api/bookings/${claim.body.id}/rate`).send({ rating: 5 });
    const tagged = await db.select().from(stringSignals).where(eq(stringSignals.stringId, s.id));
    expect(tagged.filter((t) => ["installed", "rated"].includes(t.kind)).every((t) => t.sampled)).toBe(true);
    expect(tagged.some((t) => t.kind === "rated")).toBe(true);
  });

  it("only Shop Pro stringers can join programmes", async () => {
    const free = await makeShop();
    const list = (await free.agent.get("/api/shop/programs")).body;
    expect(list.programs.length).toBeGreaterThan(0);
    expect((await free.agent.post(`/api/shop/programs/${list.programs[0].id}/join`)).status).toBe(403);
    const pro = await makeShop({ pro: true });
    expect((await pro.agent.post(`/api/shop/programs/${list.programs[0].id}/join`)).body.joined).toBe(true);
  });
});

describe("retailers and affiliate tracking", () => {
  it("lists offers cheapest first regardless of commission, and tracks outbound clicks", async () => {
    const [s] = await db.select().from(strings).where(eq(strings.model, "NXT"));
    const r1 = await makeBrand({ kind: "retailer", verified: true, website: "https://shop-one.example.com" });
    const r2 = await makeBrand({ kind: "retailer", verified: true, website: "https://www.shop-two.example.com" });
    expect((await r1.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1900, url: "https://shop-one.example.com/nxt", commissionPct: 30 })).status).toBe(201);
    expect((await r2.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1500, url: "https://shop-two.example.com/nxt", commissionPct: 1 })).status).toBe(201);
    expect((await r1.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1900, url: "http://shop-one.example.com/x" })).status).toBe(400);
    // Links must stay on the retailer's own site.
    const offsite = await r1.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1900, url: "https://evil.example.net/login" });
    expect(offsite.status).toBe(400);
    expect(offsite.body.field).toBe("url");
    expect((await r1.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1900, url: "https://shop-one.example.com.evil.net/x" })).status).toBe(400);
    // String companies can't post retail offers.
    const sb = await makeBrand();
    expect((await sb.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 100, url: "https://x.example.com" })).status).toBe(403);

    const app = await getApp();
    const detail = (await request(app).get(`/api/strings/${s.id}`)).body;
    const mine = detail.offers.filter((o: { retailer: string }) => [r1.brand.name, r2.brand.name].includes(o.retailer));
    expect(mine.map((o: { retailer: string }) => o.retailer)).toEqual([r2.brand.name, r1.brand.name]);
    expect(detail.offers[0]).not.toHaveProperty("commissionPct");

    const offerId = mine[0].id;
    const go = await request(app).get(`/api/go/offer/${offerId}?src=string-page`);
    expect(go.status).toBe(302);
    const url = new URL(go.headers.location);
    expect(url.hostname).toBe("shop-two.example.com");
    const code = url.searchParams.get("ref")!;
    const [click] = await db.select().from(affiliateClicks).where(eq(affiliateClicks.code, code));
    expect(click.destination).toBe("retailer");

    // Retailer postback attributes a sale.
    process.env.AFFILIATE_POSTBACK_SECRET = "test-secret";
    expect((await request(app).post("/api/affiliate/postback").send({ code, orderCents: 3000 })).status).toBe(401);
    const pb = await request(app).post("/api/affiliate/postback").set("Authorization", "Bearer test-secret").send({ code, orderCents: 3000 });
    expect(pb.body.commissionCents).toBe(30);
    delete process.env.AFFILIATE_POSTBACK_SECRET;
    const ins = (await r2.agent.get("/api/brand/insights")).body;
    expect(ins.kind).toBe("retailer");
    expect(ins.data.offers[0].orders).toBe(1);
  });

  it("shows where to buy the AI's pick", async () => {
    const app = await getApp();
    const run = await request(app).post("/api/recommend").send({ racketId: null, level: "advanced", goals: ["Spin"] });
    const wtb = (await request(app).get(`/api/recommendation-runs/${run.body.runId}/where-to-buy`)).body;
    expect(wtb.strings.length).toBeGreaterThan(0);
    expect(wtb.strings.map((s: { model: string }) => s.model)).toContain("ALU Power");
  });

  it("attributes a booking to the affiliate click that led to it", async () => {
    const shop = await makeShop();
    const app = await getApp();
    const [s] = await db.select().from(strings).where(eq(strings.model, "RPM Blast"));
    const code = `t${Date.now()}`;
    await db.insert(affiliateClicks).values({ code, stringId: s.id, source: "sponsored", destination: "booking" });
    const p = await signUp();
    const b = await p.agent.post(`/api/shops/${shop.shop.slug}/bookings`).send({ racketLabel: "Pure Aero", stringId: s.id, affiliateCode: code, dropOffAt: tomorrow() });
    expect(b.status).toBe(201);
    const [click] = await db.select().from(affiliateClicks).where(eq(affiliateClicks.code, code));
    expect(click.convertedAt).not.toBeNull();
    expect(click.orderCents).toBe(b.body.priceCents);
    void app;
  });
});

describe("verification gates on anything that reaches players", () => {
  it("unverified retailers can't publish links, and a retailer that loses verification stops redirecting", async () => {
    const [s] = await db.select().from(strings).where(eq(strings.model, "Revolve"));
    const unverified = await makeBrand({ kind: "retailer", website: "https://new-store.example.com" });
    const blocked = await unverified.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1200, url: "https://new-store.example.com/revolve" });
    expect(blocked.status).toBe(403);

    const r = await makeBrand({ kind: "retailer", verified: true, website: "https://legit.example.com" });
    const offer = await r.agent.post("/api/brand/offers").send({ stringId: s.id, priceCents: 1200, url: "https://legit.example.com/revolve" });
    expect(offer.status).toBe(201);
    const app = await getApp();
    expect((await request(app).get(`/api/go/offer/${offer.body.id}`)).status).toBe(302);
    await db.update(brands).set({ claimed: false }).where(eq(brands.id, r.brand.id));
    expect((await request(app).get(`/api/go/offer/${offer.body.id}`)).status).toBe(404);
    const listed = (await request(app).get(`/api/strings/${s.id}`)).body.offers.map((o: { id: number }) => o.id);
    expect(listed).not.toContain(offer.body.id);
  });
});

describe("brand plan billing", () => {
  it("subscribes to Insights through Stripe test mode (fake client)", async () => {
    const b = await makeBrand();
    const created: Array<Record<string, any>> = [];
    setStripeForTests({
      checkout: {
        sessions: {
          create: async (args: Record<string, any>) => {
            created.push(args);
            return { url: "https://checkout.stripe.test/brand" };
          },
          retrieve: async () => ({ payment_status: "paid", customer: "cus_b", subscription: "sub_b", metadata: { kind: "brand", brandId: String(b.brand.id), plan: "insights" } }),
        },
      },
    } as any);
    expect((await b.agent.post("/api/brand/checkout/insights")).body.url).toContain("stripe.test");
    expect(created[0].line_items[0].price_data.unit_amount).toBe(69000);
    const v = await b.agent.post("/api/brand/checkout/verify").send({ session_id: "cs_b" });
    expect(v.body.brand.plan).toBe("insights");
    expect((await b.agent.get("/api/brand/insights")).status).toBe(200);
    setStripeForTests(null);
  });
});

describe("demo accounts", () => {
  it("seeds a player, a free player, a stringer, a brand, a retailer and a racket brand", async () => {
    const app = await getApp();
    for (const email of Object.values(DEMO_ACCOUNTS)) {
      const agent = request.agent(app);
      const res = await agent.post("/api/auth/login").set("X-Forwarded-For", `10.99.0.${email.length}`).send({ email, password: DEMO_PASSWORD });
      expect(res.status, email).toBe(200);
    }
    const stringer = request.agent(app);
    await stringer.post("/api/auth/login").set("X-Forwarded-For", "10.99.1.1").send({ email: DEMO_ACCOUNTS.stringer, password: DEMO_PASSWORD });
    const q = (await stringer.get("/api/shop/queue")).body;
    expect(q.length).toBeGreaterThanOrEqual(5);
  });
});

describe("demo reset (preview only)", () => {
  it("removes only demo-owned data and reseeds cleanly", async () => {
    const { resetDemo, seedDemo } = await import("../server/b2b-seed");
    const real = await makeShop();
    await resetDemo();
    expect((await db.select().from(brands).where(eq(brands.isDemo, true))).length).toBe(0);
    const app = await getApp();
    expect((await request(app).get(`/api/shops/${real.shop.slug}`)).status).toBe(200);
    expect((await request(app).get("/api/shops/baseline-stringworks")).status).toBe(404);
    await seedDemo();
    expect((await request(app).get("/api/shops/baseline-stringworks")).status).toBe(200);
  });
});
