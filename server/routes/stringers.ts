import { Router } from "express";
import { savedStringerInputSchema } from "@shared/schema";
import { FREE_STRINGER_RESULTS } from "@shared/tiers";
import { asyncHandler, currentUser, loadUser, rateLimit, requireAuth } from "../auth";
import { storage } from "../storage";
import { parseBody, parseId } from "./util";

export const stringersRouter = Router();

interface PlaceResult {
  name: string;
  address: string;
  place_id: string;
  geometry?: { location: { lat: number; lng: number } };
  types: string[];
  rating?: number;
  ratingCount?: number;
  openNow?: boolean;
}

class PlacesNotEnabled extends Error {}

/**
 * Places API (New) — the only Places API Google lets new projects enable.
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 */
async function searchPlacesNew(apiKey: string, text: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.currentOpeningHours.openNow",
    },
    body: JSON.stringify({
      textQuery: text,
      pageSize: 20,
      ...(near ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 25000 } } } : {}),
    }),
  });
  const data: any = await r.json().catch(() => ({}));
  if (r.status === 403 || data?.error?.status === "PERMISSION_DENIED") throw new PlacesNotEnabled(data?.error?.message ?? "403");
  if (!r.ok) throw new Error(`Places (New) ${r.status}: ${data?.error?.message ?? ""}`);
  return (data.places ?? []).map((p: any) => ({
    name: p.displayName?.text ?? "Stringer",
    address: p.formattedAddress ?? "",
    place_id: p.id,
    geometry: p.location ? { location: { lat: p.location.latitude, lng: p.location.longitude } } : undefined,
    types: p.types ?? [],
    rating: p.rating,
    ratingCount: p.userRatingCount,
    openNow: p.currentOpeningHours?.openNow,
  }));
}

/** Legacy Places Text Search — still used by keys created before Google retired it for new projects. */
async function searchPlacesLegacy(apiKey: string, text: string, near: { lat: number; lng: number } | null): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ key: apiKey, query: text });
  if (near) {
    params.set("location", `${near.lat},${near.lng}`);
    params.set("radius", "25000");
  }
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
  if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error(`Places ${r.status}`);
  const data: any = await r.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") throw new Error(`Places ${data.status}: ${data.error_message ?? ""}`);
  return (data.results ?? []).map((p: any) => ({
    name: p.name,
    address: p.formatted_address ?? "",
    place_id: p.place_id,
    geometry: p.geometry?.location ? { location: p.geometry.location } : undefined,
    types: p.types ?? [],
    rating: p.rating,
    ratingCount: p.user_ratings_total,
    openNow: p.opening_hours?.open_now,
  }));
}

/** Try Places API (New); if this key's project only has the legacy API enabled, fall back to it. */
export async function searchPlaces(apiKey: string, text: string, near: { lat: number; lng: number } | null) {
  try {
    return await searchPlacesNew(apiKey, text, near);
  } catch (err) {
    if (!(err instanceof PlacesNotEnabled)) throw err;
    return searchPlacesLegacy(apiKey, text, near);
  }
}

/** Search Google Places for stringers. Free accounts get the top few; paid see all. */
stringersRouter.get(
  "/api/stringers/search",
  rateLimit({ windowMs: 60_000, max: 30 }),
  asyncHandler(async (req, res) => {
    const { query, lat, lng } = req.query as { query?: string; lat?: string; lng?: string };
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "Stringer search isn't configured yet.", results: [], total: 0 });
    }

    const latN = Number(lat);
    const lngN = Number(lng);
    const near = lat && lng && Number.isFinite(latN) && Number.isFinite(lngN) ? { lat: latN, lng: lngN } : null;
    const text = near ? "tennis racket stringing" : query?.trim() ? `tennis racket stringing near ${query.trim().slice(0, 120)}` : null;
    if (!text) return res.json({ results: [], total: 0, limited: false });

    let all: PlaceResult[];
    try {
      all = await searchPlaces(apiKey, text, near);
    } catch (err) {
      console.error("[stringers] search failed:", err);
      return res.status(502).json({ message: "Stringer search is unavailable right now.", results: [], total: 0 });
    }

    const user = await loadUser(req);
    const unlimited = !!req.entitlements?.allStringers;
    const results = unlimited ? all : all.slice(0, FREE_STRINGER_RESULTS);
    res.json({ results, total: all.length, limited: !unlimited && all.length > results.length, signedIn: !!user });
  }),
);

// ─── My stringers ───────────────────────────────────────────────────────────

stringersRouter.use("/api/stringers/saved", requireAuth);

stringersRouter.get(
  "/api/stringers/saved",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [list, jobs] = await Promise.all([storage.getSavedStringers(user.id), storage.getStringJobsForUser(user.id)]);
    const usage = new Map<number, { count: number; last: Date | null }>();
    for (const j of jobs) {
      if (!j.stringerId) continue;
      const u = usage.get(j.stringerId) ?? { count: 0, last: null };
      u.count++;
      if (!u.last || j.strungAt > u.last) u.last = j.strungAt;
      usage.set(j.stringerId, u);
    }
    res.json(
      list.map((s) => ({ ...s, jobCount: usage.get(s.id)?.count ?? 0, lastJobAt: usage.get(s.id)?.last ?? null })),
    );
  }),
);

stringersRouter.post(
  "/api/stringers/saved",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const data = parseBody(savedStringerInputSchema, req.body, res);
    if (!data) return;
    if (data.stringerPlaceId) {
      const existing = (await storage.getSavedStringers(user.id)).find((s) => s.stringerPlaceId === data.stringerPlaceId);
      if (existing) return res.status(200).json({ ...existing, alreadySaved: true });
    }
    const stringer = await storage.createSavedStringer(user.id, data);
    res.status(201).json(stringer);
  }),
);

stringersRouter.patch(
  "/api/stringers/saved/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    const data = parseBody(savedStringerInputSchema.partial(), req.body, res);
    if (!data) return;
    const updated = id ? await storage.updateSavedStringer(id, user.id, data) : undefined;
    if (!updated) return res.status(404).json({ message: "Stringer not found" });
    res.json(updated);
  }),
);

stringersRouter.delete(
  "/api/stringers/saved/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const id = parseId(req.params.id);
    if (id) await storage.deleteSavedStringer(id, user.id);
    res.json({ success: true });
  }),
);
