import { describe, expect, it } from "vitest";
import { signUp, storage } from "./helpers";
import { setStripeForTests, applyBusinessCheckout } from "../server/routes/billing";
import { LIFETIME, PLANS } from "../shared/tiers";

function fakeStripe(created: Array<Record<string, any>>) {
  setStripeForTests({ checkout: { sessions: { create: async (a: Record<string, any>) => (created.push(a), { url: "https://checkout.stripe.test/x" }) } } } as any);
}

describe("player pricing ladder", () => {
  it("sells Pro and Club as annual (default) or monthly subscriptions", async () => {
    const created: Array<Record<string, any>> = [];
    fakeStripe(created);
    const { agent } = await signUp();
    await agent.post("/api/checkout/pro");
    await agent.post("/api/checkout/pro?interval=month");
    await agent.post("/api/checkout/club?interval=year");
    expect(created.map((c) => [c.mode, c.line_items[0].price_data.unit_amount, c.line_items[0].price_data.recurring?.interval])).toEqual([
      ["subscription", PLANS.pro.annualCents, "year"],
      ["subscription", PLANS.pro.amountCents, "month"],
      ["subscription", PLANS.club.annualCents, "year"],
    ]);
    expect(PLANS.pro.amountCents).toBeGreaterThan(499);
    setStripeForTests(null);
  });

  it("sells a one-time lifetime Pro", async () => {
    const created: Array<Record<string, any>> = [];
    fakeStripe(created);
    const { agent } = await signUp();
    await agent.post("/api/checkout/lifetime");
    expect(created[0].mode).toBe("payment");
    expect(created[0].line_items[0].price_data.unit_amount).toBe(LIFETIME.amountCents);
    expect(created[0].metadata).toMatchObject({ tier: "pro", lifetime: "1" });
    setStripeForTests(null);
  });

  it("keeps early one-time Pro buyers on Pro (no subscription to cancel)", async () => {
    const { user } = await signUp({ tier: "pro" });
    expect((await storage.getUserById(user.id))!.stripeSubscriptionId).toBeNull();
    expect((await storage.getUserById(user.id))!.tier).toBe("pro");
    void applyBusinessCheckout;
  });
});
