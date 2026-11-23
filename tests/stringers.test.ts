import { describe, expect, it } from "vitest";
import { getApp, request, signUp } from "./helpers";

describe("saved stringers", () => {
  it("requires a login", async () => {
    const app = await getApp();
    expect((await request(app).get("/api/stringers/saved")).status).toBe(401);
    expect((await request(app).post("/api/stringers/saved").send({ stringerName: "X" })).status).toBe(401);
  });

  it("saves, edits and removes a stringer with full contact details", async () => {
    const { agent } = await signUp();
    const created = await agent.post("/api/stringers/saved").send({
      stringerName: "Baseline Pro Shop",
      stringerAddress: "12 Court Rd",
      phone: "+1 555 0100",
      email: "shop@example.com",
      website: "https://baseline.example.com",
      notes: "Ask for Sam. Same-day if dropped before 10am.",
    });
    expect(created.status).toBe(201);
    expect(created.body.phone).toBe("+1 555 0100");

    const edited = await agent.patch(`/api/stringers/saved/${created.body.id}`).send({ notes: "Closed Mondays" });
    expect(edited.status).toBe(200);
    expect(edited.body.notes).toBe("Closed Mondays");
    expect(edited.body.phone).toBe("+1 555 0100"); // untouched fields stay

    const list = (await agent.get("/api/stringers/saved")).body;
    expect(list).toHaveLength(1);
    expect(list[0].stringerName).toBe("Baseline Pro Shop");

    await agent.delete(`/api/stringers/saved/${created.body.id}`);
    expect((await agent.get("/api/stringers/saved")).body).toHaveLength(0);
  });

  it("validates input", async () => {
    const { agent } = await signUp();
    const noName = await agent.post("/api/stringers/saved").send({ stringerName: "" });
    expect(noName.status).toBe(400);
    expect(noName.body.message).toMatch(/name/i);
    const badEmail = await agent.post("/api/stringers/saved").send({ stringerName: "A", email: "not-an-email" });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.field).toBe("email");
  });

  it("doesn't save the same Google place twice", async () => {
    const { agent } = await signUp();
    const a = await agent.post("/api/stringers/saved").send({ stringerName: "Shop", stringerPlaceId: "place-1" });
    const b = await agent.post("/api/stringers/saved").send({ stringerName: "Shop", stringerPlaceId: "place-1" });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.alreadySaved).toBe(true);
    expect((await agent.get("/api/stringers/saved")).body).toHaveLength(1);
  });

  it("links restring jobs to a stringer and counts them", async () => {
    const { agent } = await signUp();
    const stringer = (await agent.post("/api/stringers/saved").send({ stringerName: "Sam" })).body;
    const racket = (await agent.post("/api/bag/rackets").send({ nickname: "Main" })).body;
    for (let i = 0; i < 2; i++) {
      const job = await agent
        .post(`/api/bag/rackets/${racket.id}/jobs`)
        .send({ strungAt: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(), stringerId: stringer.id });
      expect(job.status).toBe(201);
    }
    const list = (await agent.get("/api/stringers/saved")).body;
    expect(list[0].jobCount).toBe(2);
    const detail = (await agent.get(`/api/bag/rackets/${racket.id}`)).body;
    expect(detail.history[0].stringer.stringerName).toBe("Sam");

    // Removing a stringer keeps the history entry.
    await agent.delete(`/api/stringers/saved/${stringer.id}`);
    const after = (await agent.get(`/api/bag/rackets/${racket.id}`)).body;
    expect(after.totalJobs).toBe(2);
    expect(after.history[0].stringer).toBeNull();
  });

  it("keeps each player's stringers private", async () => {
    const owner = await signUp();
    const s = (await owner.agent.post("/api/stringers/saved").send({ stringerName: "Private" })).body;
    const other = await signUp();
    expect((await other.agent.get("/api/stringers/saved")).body).toHaveLength(0);
    expect((await other.agent.patch(`/api/stringers/saved/${s.id}`).send({ notes: "x" })).status).toBe(404);
    const racket = (await other.agent.post("/api/bag/rackets").send({ nickname: "Mine" })).body;
    const job = await other.agent
      .post(`/api/bag/rackets/${racket.id}/jobs`)
      .send({ strungAt: new Date().toISOString(), stringerId: s.id });
    expect(job.status).toBe(400);
  });
});

describe("stringer search", () => {
  it("explains when search isn't configured instead of returning a silent empty list", async () => {
    const app = await getApp();
    const res = await request(app).get("/api/stringers/search?query=Annapolis");
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/configured/);
  });
});
