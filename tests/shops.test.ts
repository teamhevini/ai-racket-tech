import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getApp, makeShop, request, signUp } from "./helpers";
import { db } from "../server/db";
import { bookings, strings } from "../shared/schema";
import { setStripeForTests, applyBusinessCheckout } from "../server/routes/billing";
import { FREE_SHOP_MONTHLY_BOOKINGS } from "../shared/tiers";

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

async function playerWithRacket() {
  const p = await signUp();
  const racket = (await p.agent.post("/api/bag/rackets").send({ nickname: "Match", brand: "Babolat", model: "Pure Aero" })).body;
  return { ...p, racket };
}

async function anyString() {
  await getApp();
  const [s] = await db.select().from(strings).where(eq(strings.model, "Hyper-G"));
  return s;
}

describe("stringer shops", () => {
  it("opens a shop with a public profile; one shop per account", async () => {
    const { agent, shop } = await makeShop({ name: "Ace Strings" });
    expect(shop.slug).toMatch(/^ace-strings/);
    const app = await getApp();
    const pub = await request(app).get(`/api/shops/${shop.slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.name).toBe("Ace Strings");
    expect(pub.body).not.toHaveProperty("stripeCustomerId");
    expect(pub.body).not.toHaveProperty("ownerUserId");
    expect((await request(app).get("/api/shops?q=ace")).body.some((s: { slug: string }) => s.slug === shop.slug)).toBe(true);
    expect((await agent.post("/api/shop").send({ name: "Second" })).status).toBe(409);
    const me = (await agent.get("/api/auth/me")).body;
    expect(me.shop.slug).toBe(shop.slug);
  });

  it("requires a login to manage a shop and keeps queues private", async () => {
    const app = await getApp();
    expect((await request(app).get("/api/shop/queue")).status).toBe(401);
    const a = await makeShop();
    const b = await makeShop();
    const p = await playerWithRacket();
    const booking = (await p.agent.post(`/api/shops/${a.shop.slug}/bookings`).send({ savedRacketId: p.racket.id, dropOffAt: tomorrow() })).body;
    expect((await b.agent.get(`/api/shop/bookings/${booking.id}`)).status).toBe(404);
    expect((await b.agent.post(`/api/shop/bookings/${booking.id}/status`).send({ status: "accepted" })).status).toBe(404);
    const other = await signUp();
    expect((await other.agent.get(`/api/bookings/${booking.id}`)).status).toBe(404);
  });
});

describe("booking a restring end to end", () => {
  it("player books → stringer works the queue → job lands in the player's bag", async () => {
    const s = await anyString();
    const { agent: shopAgent, shop } = await makeShop();
    const p = await playerWithRacket();

    const booked = await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({
      savedRacketId: p.racket.id,
      stringId: s.id,
      tensionMains: 52,
      tensionCrosses: 50,
      rush: true,
      dropOffAt: tomorrow(),
      notes: "Grip is worn too",
    });
    expect(booked.status).toBe(201);
    expect(booked.body.status).toBe("requested");
    expect(booked.body.mains).toBe("Solinco Hyper-G");
    expect(booked.body.priceCents).toBe(2000 + 1000 + (s.setPriceCents ?? 0));
    expect(booked.body.racketLabel).toContain("Match");

    const queue = (await shopAgent.get("/api/shop/queue")).body;
    expect(queue.map((b: { id: number }) => b.id)).toContain(booked.body.id);

    // Invalid jumps are refused.
    const skip = await shopAgent.post(`/api/shop/bookings/${booked.body.id}/status`).send({ status: "collected" });
    expect(skip.status).toBe(409);

    for (const status of ["accepted", "in_progress"]) {
      expect((await shopAgent.post(`/api/shop/bookings/${booked.body.id}/status`).send({ status })).status).toBe(200);
    }
    await shopAgent.patch(`/api/shop/bookings/${booked.body.id}`).send({ shopNotes: "Replaced two grommets" });
    // Internal notes stay hidden until the racket is ready.
    expect((await p.agent.get(`/api/bookings/${booked.body.id}`)).body.shopNotes).toBeNull();
    const ready = await shopAgent.post(`/api/shop/bookings/${booked.body.id}/status`).send({ status: "ready" });
    expect(ready.status).toBe(200);
    expect(ready.body.stringJobId).toBeTruthy();

    const mine = (await p.agent.get(`/api/bookings/${booked.body.id}`)).body;
    expect(mine.status).toBe("ready");
    expect(mine.shopNotes).toBe("Replaced two grommets");
    expect(mine.statusLog.map((l: { status: string }) => l.status)).toEqual(["requested", "accepted", "in_progress", "ready"]);

    // The job is in the player's own racket history, linked to the shop.
    const detail = (await p.agent.get(`/api/bag/rackets/${p.racket.id}`)).body;
    expect(detail.totalJobs).toBe(1);
    expect(detail.history[0].mains).toBe("Solinco Hyper-G");
    expect(detail.history[0].tensionMains).toBe(52);
    expect(detail.history[0].stringer.shopId).toBe(shop.id);
    expect(detail.racket.reminder.status).toBe("fresh");

    // Ready twice doesn't create a second job.
    await shopAgent.post(`/api/shop/bookings/${booked.body.id}/status`).send({ status: "in_progress" });
    await shopAgent.post(`/api/shop/bookings/${booked.body.id}/status`).send({ status: "ready" });
    expect((await p.agent.get(`/api/bag/rackets/${p.racket.id}`)).body.totalJobs).toBe(1);

    // Rating flows to the history entry.
    const rated = await p.agent.post(`/api/bookings/${booked.body.id}/rate`).send({ rating: 5 });
    expect(rated.status).toBe(200);
    expect((await p.agent.get(`/api/bag/rackets/${p.racket.id}`)).body.history[0].rating).toBe(5);

    await shopAgent.post(`/api/shop/bookings/${booked.body.id}/status`).send({ status: "collected" });
    const done = (await shopAgent.get("/api/shop/queue?view=done")).body;
    expect(done.map((b: { id: number }) => b.id)).toContain(booked.body.id);

    // Next time the reminder fires, 10IS suggests this shop with the same setup.
    const suggest = (await p.agent.get(`/api/bookings/suggest?racketId=${p.racket.id}`)).body;
    expect(suggest.shop.slug).toBe(shop.slug);
    expect(suggest.prefill.tensionMains).toBe(52);
    expect(suggest.prefill.stringId).toBe(s.id);
  });

  it("validates bookings", async () => {
    const { shop } = await makeShop();
    const p = await playerWithRacket();
    const app = await getApp();
    expect((await request(app).post(`/api/shops/${shop.slug}/bookings`).send({ dropOffAt: tomorrow(), racketLabel: "x" })).status).toBe(401);
    const past = await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ racketLabel: "Pure Drive", dropOffAt: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    expect(past.status).toBe(400);
    const noRacket = await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ dropOffAt: tomorrow() });
    expect(noRacket.status).toBe(400);
    const stranger = await playerWithRacket();
    const notMine = await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ savedRacketId: stranger.racket.id, dropOffAt: tomorrow() });
    expect(notMine.status).toBe(400);
  });

  it("players can cancel before stringing starts, not after", async () => {
    const { agent: shopAgent, shop } = await makeShop();
    const p = await playerWithRacket();
    const a = (await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ savedRacketId: p.racket.id, dropOffAt: tomorrow() })).body;
    expect((await p.agent.post(`/api/bookings/${a.id}/cancel`)).body.status).toBe("cancelled");
    const b = (await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ savedRacketId: p.racket.id, dropOffAt: tomorrow() })).body;
    await shopAgent.post(`/api/shop/bookings/${b.id}/status`).send({ status: "accepted" });
    await shopAgent.post(`/api/shop/bookings/${b.id}/status`).send({ status: "in_progress" });
    expect((await p.agent.post(`/api/bookings/${b.id}/cancel`)).status).toBe(409);
    expect((await p.agent.post(`/api/bookings/${b.id}/rate`).send({ rating: 4 })).status).toBe(409);
  });

  it("walk-ins go straight into the queue", async () => {
    const s = await anyString();
    const { agent, shop } = await makeShop();
    const w = await agent.post("/api/shop/walk-ins").send({ customerName: "Pat", customerPhone: "555", racketLabel: "Head Speed", stringId: s.id, tensionMains: 54 });
    expect(w.status).toBe(201);
    expect(w.body.status).toBe("accepted");
    expect(w.body.tensionCrosses).toBe(54);
    expect(w.body.shopId).toBe(shop.id);
    expect((await agent.post("/api/shop/walk-ins").send({ racketLabel: "x" })).status).toBe(400);
  });
});

describe("customer racket history and consent", () => {
  async function bookAndFinish(shopAgent: Awaited<ReturnType<typeof makeShop>>["agent"], slug: string, p: Awaited<ReturnType<typeof playerWithRacket>>, share: boolean) {
    const b = (await p.agent.post(`/api/shops/${slug}/bookings`).send({ savedRacketId: p.racket.id, dropOffAt: tomorrow(), shareHistory: share, tensionMains: 50 })).body;
    return b;
  }

  it("shows the full racket history only on Shop Pro and only with the player's consent", async () => {
    const p = await playerWithRacket();
    await p.agent.post(`/api/bag/rackets/${p.racket.id}/jobs`).send({ strungAt: new Date(Date.now() - 40 * 86_400_000).toISOString(), mains: "Old String", tensionMains: 55, notes: "private note" });

    const free = await makeShop();
    const fb = await bookAndFinish(free.agent, free.shop.slug, p, true);
    expect((await free.agent.get(`/api/shop/bookings/${fb.id}`)).body.historyState).toBe("locked");

    const pro = await makeShop({ pro: true });
    const pb = await bookAndFinish(pro.agent, pro.shop.slug, p, true);
    const shared = (await pro.agent.get(`/api/shop/bookings/${pb.id}`)).body;
    expect(shared.historyState).toBe("shared");
    expect(shared.fullHistory[0].mains).toBe("Old String");
    expect(JSON.stringify(shared.fullHistory)).not.toContain("private note");

    const priv = await bookAndFinish(pro.agent, pro.shop.slug, p, false);
    const hidden = (await pro.agent.get(`/api/shop/bookings/${priv.id}`)).body;
    expect(hidden.historyState).toBe("not-shared");
    expect(hidden.fullHistory).toBeNull();
  });

  it("lists regulars and, on Pro, who is due a restring", async () => {
    const pro = await makeShop({ pro: true });
    const p = await playerWithRacket();
    const b = (await p.agent.post(`/api/shops/${pro.shop.slug}/bookings`).send({ savedRacketId: p.racket.id, dropOffAt: tomorrow() })).body;
    for (const status of ["accepted", "ready"]) await pro.agent.post(`/api/shop/bookings/${b.id}/status`).send({ status });
    const list = (await pro.agent.get("/api/shop/customers")).body;
    expect(list.pro).toBe(true);
    expect(list.customers[0].jobs).toBe(1);
    expect(Array.isArray(list.customers[0].due)).toBe(true);
    const free = await makeShop();
    expect((await free.agent.get("/api/shop/customers")).body.customers).toEqual([]);
    expect((await free.agent.get("/api/shop/insights")).status).toBe(403);
    const ins = await pro.agent.get("/api/shop/insights");
    expect(ins.status).toBe(200);
    expect(ins.body.customers).toBe(1);
  });
});

describe("free shop limits and Shop Pro billing", () => {
  it(`caps free shops at ${FREE_SHOP_MONTHLY_BOOKINGS} app bookings a month`, async () => {
    const { shop } = await makeShop();
    const p = await playerWithRacket();
    await db.insert(bookings).values(
      Array.from({ length: FREE_SHOP_MONTHLY_BOOKINGS }, () => ({
        shopId: shop.id,
        playerUserId: p.user.id,
        customerName: "x",
        racketLabel: "x",
        dropOffAt: new Date(),
        dueAt: new Date(),
      })),
    );
    const res = await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ savedRacketId: p.racket.id, dropOffAt: tomorrow() });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/fully booked/);
  });

  it("explains when payments aren't configured", async () => {
    setStripeForTests(null);
    const { agent } = await makeShop();
    const res = await agent.post("/api/shop/checkout");
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/configured/);
  });

  it("upgrades to Shop Pro through Stripe test mode (fake client)", async () => {
    const owner = await makeShop();
    const created: Array<Record<string, any>> = [];
    const fakeSession = (shopId: number) => ({ id: "cs_test_shop", payment_status: "paid", customer: "cus_shop", subscription: "sub_shop", metadata: { kind: "shop", shopId: String(shopId) } });
    setStripeForTests({
      checkout: {
        sessions: {
          create: async (args: Record<string, any>) => {
            created.push(args);
            return { url: "https://checkout.stripe.test/shop" };
          },
          retrieve: async () => fakeSession(owner.shop.id),
        },
      },
    } as any);
    const co = await owner.agent.post("/api/shop/checkout");
    expect(co.status).toBe(200);
    expect(co.body.url).toContain("checkout.stripe.test");
    expect(created[0].mode).toBe("subscription");
    expect(created[0].line_items[0].price_data.unit_amount).toBe(1900);
    expect(created[0].metadata).toMatchObject({ kind: "shop", shopId: String(owner.shop.id) });

    const intruder = await makeShop();
    expect((await intruder.agent.post("/api/shop/checkout/verify").send({ session_id: "cs_test_shop" })).status).toBe(403);
    const ok = await owner.agent.post("/api/shop/checkout/verify").send({ session_id: "cs_test_shop" });
    expect(ok.status).toBe(200);
    expect(ok.body.shop.plan).toBe("pro");
    expect(ok.body.shop.stripeSubscriptionId).toBe("sub_shop");
    setStripeForTests(null);

    // The webhook path does the same for a shop whose browser never came back.
    const late = await makeShop();
    await applyBusinessCheckout({ payment_status: "paid", customer: "cus_x", subscription: "sub_x", metadata: { kind: "shop", shopId: String(late.shop.id) } } as any);
    expect((await late.agent.get("/api/shop/me")).body.shop.plan).toBe("pro");
  });
});

describe("booking the AI's setup", () => {
  it("links free-text strings from a recommendation to the catalogue for pricing", async () => {
    const { shop } = await makeShop();
    const p = await signUp();
    const res = await p.agent.post(`/api/shops/${shop.slug}/bookings`).send({ racketLabel: "Pure Aero", mains: "Solinco Hyper-G 17", tensionMains: 50, dropOffAt: tomorrow() });
    expect(res.status).toBe(201);
    expect(res.body.mains).toBe("Solinco Hyper-G 17");
    const [hyper] = await db.select().from(strings).where(eq(strings.model, "Hyper-G"));
    expect(res.body.stringId).toBe(hyper.id);
    expect(res.body.priceCents).toBe(2000 + (hyper.setPriceCents ?? 0));
  });
});

describe("rebooking a hand-logged setup", () => {
  it("resolves the last job's string text to the catalogue so the price estimate is right", async () => {
    const p = await signUp();
    const racket = (await p.agent.post("/api/bag/rackets").send({ nickname: "R" })).body;
    await p.agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: new Date(Date.now() - 30 * 86_400_000).toISOString(), mains: "Wilson NXT", tensionMains: 53 });
    const [nxt] = await db.select().from(strings).where(eq(strings.model, "NXT"));
    const s = (await p.agent.get(`/api/bookings/suggest?racketId=${racket.id}`)).body;
    expect(s.prefill.stringId).toBe(nxt.id);
  });
});
