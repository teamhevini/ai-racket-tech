import { describe, expect, it } from "vitest";
import { getApp, request, signUp } from "./helpers";

describe("invite your stringer", () => {
  it("a player invites their own stringer; when the stringer opens a shop, the player's next booking goes there", async () => {
    const p = await signUp();
    const stringer = (await p.agent.post("/api/stringers/saved").send({ stringerName: "Sam Lee", stringerAddress: "1 Court Rd, Portland" })).body;
    const racket = (await p.agent.post("/api/bag/rackets").send({ nickname: "Main" })).body;
    await p.agent.post(`/api/bag/rackets/${racket.id}/jobs`).send({ strungAt: new Date(Date.now() - 90 * 86_400_000).toISOString(), stringerId: stringer.id, tensionMains: 52 });

    const before = (await p.agent.get(`/api/bookings/suggest?racketId=${racket.id}`)).body;
    expect(before.shop).toBeNull();
    expect(before.invitable).toEqual({ savedStringerId: stringer.id, name: "Sam Lee" });

    const inv = await p.agent.post(`/api/stringers/saved/${stringer.id}/invite`);
    expect(inv.status).toBe(200);
    expect(inv.body.url).toContain(`/shop/new?invite=${inv.body.code}`);
    expect((await p.agent.post(`/api/stringers/saved/${stringer.id}/invite`)).body.code).toBe(inv.body.code); // reused

    const other = await signUp();
    expect((await other.agent.post(`/api/stringers/saved/${stringer.id}/invite`)).status).toBe(404);

    const app = await getApp();
    const pub = (await request(app).get(`/api/invites/${inv.body.code}`)).body;
    expect(pub.inviterFirstName).toBe("Test");
    expect(JSON.stringify(pub)).not.toContain("@");
    expect((await request(app).get("/api/invites/nope")).status).toBe(404);

    const sam = await signUp();
    const shop = await sam.agent.post("/api/shop").send({ name: "Sam Lee Strings", inviteCode: inv.body.code });
    expect(shop.status).toBe(201);
    expect((await request(app).get(`/api/invites/${inv.body.code}`)).body.accepted).toBe(true);

    const after = (await p.agent.get(`/api/bookings/suggest?racketId=${racket.id}`)).body;
    expect(after.shop.slug).toBe(shop.body.slug);
    expect(after.invitable).toBeNull();
    expect((await p.agent.post(`/api/stringers/saved/${stringer.id}/invite`)).status).toBe(409);
  });
});
