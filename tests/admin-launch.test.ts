import { describe, expect, it } from "vitest";
import { makeBrand, signUp, storage } from "./helpers";
import { db } from "../server/db";
import { strings } from "../shared/schema";

async function admin() {
  const a = await signUp();
  await storage.updateUser(a.user.id, { isAdmin: true });
  return a;
}

describe("admin launch tools", () => {
  it("shows which integrations are set without ever revealing a value", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_secretvalue123";
    const a = await admin();
    const res = await a.agent.get("/api/admin/integrations");
    expect(res.status).toBe(200);
    const stripe = res.body.find((i: { key: string }) => i.key === "STRIPE_SECRET_KEY");
    expect(stripe).toMatchObject({ ok: true, note: "test mode" });
    expect(JSON.stringify(res.body)).not.toContain("secretvalue123");
    delete process.env.STRIPE_SECRET_KEY;
    const player = await signUp();
    expect((await player.agent.get("/api/admin/integrations")).status).toBe(403);
  });

  it("lets an admin verify a brand, which unlocks retailer offers", async () => {
    const shop = await makeBrand({ kind: "retailer", website: "https://shop.example.com" });
    const [anyString] = await db.select({ id: strings.id }).from(strings).limit(1);
    const offer = { stringId: anyString.id, url: "https://shop.example.com/p/1", priceCents: 1599, inStock: true };
    const before = await shop.agent.post("/api/brand/offers").send(offer);
    expect(before.status).toBe(403);

    const a = await admin();
    const list = (await a.agent.get("/api/admin/brands")).body as Array<{ id: number; claimed: boolean; ownerEmail: string }>;
    expect(list.find((b) => b.id === shop.brand.id)).toMatchObject({ claimed: false, ownerEmail: shop.email });
    expect((await a.agent.patch(`/api/admin/brands/${shop.brand.id}`).send({ claimed: true })).status).toBe(200);
    expect((await shop.agent.post("/api/brand/offers").send(offer)).status).toBe(201);

    // Non-admins can't verify themselves.
    expect((await shop.agent.patch(`/api/admin/brands/${shop.brand.id}`).send({ claimed: false })).status).toBe(403);
  });

  it("only hands a listed brand to an existing account that manages no other brand", async () => {
    const a = await admin();
    const taken = await makeBrand();
    const newcomer = await signUp();
    expect((await a.agent.patch(`/api/admin/brands/${taken.brand.id}`).send({ ownerEmail: "nobody@example.com" })).status).toBe(400);
    const other = await makeBrand();
    expect((await a.agent.patch(`/api/admin/brands/${taken.brand.id}`).send({ ownerEmail: other.email })).status).toBe(409);
    expect((await a.agent.patch(`/api/admin/brands/${taken.brand.id}`).send({ ownerEmail: newcomer.email })).status).toBe(200);
    expect((await newcomer.agent.get("/api/brand/me")).body.brand.id).toBe(taken.brand.id);
  });
});
