import { describe, expect, it } from "vitest";
import { getApp, request, signUp, storage } from "./helpers";
import { setStripeForTests } from "../server/routes/billing";

describe("authentication", () => {
  it("no longer trusts a forged user_email cookie (v1 account-takeover bug)", async () => {
    const { email } = await signUp({ tier: "club" });
    const app = await getApp();
    const forged = await request(app).get("/api/auth/me").set("Cookie", `user_email=${encodeURIComponent(email)}`);
    expect(forged.body.email).toBeNull();
    const asAdmin = await request(app).get("/api/admin/users").set("Cookie", "user_email=contact%40hevini.com");
    expect(asAdmin.status).toBe(401);
    expect((await request(app).get("/api/bag").set("Cookie", `user_email=${email}`)).status).toBe(401);
  });

  it("signs up, logs out and logs back in", async () => {
    const { agent, email } = await signUp();
    expect((await agent.get("/api/auth/me")).body.email).toBe(email);
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).body.email).toBeNull();
    const bad = await agent.post("/api/auth/login").send({ email, password: "wrong-password" });
    expect(bad.status).toBe(401);
    const ok = await agent.post("/api/auth/login").send({ email: email.toUpperCase(), password: "correct-horse" });
    expect(ok.status).toBe(200);
    expect(ok.body.entitlements.fullHistory).toBe(false);
  });

  it("rejects duplicate and invalid sign-ups with a clear message", async () => {
    const { email } = await signUp();
    const app = await getApp();
    const dup = await request(app).post("/api/auth/signup").send({ email, password: "longenough", firstName: "A", lastName: "B" });
    expect(dup.status).toBe(409);
    const short = await request(app).post("/api/auth/signup").send({ email: "new@example.com", password: "short", firstName: "A", lastName: "B" });
    expect(short.status).toBe(400);
    expect(short.body.message).toMatch(/8 characters/);
  });

  it("reports paid entitlements for subscribers", async () => {
    const { agent } = await signUp({ tier: "club" });
    const me = (await agent.get("/api/auth/me")).body;
    expect(me.tier).toBe("club");
    expect(me.entitlements).toMatchObject({ isPaid: true, fullHistory: true, chat: true });
  });

  it("only lets admins into admin routes", async () => {
    const { agent, user } = await signUp();
    expect((await agent.get("/api/admin/users")).status).toBe(403);
    await storage.updateUser(user.id, { isAdmin: true });
    expect((await agent.get("/api/admin/users")).status).toBe(200);
  });

  it("keeps the AI chat behind Club and scoped to the owner", async () => {
    const free = await signUp();
    expect((await free.agent.get("/api/conversations")).status).toBe(403);
    const club = await signUp({ tier: "club" });
    const conv = await club.agent.post("/api/conversations").send({ title: "Tension" });
    expect(conv.status).toBe(201);
    const otherClub = await signUp({ tier: "club" });
    expect((await otherClub.agent.get(`/api/conversations/${conv.body.id}`)).status).toBe(404);
    expect((await otherClub.agent.get("/api/conversations")).body).toHaveLength(0);
  });
});

describe("recommendation history", () => {
  it("saves runs to a signed-in player's history", async () => {
    const { agent } = await signUp({ tier: "pro" });
    const run = await agent.post("/api/recommend").send({ racketId: null, level: "intermediate", injuryRisk: "elbow" });
    expect(run.status).toBe(201);
    expect(run.body.recommendation.setup.mains.stringFamily).toBe("Multifilament"); // arm-safe fallback
    const history = (await agent.get("/api/account/recommendations")).body;
    expect(history.map((r: any) => r.id)).toContain(run.body.runId);
  });

  it("snapshots the racket name so history survives catalog updates", async () => {
    const { agent } = await signUp();
    const [racket] = await storage.searchRackets("Blade 98");
    const run = await agent.post("/api/recommend").send({ racketId: racket.id, level: "advanced" });
    const history = (await agent.get("/api/account/recommendations")).body;
    const entry = history.find((r: any) => r.id === run.body.runId);
    expect(entry.racketLabel).toBe(`${racket.brand} ${racket.model}`);
  });

  it("claims recommendations made before signing up", async () => {
    const app = await getApp();
    const agent = request.agent(app);
    const run = await agent.post("/api/recommend").send({ racketId: null });
    expect(run.status).toBe(201);
    await agent
      .post("/api/auth/signup")
      .send({ email: `late${Date.now()}@example.com`, password: "correct-horse", firstName: "Late", lastName: "Joiner" });
    const history = (await agent.get("/api/account/recommendations")).body;
    expect(history.map((r: any) => r.id)).toContain(run.body.runId);
  });

  it("re-seeding the catalog keeps racket ids stable", async () => {
    const before = await storage.getAllRackets();
    const { seedCatalog } = await import("../server/seed");
    await seedCatalog();
    const after = await storage.getAllRackets();
    expect(after.length).toBe(before.length);
    expect(after.map((r) => r.id).sort()).toEqual(before.map((r) => r.id).sort());
  });
});

describe("billing", () => {
  it("requires an account to check out", async () => {
    const app = await getApp();
    expect((await request(app).post("/api/checkout/club").send({ email: "x@example.com" })).status).toBe(401);
  });

  it("upgrades the paying account, and only that account", async () => {
    const payer = await signUp();
    const fakeSession = (userId: number) => ({
      id: "cs_test_1",
      payment_status: "paid",
      customer: "cus_123",
      subscription: "sub_123",
      client_reference_id: String(userId),
      metadata: { userId: String(userId), tier: "club" },
    });
    setStripeForTests({
      checkout: { sessions: { retrieve: async () => fakeSession(payer.user.id) } },
    } as any);

    const intruder = await signUp();
    const stolen = await intruder.agent.post("/api/checkout/verify").send({ session_id: "cs_test_1" });
    expect(stolen.status).toBe(403);
    expect((await storage.getUserById(intruder.user.id))!.tier).toBe("free");

    const ok = await payer.agent.post("/api/checkout/verify").send({ session_id: "cs_test_1" });
    expect(ok.status).toBe(200);
    expect(ok.body.tier).toBe("club");
    const user = (await storage.getUserById(payer.user.id))!;
    expect(user.tier).toBe("club");
    expect(user.stripeSubscriptionId).toBe("sub_123");
    setStripeForTests(null);
  });
});
