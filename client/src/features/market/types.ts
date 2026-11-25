import { money } from "@/lib/format";

/** Shapes returned by the 10IS for Business public API (see server/routes/shops.ts, marketplace.ts). */

export interface MarketShop {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  bio?: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email?: string | null;
  website?: string | null;
  labourCents: number;
  rushCents: number;
  turnaroundHours: number;
  acceptingBookings: boolean;
  pro: boolean;
  isDemo: boolean;
  certifications: string | null;
  machine: string | null;
  openingHours: string | null;
  rating?: { avg: number | null; count: number; jobs: number };
}

export interface SampleProgram {
  id: number;
  title: string;
  pitch: string | null;
  brandName: string;
  stringId: number;
  model: string;
  unitsLeft: number;
}

export interface ShopDetail extends MarketShop {
  popularStrings: Array<{ id: number; brandName: string; model: string; family: string }>;
  samplePrograms: SampleProgram[];
}

export interface CatalogString {
  id: number;
  brandId: number | null;
  brandName: string;
  brandSlug?: string | null;
  brandVerified?: boolean;
  model: string;
  family: string;
  gauges: string | null;
  stiffness: number | null;
  comfort: number | null;
  spin: number | null;
  control: number | null;
  power: number | null;
  durability: number | null;
  setPriceCents: number | null;
  description: string | null;
}

export interface Offer {
  id: number;
  priceCents: number;
  inStock: boolean;
  retailer: string;
}

export interface StringDetailResponse extends CatalogString {
  brand: { name: string; slug: string; verified: boolean; accent: string | null } | null;
  offers: Offer[];
  rating: { avg: number; players: number } | null;
  sampleShops: Array<{ programId: number; title: string; shopSlug: string; shopName: string; city: string | null }>;
}

export interface BrandResponse {
  id: number;
  slug: string;
  name: string;
  kind: "string" | "racket" | "retailer";
  tagline: string | null;
  about: string | null;
  website: string | null;
  accent: string | null;
  verified: boolean;
  isDemo: boolean;
  strings: CatalogString[];
  programs: Array<{ id: number; title: string; pitch: string | null; stringId: number }>;
}

export type BookingStatus = "requested" | "accepted" | "in_progress" | "ready" | "collected" | "cancelled" | "declined";

export interface PlayerBooking {
  id: number;
  shopId: number;
  savedRacketId: number | null;
  racketLabel: string;
  stringId: number | null;
  mains: string | null;
  crosses: string | null;
  gauge: string | null;
  tensionMains: number | null;
  tensionCrosses: number | null;
  playerSuppliesString: boolean;
  rush: boolean;
  dropOffAt: string;
  dueAt: string;
  status: BookingStatus;
  statusLog: Array<{ status: BookingStatus; at: string; note?: string }>;
  priceCents: number | null;
  notes: string | null;
  shopNotes: string | null;
  sampleProgramId: number | null;
  rating: number | null;
  source: string;
  createdAt: string;
  shop: MarketShop;
}

export interface SuggestResponse {
  shop: MarketShop | null;
  prefill: {
    stringId: number | null;
    mains: string | null;
    crosses: string | null;
    gauge: string | null;
    tensionMains: number | null;
    tensionCrosses: number | null;
  } | null;
}

export interface SponsoredPlacement {
  label: "Sponsored";
  paidBy: string;
  campaignId: number;
  headline: string;
  fitScore: number;
  whyShown: string[];
  disclosure: string;
  string: {
    id: number;
    brandName: string;
    model: string;
    family: string;
    gauges: string | null;
    setPriceCents: number | null;
    description: string | null;
  };
}

export interface WhereToBuyResponse {
  strings: Array<{ id: number; brandName: string; model: string; family: string; setPriceCents: number | null; offers: Offer[] }>;
}

export type BookingSource = "app" | "reminder" | "sample" | "profile";

/** Everything a booking can be pre-filled with. Carried between pages via the query string. */
export interface BookingPrefill {
  savedRacketId?: number | null;
  racketLabel?: string | null;
  stringId?: number | null;
  mains?: string | null;
  crosses?: string | null;
  gauge?: string | null;
  tensionMains?: number | null;
  tensionCrosses?: number | null;
  recommendationRunId?: number | null;
  sampleProgramId?: number | null;
  /** Shown in the sheet when claiming a sample, e.g. "Free Ridge Soft restring". */
  sampleTitle?: string | null;
  affiliateCode?: string | null;
  source?: BookingSource;
}

export const ACTIVE_STATUSES: BookingStatus[] = ["requested", "accepted", "in_progress", "ready"];

export const cents = (c: number | null | undefined) => (c == null ? "—" : money(c / 100));

export const stringName = (s: { brandName: string; model: string }) => `${s.brandName} ${s.model}`;

export function turnaroundLabel(hours: number) {
  if (hours <= 24) return hours <= 4 ? `${hours} h` : "Same / next day";
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

const num = (v: string | null) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** `book=1&racket=…` — read back by prefillFromSearch on the shop page. */
export function bookingQuery(p: BookingPrefill & { book?: boolean } = {}): string {
  const q = new URLSearchParams();
  if (p.book !== false) q.set("book", "1");
  if (p.savedRacketId) q.set("racket", String(p.savedRacketId));
  else if (p.racketLabel) q.set("label", p.racketLabel);
  if (p.stringId) q.set("string", String(p.stringId));
  if (p.mains && !p.stringId) q.set("mains", p.mains);
  if (p.crosses) q.set("crosses", p.crosses);
  if (p.gauge) q.set("gauge", p.gauge);
  if (p.tensionMains != null) q.set("tm", String(p.tensionMains));
  if (p.tensionCrosses != null) q.set("tc", String(p.tensionCrosses));
  if (p.recommendationRunId) q.set("run", String(p.recommendationRunId));
  if (p.affiliateCode) q.set("ref", p.affiliateCode);
  if (p.source && p.source !== "app") q.set("source", p.source);
  return q.toString();
}

export function prefillFromSearch(search: string): (BookingPrefill & { book: boolean }) | null {
  const q = new URLSearchParams(search);
  const p: BookingPrefill & { book: boolean } = {
    book: q.get("book") === "1" || q.has("racket") || q.has("string"),
    savedRacketId: num(q.get("racket")),
    racketLabel: q.get("label"),
    stringId: num(q.get("string")),
    mains: q.get("mains"),
    crosses: q.get("crosses"),
    gauge: q.get("gauge"),
    tensionMains: num(q.get("tm")),
    tensionCrosses: num(q.get("tc")),
    recommendationRunId: num(q.get("run")),
    affiliateCode: q.get("ref"),
  };
  const source = q.get("source");
  if (source === "reminder" || source === "sample" || source === "profile") p.source = source;
  return p.book || p.affiliateCode ? p : null;
}

/** Merge prefill layers; later layers win, but null/undefined never overwrite. */
export function mergePrefill(...layers: Array<BookingPrefill | null | undefined>): BookingPrefill {
  const out: BookingPrefill = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [k, v] of Object.entries(layer)) {
      if (v !== null && v !== undefined && v !== "") (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}
