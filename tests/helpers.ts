import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server/app";
import { storage } from "../server/storage";
import type { UserTier } from "../shared/schema";

let appPromise: Promise<Express> | null = null;
export function getApp(opts: { demo?: boolean } = {}) {
  // The catalog seed is slow-ish and not needed for most tests; seed once per file.
  // Pass { demo: true } on the first call in a file to also seed the demo businesses.
  appPromise ??= createApp({ demo: !!opts.demo });
  return appPromise;
}

let counter = 0;
export async function signUp(opts: { tier?: UserTier } = {}) {
  const app = await getApp();
  const agent = request.agent(app);
  const email = `player${Date.now()}${counter++}@example.com`;
  const res = await agent
    .post("/api/auth/signup")
    // Each test player signs up from its own address so the per-IP signup limit isn't the thing under test.
    .set("X-Forwarded-For", `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`)
    .send({ email, password: "correct-horse", firstName: "Test", lastName: "Player" });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  const user = (await storage.getUserByEmail(email))!;
  if (opts.tier && opts.tier !== "free") await storage.setUserTier(user.id, opts.tier);
  return { agent, user, email };
}

/** A signed-in stringer with a shop. */
export async function makeShop(opts: { pro?: boolean; name?: string } = {}) {
  const owner = await signUp();
  const res = await owner.agent
    .post("/api/shop")
    .send({ name: opts.name ?? `Test Strings ${counter++}`, city: "Testville", labourCents: 2000, rushCents: 1000, turnaroundHours: 24 });
  if (res.status !== 201) throw new Error(`shop create failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (opts.pro) {
    const { db } = await import("../server/db");
    const { shops } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(shops).set({ plan: "pro" }).where(eq(shops.id, res.body.id));
  }
  return { ...owner, shop: res.body as { id: number; slug: string; name: string } };
}

/** A signed-in brand manager. */
/** A signed-in brand manager. `verified` simulates 10IS having confirmed the company (admin step). */
export async function makeBrand(
  opts: { kind?: "string" | "racket" | "retailer"; plan?: "free" | "insights" | "partner"; verified?: boolean; website?: string } = {},
) {
  const owner = await signUp();
  const res = await owner.agent
    .post("/api/brand")
    .send({ name: `Brand ${Date.now()} ${counter++}`, kind: opts.kind ?? "string", website: opts.website ?? null });
  if (res.status !== 201) throw new Error(`brand create failed: ${res.status} ${JSON.stringify(res.body)}`);
  const { db } = await import("../server/db");
  const { brands } = await import("../shared/schema");
  const { eq } = await import("drizzle-orm");
  if (opts.plan && opts.plan !== "free") await db.update(brands).set({ plan: opts.plan }).where(eq(brands.id, res.body.id));
  if (opts.verified) await db.update(brands).set({ claimed: true }).where(eq(brands.id, res.body.id));
  return { ...owner, brand: res.body as { id: number; slug: string; name: string } };
}

export { request, storage };
