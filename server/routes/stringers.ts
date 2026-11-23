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

    const params = new URLSearchParams({ key: apiKey });
    const latN = Number(lat);
    const lngN = Number(lng);
    if (lat && lng && Number.isFinite(latN) && Number.isFinite(lngN)) {
      params.set("query", "tennis racket stringing");
      params.set("location", `${latN},${lngN}`);
      params.set("radius", "25000");
    } else if (query && query.trim()) {
      params.set("query", `tennis racket stringing near ${query.trim().slice(0, 120)}`);
    } else {
      return res.json({ results: [], total: 0, limited: false });
    }

    let data: any;
    try {
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error(`Places ${r.status}`);
      data = await r.json();
    } catch (err) {
      console.error("[stringers] search failed:", err);
      return res.status(502).json({ message: "Stringer search is unavailable right now.", results: [], total: 0 });
    }
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[stringers] Places error:", data.status, data.error_message);
      return res.status(502).json({ message: "Stringer search is unavailable right now.", results: [], total: 0 });
    }

    const all: PlaceResult[] = (data.results ?? []).map((p: any) => ({
      name: p.name,
      address: p.formatted_address ?? "",
      place_id: p.place_id,
      geometry: p.geometry?.location ? { location: p.geometry.location } : undefined,
      types: p.types ?? [],
      rating: p.rating,
      ratingCount: p.user_ratings_total,
      openNow: p.opening_hours?.open_now,
    }));

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
