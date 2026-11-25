import { describe, expect, it } from "vitest";
import { getApp, request } from "./helpers";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../server/b2b-seed-data";

describe("demo data", () => {
  it("has enough players for every week of the demo brand's demand chart to clear the 5-player floor", async () => {
    const app = await getApp({ demo: true });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: DEMO_ACCOUNTS.brand, password: DEMO_PASSWORD });
    const weekly = (await agent.get("/api/brand/insights")).body.data.weekly as Array<{ share: number | null }>;
    const hidden = weekly.filter((w) => w.share == null).length;
    expect(hidden).toBeLessThanOrEqual(1);
    expect(weekly.at(-1)!.share).not.toBeNull();
  });
});
