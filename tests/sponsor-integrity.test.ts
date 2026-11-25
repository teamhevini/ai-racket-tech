import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getApp, makeBrand, request, signUp } from "./helpers";
import { db } from "../server/db";
import { campaigns, recommendationRuns, strings } from "../shared/schema";
import { assessFit, buildFitContext, chooseSponsored, deepFreeze, FIT_THRESHOLD, type FitString } from "../shared/sponsor-fit";
import type { RecommendationOutput } from "../shared/schema";

const spinPlayer = { racketId: null, level: "advanced", playstyle: "baseliner" as const, goals: ["Spin", "Control"], swingSpeed: "fast" as const, injuryRisk: "none" as const };

/** A brand with one well-scored poly string (scores are set as 10IS would, not by the brand) and a live campaign. */
async function sponsorWithPoly(opts: { cpcCents?: number; model?: string; budgetCents?: number; stiffness?: number } = {}) {
  const b = await makeBrand();
  const created = await b.agent.post("/api/brand/strings").send({ model: opts.model ?? `Spin Soft ${Date.now()}`, family: "polyester", gauges: "17" });
  expect(created.status).toBe(201);
  await db
    .update(strings)
    .set({ stiffness: opts.stiffness ?? 195, comfort: 8, spin: 9, control: 8, power: 6, durability: 6 })
    .where(eq(strings.id, created.body.id));
  const c = await b.agent.post("/api/brand/campaigns").send({
    stringId: created.body.id,
    name: "Launch",
    headline: "Spin without the sting",
    cpcCents: opts.cpcCents ?? 2000, // the maximum bid
    monthlyBudgetCents: opts.budgetCents ?? 5_000_000,
  });
  expect(c.status).toBe(201);
  return { ...b, string: created.body, campaign: c.body };
}

async function pauseAllCampaigns() {
  await db.update(campaigns).set({ status: "paused" });
}

beforeAll(async () => {
  await getApp();
});

describe("sponsored placements never touch the AI's pick", () => {
  it("a sponsor can never replace or reorder the AI's main pick", async () => {
    await pauseAllCampaigns();
    const app = await getApp();

    // 1. Baseline: the recommendation with no sponsors at all.
    const before = await request(app).post("/api/recommend").send(spinPlayer);
    expect(before.status).toBe(201);

    // 2. A sponsor bids the maximum on a string that fits this player.
    const sponsor = await sponsorWithPoly();
    const viewer = await signUp(); // free player, sees sponsored slots
    const withSponsor = await viewer.agent.post("/api/recommend").send(spinPlayer);
    expect(withSponsor.status).toBe(201);

    // Same inputs → identical recommendation: primary pick, crosses, alternatives (and their order), explanation.
    expect(withSponsor.body.recommendation).toEqual(before.body.recommendation);
    expect(withSponsor.body.recommendation.setup.mains.exampleStrings).toEqual(before.body.recommendation.setup.mains.exampleStrings);
    expect(withSponsor.body.recommendation.alternatives.map((a: { exampleStrings: string[] }) => a.exampleStrings)).toEqual(
      before.body.recommendation.alternatives.map((a: { exampleStrings: string[] }) => a.exampleStrings),
    );
    // The recommend response carries no sponsor data at all.
    expect(JSON.stringify(withSponsor.body)).not.toContain(sponsor.string.model);
    expect(Object.keys(withSponsor.body).sort()).toEqual(["confidence", "fallback", "recommendation", "runId"]);

    // 3. The sponsored slot is a separate object, served by a separate request.
    const runId = withSponsor.body.runId;
    const [storedBefore] = await db.select().from(recommendationRuns).where(eq(recommendationRuns.id, runId));
    const slot = await viewer.agent.get(`/api/recommendation-runs/${runId}/sponsored`);
    expect(slot.status).toBe(200);
    expect(slot.body.placement).toBeTruthy();
    expect(slot.body.placement.label).toBe("Sponsored");
    expect(slot.body.placement.paidBy).toBe(sponsor.brand.name);
    expect(slot.body.placement.string.id).toBe(sponsor.string.id);
    expect(slot.body.placement.fitScore).toBeGreaterThanOrEqual(FIT_THRESHOLD);
    expect(slot.body.placement.disclosure).toMatch(/did not influence your recommendation/);

    // 4. Serving and clicking the slot leaves the stored recommendation byte-for-byte unchanged.
    await viewer.agent.post(`/api/sponsored/${sponsor.campaign.id}/click`).send({ runId });
    const [storedAfter] = await db.select().from(recommendationRuns).where(eq(recommendationRuns.id, runId));
    expect(storedAfter.outputJson).toEqual(storedBefore.outputJson);
    const reread = await viewer.agent.get(`/api/recommendation-runs/${runId}`);
    expect(reread.body.recommendation).toEqual(withSponsor.body.recommendation);
    expect(reread.body.recommendation.setup.mains.exampleStrings[0]).toBe(before.body.recommendation.setup.mains.exampleStrings[0]);
  });

  it("never sells the AI's own pick back as a sponsored slot", async () => {
    await pauseAllCampaigns();
    const app = await getApp();
    const run = await request(app).post("/api/recommend").send(spinPlayer);
    const pickedModel: string = run.body.recommendation.setup.mains.exampleStrings[0]; // e.g. "Luxilon ALU Power 125"
    const [picked] = (await db.select().from(strings)).filter((s) => pickedModel.replace(/\W/g, "").toLowerCase().includes(s.model.replace(/\W/g, "").toLowerCase()) && s.model.length >= 5);
    expect(picked).toBeTruthy();
    const b = await makeBrand();
    // Simulate the pick's maker running a campaign on it.
    await db.insert(campaigns).values({ brandId: b.brand.id, stringId: picked.id, name: "x", headline: "Our pick", status: "active", cpcCents: 2000, monthlyBudgetCents: 500000, levels: [] });
    const slot = await request(app).get(`/api/recommendation-runs/${run.body.runId}/sponsored`);
    expect(slot.body.placement).toBeNull();
  });

  it("frozen inputs: the eligibility engine cannot mutate the recommendation", () => {
    const output: RecommendationOutput = deepFreeze({
      setup: { mains: { stringFamily: "Polyester", exampleStrings: ["Solinco Hyper-G 17"], gauge: "17", tension: "50" } },
      alternatives: [{ stringFamily: "Multifilament", exampleStrings: ["Wilson NXT 16"], gauge: "16", tension: "54" }],
      explanation: "x",
      warnings: [],
      confidenceReason: "x",
    });
    expect(() => {
      (output.setup.mains.exampleStrings as string[]).push("Sponsor String");
    }).toThrow();
    const ctx = buildFitContext(output, spinPlayer, null);
    const s: FitString = { id: 1, brandName: "X", model: "Ridge", family: "polyester", stiffness: 190, comfort: 8, spin: 9, control: 8, power: 6, durability: 6 };
    expect(assessFit(s, ctx).eligible).toBe(true);
    expect(output.setup.mains.exampleStrings).toEqual(["Solinco Hyper-G 17"]);
  });
});

describe("the fit check decides eligibility, not money", () => {
  const polyOutput: RecommendationOutput = {
    setup: { mains: { stringFamily: "Polyester", exampleStrings: ["Solinco Hyper-G 17"], gauge: "17", tension: "50" } },
    alternatives: [{ stringFamily: "Multifilament", exampleStrings: ["Wilson NXT 16"], gauge: "16", tension: "54" }],
    explanation: "",
    warnings: [],
    confidenceReason: "",
  };
  const good: FitString = { id: 1, brandName: "A", model: "Fit Poly", family: "polyester", stiffness: 195, comfort: 8, spin: 9, control: 8, power: 6, durability: 6 };
  const poor: FitString = { id: 2, brandName: "B", model: "Brick Poly", family: "polyester", stiffness: 250, comfort: 2, spin: 3, control: 3, power: 3, durability: 9 };
  const gut: FitString = { id: 3, brandName: "C", model: "Silk Gut", family: "natural gut", stiffness: 150, comfort: 10, spin: 5, control: 7, power: 9, durability: 3 };

  it("a huge bid can't buy a poor fit past a good one", () => {
    const ctx = buildFitContext(polyOutput, spinPlayer, null);
    const pick = chooseSponsored(
      [
        { id: 10, cpcCents: 2000, levels: [], remainingBudgetCents: 1e9, string: poor },
        { id: 11, cpcCents: 80, levels: [], remainingBudgetCents: 1e9, string: good },
      ],
      ctx,
    );
    expect(pick?.campaignId).toBe(11);
    expect(assessFit(poor, ctx).eligible).toBe(false);
  });

  it("only shows string types the technician recommended", () => {
    const ctx = buildFitContext(polyOutput, spinPlayer, null);
    expect(assessFit(gut, ctx).eligible).toBe(false);
    expect(assessFit(gut, ctx).reasons[0]).toMatch(/didn't recommend/);
  });

  it("keeps stiff polyester away from injured arms and stiff frames", () => {
    const injured = buildFitContext(polyOutput, { ...spinPlayer, injuryRisk: "elbow" }, null);
    expect(assessFit({ ...good, stiffness: 230 }, injured).eligible).toBe(false);
    expect(assessFit({ ...good, stiffness: null }, injured).eligible).toBe(false); // unknown specs = not shown
    const stiffFrame = buildFitContext(polyOutput, spinPlayer, { stiffnessRa: 71 });
    expect(assessFit({ ...good, stiffness: 235 }, stiffFrame).eligible).toBe(false);
  });

  it("brands can narrow the audience by level but not widen it", () => {
    const ctx = buildFitContext(polyOutput, { ...spinPlayer, level: "intermediate" }, null);
    expect(chooseSponsored([{ id: 1, cpcCents: 100, levels: ["advanced"], remainingBudgetCents: 1e6, string: good }], ctx)).toBeNull();
    expect(chooseSponsored([{ id: 1, cpcCents: 100, levels: ["intermediate"], remainingBudgetCents: 1e6, string: good }], ctx)?.campaignId).toBe(1);
    // Targeting a level can't rescue an unfit string.
    expect(chooseSponsored([{ id: 2, cpcCents: 2000, levels: ["intermediate"], remainingBudgetCents: 1e6, string: gut }], ctx)).toBeNull();
  });

  it("stops when the monthly budget can't cover a click", () => {
    const ctx = buildFitContext(polyOutput, spinPlayer, null);
    expect(chooseSponsored([{ id: 1, cpcCents: 100, levels: [], remainingBudgetCents: 99, string: good }], ctx)).toBeNull();
  });
});

describe("sponsored slot over HTTP", () => {
  it("paid players never see sponsored placements", async () => {
    await pauseAllCampaigns();
    await sponsorWithPoly();
    const pro = await signUp({ tier: "pro" });
    const run = await pro.agent.post("/api/recommend").send(spinPlayer);
    const slot = await pro.agent.get(`/api/recommendation-runs/${run.body.runId}/sponsored`);
    expect(slot.body).toEqual({ placement: null, reason: "ad-free" });
  });

  it("does not show polyester to a player with an elbow injury", async () => {
    await pauseAllCampaigns();
    await sponsorWithPoly();
    const app = await getApp();
    const run = await request(app).post("/api/recommend").send({ ...spinPlayer, injuryRisk: "elbow" });
    const slot = await request(app).get(`/api/recommendation-runs/${run.body.runId}/sponsored`);
    expect(slot.body.placement).toBeNull();
  });

  it("bills a click once, and only for a placement that was actually shown", async () => {
    await pauseAllCampaigns();
    const sponsor = await sponsorWithPoly({ cpcCents: 150 });
    const viewer = await signUp();
    const run = await viewer.agent.post("/api/recommend").send(spinPlayer);
    const early = await viewer.agent.post(`/api/sponsored/${sponsor.campaign.id}/click`).send({ runId: run.body.runId });
    expect(early.status).toBe(400);
    await viewer.agent.get(`/api/recommendation-runs/${run.body.runId}/sponsored`);
    await viewer.agent.get(`/api/recommendation-runs/${run.body.runId}/sponsored`); // second view: still one impression
    const c1 = await viewer.agent.post(`/api/sponsored/${sponsor.campaign.id}/click`).send({ runId: run.body.runId });
    const c2 = await viewer.agent.post(`/api/sponsored/${sponsor.campaign.id}/click`).send({ runId: run.body.runId });
    expect(c1.status).toBe(200);
    expect(c1.body.code).toBeTruthy();
    expect(c2.status).toBe(200);
    const stats = (await sponsor.agent.get("/api/brand/campaigns")).body.find((c: { id: number }) => c.id === sponsor.campaign.id);
    expect(stats.impressions).toBe(1);
    expect(stats.clicks).toBe(1);
    expect(stats.spendCents).toBe(150);
  });

  it("stops serving once the monthly budget is spent", async () => {
    await pauseAllCampaigns();
    const sponsor = await sponsorWithPoly({ cpcCents: 2000, budgetCents: 5000 });
    // Spend the budget: 2 clicks of $20 leaves $10, less than one click.
    for (let i = 0; i < 2; i++) {
      const v = await signUp();
      const run = await v.agent.post("/api/recommend").send(spinPlayer);
      expect((await v.agent.get(`/api/recommendation-runs/${run.body.runId}/sponsored`)).body.placement?.campaignId).toBe(sponsor.campaign.id);
      await v.agent.post(`/api/sponsored/${sponsor.campaign.id}/click`).send({ runId: run.body.runId });
    }
    const v = await signUp();
    const run = await v.agent.post("/api/recommend").send(spinPlayer);
    expect((await v.agent.get(`/api/recommendation-runs/${run.body.runId}/sponsored`)).body.placement).toBeNull();
  });
});
