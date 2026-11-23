import { describe, expect, it } from "vitest";
import { getApp, request, signUp, storage } from "./helpers";
import { FREE_HISTORY_LIMIT, FREE_RACKET_LIMIT } from "../shared/tiers";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function addRacket(agent: request.Agent, body: Record<string, unknown> = {}) {
  const res = await agent.post("/api/bag/rackets").send({ nickname: "Match racket", brand: "Wilson", model: "Blade 98", ...body });
  expect(res.status).toBe(201);
  return res.body;
}

async function logJobs(agent: request.Agent, racketId: number, count: number) {
  for (let i = 0; i < count; i++) {
    const res = await agent
      .post(`/api/bag/rackets/${racketId}/jobs`)
      .send({ strungAt: daysAgo(10 + i * 30), mains: "Luxilon ALU Power", tensionMains: 52 + i, price: 25 });
    expect(res.status).toBe(201);
  }
}

describe("racket history", () => {
  it("requires a login", async () => {
    const app = await getApp();
    expect((await request(app).get("/api/bag")).status).toBe(401);
    expect((await request(app).get("/api/bag/rackets/1")).status).toBe(401);
  });

  it("shows a subscriber the full history, newest first", async () => {
    const { agent } = await signUp({ tier: "club" });
    const racket = await addRacket(agent);
    await logJobs(agent, racket.id, 7);

    const res = await agent.get(`/api/bag/rackets/${racket.id}`);
    expect(res.status).toBe(200);
    expect(res.body.fullHistory).toBe(true);
    expect(res.body.totalJobs).toBe(7);
    expect(res.body.hiddenJobs).toBe(0);
    expect(res.body.history).toHaveLength(7);
    const dates = res.body.history.map((j: any) => new Date(j.strungAt).getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(res.body.stats.restrings).toBe(7);
    expect(res.body.stats.totalSpent).toBe(175);
    expect(res.body.stats.averageDaysBetween).toBe(30);
  });

  it("shows a one-time Pro buyer the full history too", async () => {
    const { agent } = await signUp({ tier: "pro" });
    const racket = await addRacket(agent);
    await logJobs(agent, racket.id, FREE_HISTORY_LIMIT + 2);
    const res = await agent.get(`/api/bag/rackets/${racket.id}`);
    expect(res.body.history).toHaveLength(FREE_HISTORY_LIMIT + 2);
  });

  it("gives free accounts the latest entries with an upgrade prompt", async () => {
    const { agent } = await signUp();
    const racket = await addRacket(agent);
    await logJobs(agent, racket.id, FREE_HISTORY_LIMIT + 2);
    const res = await agent.get(`/api/bag/rackets/${racket.id}`);
    expect(res.body.fullHistory).toBe(false);
    expect(res.body.history).toHaveLength(FREE_HISTORY_LIMIT);
    expect(res.body.hiddenJobs).toBe(2);
  });

  it("keeps history visible after upgrading", async () => {
    const { agent, user } = await signUp();
    const racket = await addRacket(agent);
    await logJobs(agent, racket.id, 5);
    expect((await agent.get(`/api/bag/rackets/${racket.id}`)).body.history).toHaveLength(FREE_HISTORY_LIMIT);
    await storage.setUserTier(user.id, "club");
    expect((await agent.get(`/api/bag/rackets/${racket.id}`)).body.history).toHaveLength(5);
  });

  it("never shows one player's rackets or history to another", async () => {
    const owner = await signUp({ tier: "club" });
    const racket = await addRacket(owner.agent);
    await logJobs(owner.agent, racket.id, 1);
    const job = (await owner.agent.get(`/api/bag/rackets/${racket.id}`)).body.history[0];

    const other = await signUp({ tier: "club" });
    expect((await other.agent.get(`/api/bag/rackets/${racket.id}`)).status).toBe(404);
    expect((await other.agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(1) })).status).toBe(404);
    expect((await other.agent.patch(`/api/bag/jobs/${job.id}`).send({ notes: "hacked" })).status).toBe(404);
    await other.agent.delete(`/api/bag/rackets/${racket.id}`);
    expect((await owner.agent.get(`/api/bag/rackets/${racket.id}`)).status).toBe(200);
    expect((await other.agent.get("/api/bag")).body.rackets).toHaveLength(0);
  });

  it("edits and deletes history entries", async () => {
    const { agent } = await signUp({ tier: "pro" });
    const racket = await addRacket(agent);
    await logJobs(agent, racket.id, 2);
    const [latest] = (await agent.get(`/api/bag/rackets/${racket.id}`)).body.history;
    const edited = await agent.patch(`/api/bag/jobs/${latest.id}`).send({ tensionMains: 49, notes: "Dropped 3 lbs" });
    expect(edited.status).toBe(200);
    expect(edited.body.tensionMains).toBe(49);
    expect((await agent.delete(`/api/bag/jobs/${latest.id}`)).status).toBe(200);
    expect((await agent.get(`/api/bag/rackets/${racket.id}`)).body.totalJobs).toBe(1);
  });

  it("validates history entries", async () => {
    const { agent } = await signUp();
    const racket = await addRacket(agent);
    const future = await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: new Date(Date.now() + 5 * 86_400_000).toISOString() });
    expect(future.status).toBe(400);
    expect(future.body.message).toMatch(/future/);
    const tension = await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(1), tensionMains: 500 });
    expect(tension.status).toBe(400);
    const noDate = await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ mains: "RPM" });
    expect(noDate.status).toBe(400);
  });

  it("links history to the recommendation it came from", async () => {
    const { agent } = await signUp({ tier: "club" });
    const racket = await addRacket(agent);
    const rec = await agent.post("/api/recommend").send({ racketId: null, savedRacketId: racket.id, level: "advanced" });
    expect(rec.status).toBe(201);
    const job = await agent
      .post(`/api/bag/rackets/${racket.id}/jobs`)
      .send({ strungAt: daysAgo(0), recommendationRunId: rec.body.runId, mains: "RPM Blast" });
    expect(job.status).toBe(201);
    const detail = (await agent.get(`/api/bag/rackets/${racket.id}`)).body;
    expect(detail.history[0].recommendationRunId).toBe(rec.body.runId);
    expect(detail.recommendations.map((r: any) => r.id)).toContain(rec.body.runId);

    const stranger = await signUp();
    const strangerRacket = await addRacket(stranger.agent);
    const stolen = await stranger.agent
      .post(`/api/bag/rackets/${strangerRacket.id}/jobs`)
      .send({ strungAt: daysAgo(0), recommendationRunId: rec.body.runId });
    expect(stolen.status).toBe(400);
  });
});

describe("my bag", () => {
  it("limits free accounts to the free racket allowance", async () => {
    const { agent } = await signUp();
    for (let i = 0; i < FREE_RACKET_LIMIT; i++) await addRacket(agent, { nickname: `R${i}` });
    const blocked = await agent.post("/api/bag/rackets").send({ nickname: "One too many" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.upgrade).toBe(true);
    const bag = (await agent.get("/api/bag")).body;
    expect(bag.limit).toBe(FREE_RACKET_LIMIT);
  });

  it("lets subscribers keep as many rackets as they like", async () => {
    const { agent } = await signUp({ tier: "club" });
    for (let i = 0; i < FREE_RACKET_LIMIT + 2; i++) await addRacket(agent, { nickname: `R${i}` });
    const bag = (await agent.get("/api/bag")).body;
    expect(bag.rackets).toHaveLength(FREE_RACKET_LIMIT + 2);
    expect(bag.limit).toBeNull();
  });

  it("requires a nickname", async () => {
    const { agent } = await signUp();
    const res = await agent.post("/api/bag/rackets").send({ nickname: "  " });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("nickname");
  });
});

describe("restring reminders", () => {
  it("computes when each racket is due", async () => {
    const { agent } = await signUp();
    const racket = await addRacket(agent, { restringIntervalDays: 30 });
    let bag = (await agent.get("/api/bag")).body;
    expect(bag.rackets[0].reminder.status).toBe("never");

    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(40), mains: "RPM Blast" });
    bag = (await agent.get("/api/bag")).body;
    expect(bag.rackets[0].reminder.status).toBe("overdue");
    expect(bag.rackets[0].reminder.daysLeft).toBe(-10);

    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(0), mains: "RPM Blast" });
    bag = (await agent.get("/api/bag")).body;
    expect(bag.rackets[0].reminder.status).toBe("fresh");
    expect(bag.rackets[0].reminder.daysLeft).toBe(30);
    expect(bag.rackets[0].jobCount).toBe(2);
  });

  it("adjusts the schedule from how much the player plays", async () => {
    const { agent } = await signUp();
    const racket = await addRacket(agent, { hoursPerWeek: 10 });
    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(0), mains: "Luxilon ALU Power" });
    const heavy = (await agent.get("/api/bag")).body.rackets[0].reminder.intervalDays;
    await agent.patch(`/api/bag/rackets/${racket.id}`).send({ hoursPerWeek: 2 });
    const light = (await agent.get("/api/bag")).body.rackets[0].reminder.intervalDays;
    expect(heavy).toBe(14);
    expect(light).toBe(70);
    await agent.patch(`/api/bag/rackets/${racket.id}`).send({ restringIntervalDays: 21 });
    expect((await agent.get("/api/bag")).body.rackets[0].reminder.intervalDays).toBe(21);
    await agent.patch(`/api/bag/rackets/${racket.id}`).send({ restringIntervalDays: null });
    expect((await agent.get("/api/bag")).body.rackets[0].reminder.intervalDays).toBe(70);
  });

  it("exports a calendar reminder", async () => {
    const { agent } = await signUp();
    const racket = await addRacket(agent, { restringIntervalDays: 30 });
    expect((await agent.get(`/api/bag/rackets/${racket.id}/reminder.ics`)).status).toBe(400);
    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(0) });
    const ics = await agent.get(`/api/bag/rackets/${racket.id}/reminder.ics`);
    expect(ics.status).toBe(200);
    expect(ics.headers["content-type"]).toMatch(/text\/calendar/);
    expect(ics.text).toContain("BEGIN:VEVENT");
    expect(ics.text).toContain("SUMMARY:Restring Match racket");
  });

  it("moves a v1 single reminder date onto the player's first racket", async () => {
    const { agent, user } = await signUp();
    const racket = await addRacket(agent);
    await storage.updateUser(user.id, { lastRestrungAt: new Date(daysAgo(14)), reminderFrequencyWeeks: 6 });
    const bag = (await agent.get("/api/bag")).body;
    expect(bag.rackets[0].jobCount).toBe(1);
    expect(bag.rackets[0].restringIntervalDays).toBe(42);
    expect(bag.rackets[0].reminder.daysLeft).toBe(28);
    expect((await storage.getUserById(user.id))!.lastRestrungAt).toBeNull();
    // Running again must not duplicate it.
    expect((await agent.get(`/api/bag/rackets/${racket.id}`)).body.totalJobs).toBe(1);
  });

  it("emails due reminders once per set of strings", async () => {
    const { runReminderJob } = await import("../server/reminder-mailer");
    const { agent, user, email } = await signUp();
    await agent.patch("/api/account/notifications").send({ reminderEnabled: true });
    const racket = await addRacket(agent, { nickname: "Backup", restringIntervalDays: 14 });
    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(20), mains: "RPM" });

    const sent: Array<{ to: string; subject: string }> = [];
    const send = async (e: { to: string; subject: string }) => {
      sent.push(e);
    };
    await runReminderJob({ send });
    const mine = sent.filter((e) => e.to === email);
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toBe("Time to restring Backup");

    await runReminderJob({ send });
    expect(sent.filter((e) => e.to === email)).toHaveLength(1);

    // A new restring resets the clock, so the next due date emails again.
    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(15), mains: "RPM" });
    await runReminderJob({ send });
    expect(sent.filter((e) => e.to === email)).toHaveLength(2);

    await agent.patch(`/api/bag/rackets/${racket.id}`).send({ reminderEnabled: false });
    await agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: daysAgo(15), mains: "RPM" });
    await runReminderJob({ send });
    expect(sent.filter((e) => e.to === email)).toHaveLength(2);
    void user;
  });
});
