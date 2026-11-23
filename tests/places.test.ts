import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "../server/routes/stringers";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("Google Places search", () => {
  it("uses Places API (New) and maps its fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(200, {
        places: [
          {
            id: "abc",
            displayName: { text: "Racquet Works" },
            formattedAddress: "1 Main St",
            location: { latitude: 38.9, longitude: -76.5 },
            rating: 4.7,
            userRatingCount: 88,
            currentOpeningHours: { openNow: true },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchPlaces("key", "tennis racket stringing", { lat: 38.9, lng: -76.5 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).locationBias.circle.radius).toBe(25000);
    expect(results).toEqual([
      expect.objectContaining({ name: "Racquet Works", place_id: "abc", rating: 4.7, ratingCount: 88, openNow: true }),
    ]);
  });

  it("falls back to the legacy API when the key's project hasn't enabled the new one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(403, { error: { status: "PERMISSION_DENIED", message: "Places API (New) has not been used" } }))
      .mockResolvedValueOnce(json(200, { status: "OK", results: [{ name: "Old Shop", formatted_address: "2 Elm", place_id: "p2", user_ratings_total: 3 }] }));
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchPlaces("key", "tennis racket stringing near Annapolis", null);
    expect(String(fetchMock.mock.calls[1][0])).toContain("maps.googleapis.com/maps/api/place/textsearch/json");
    expect(results[0]).toMatchObject({ name: "Old Shop", place_id: "p2", ratingCount: 3 });
  });

  it("reports other errors instead of silently returning nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(400, { error: { message: "bad request" } })));
    await expect(searchPlaces("key", "x", null)).rejects.toThrow(/400/);
  });
});
