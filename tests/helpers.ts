import request from "supertest";
import type { Express } from "express";
import { createApp } from "../server/app";
import { storage } from "../server/storage";
import type { UserTier } from "../shared/schema";

let appPromise: Promise<Express> | null = null;
export function getApp() {
  // The catalog seed is slow-ish and not needed for most tests; seed once per file.
  appPromise ??= createApp();
  return appPromise;
}

let counter = 0;
export async function signUp(opts: { tier?: UserTier } = {}) {
  const app = await getApp();
  const agent = request.agent(app);
  const email = `player${Date.now()}${counter++}@example.com`;
  const res = await agent
    .post("/api/auth/signup")
    .send({ email, password: "correct-horse", firstName: "Test", lastName: "Player" });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  const user = (await storage.getUserByEmail(email))!;
  if (opts.tier && opts.tier !== "free") await storage.setUserTier(user.id, opts.tier);
  return { agent, user, email };
}

export { request, storage };
