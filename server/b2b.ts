import crypto from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  brands,
  bookings,
  savedRackets,
  savedStringers,
  shops,
  stringJobs,
  stringSignals,
  strings,
  users,
  type Booking,
  type BookingStatus,
  type Brand,
  type OnboardingInputs,
  type RecommendationOutput,
  type Shop,
  type TennisString,
} from "@shared/schema";
import { mentionsString } from "@shared/sponsor-fit";
import { resendSender } from "./reminder-mailer";
import { log } from "./log";

// ─── Ownership ──────────────────────────────────────────────────────────────

export async function shopForOwner(userId: number): Promise<Shop | undefined> {
  const [s] = await db.select().from(shops).where(eq(shops.ownerUserId, userId));
  return s;
}

export async function brandForOwner(userId: number): Promise<Brand | undefined> {
  const [b] = await db.select().from(brands).where(eq(brands.ownerUserId, userId));
  return b;
}

export function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status, expose: true });
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

export async function uniqueSlug(table: typeof shops | typeof brands, base: string): Promise<string> {
  let slug = slugify(base);
  if (slug.length < 3) slug = `${slug}-shop`;
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const [hit] = await db.select({ id: table.id }).from(table).where(eq(table.slug, candidate));
    if (!hit) return candidate;
  }
  return `${slug}-${crypto.randomBytes(3).toString("hex")}`;
}

// ─── Catalogue matching ─────────────────────────────────────────────────────

let catalogCache: { at: number; rows: TennisString[] } | null = null;
export async function activeStrings(): Promise<TennisString[]> {
  if (catalogCache && Date.now() - catalogCache.at < 30_000) return catalogCache.rows;
  const rows = await db.select().from(strings).where(eq(strings.active, true));
  catalogCache = { at: Date.now(), rows };
  return rows;
}
export function invalidateCatalog() {
  catalogCache = null;
}

/** Catalogue strings named in free text, e.g. the AI's "Luxilon ALU Power 125". */
export async function matchCatalog(texts: string[]): Promise<TennisString[]> {
  const catalog = await activeStrings();
  const out = new Map<number, TennisString>();
  for (const t of texts) {
    // Prefer the longest (most specific) match: "Hyper-G Soft" over "Hyper-G".
    const hits = catalog.filter((s) => mentionsString(t, s)).sort((a, b) => b.model.length - a.model.length);
    if (hits[0]) out.set(hits[0].id, hits[0]);
  }
  return [...out.values()];
}

// ─── Anonymised signals ─────────────────────────────────────────────────────

const signalKey = () => process.env.SESSION_SECRET || "dev-secret-change-in-prod";

/** Keyed hash: stable per player so retention can be measured, but not reversible. */
export function playerHash(id: string | number | null | undefined): string | null {
  if (id === null || id === undefined || id === "") return null;
  return crypto.createHmac("sha256", signalKey()).update(`player:${id}`).digest("hex").slice(0, 24);
}

export interface SignalInput {
  stringId: number;
  kind: "recommended" | "alternative" | "booked" | "installed" | "rated" | "affiliate_click" | "sample";
  player?: string | number | null;
  level?: string | null;
  playstyle?: string | null;
  region?: string | null;
  rating?: number | null;
  racketBrand?: string | null;
  createdAt?: Date;
}

export async function recordSignals(items: SignalInput[]): Promise<void> {
  if (!items.length) return;
  try {
    await db.insert(stringSignals).values(
      items.map((s) => ({
        stringId: s.stringId,
        kind: s.kind,
        playerHash: playerHash(s.player),
        level: s.level ?? null,
        playstyle: s.playstyle ?? null,
        region: s.region ?? null,
        rating: s.rating ?? null,
        racketBrand: s.racketBrand ?? null,
        ...(s.createdAt ? { createdAt: s.createdAt } : {}),
      })),
    );
  } catch (err) {
    // Signals are analytics; never fail the player's request because of them.
    console.warn("[signals] failed to record:", (err as Error).message);
  }
}

/** Called after a recommendation is stored. Reads the output; never changes it. */
export async function recordRecommendationSignals(
  output: Readonly<RecommendationOutput>,
  inputs: OnboardingInputs,
  player: string | number | null,
  racketBrand: string | null,
) {
  const { mains, crosses } = output.setup;
  const primary = await matchCatalog([mains, crosses].filter(Boolean).flatMap((s) => s!.exampleStrings));
  const primaryIds = new Set(primary.map((s) => s.id));
  const alts = (await matchCatalog(output.alternatives.flatMap((a) => a.exampleStrings))).filter((s) => !primaryIds.has(s.id));
  const base = { player, level: inputs.level ?? null, playstyle: inputs.playstyle ?? null, racketBrand };
  await recordSignals([
    ...primary.map((s) => ({ ...base, stringId: s.id, kind: "recommended" as const })),
    ...alts.map((s) => ({ ...base, stringId: s.id, kind: "alternative" as const })),
  ]);
}

// ─── Booking lifecycle ──────────────────────────────────────────────────────

export const NEXT_STATUS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["accepted", "declined", "cancelled"],
  accepted: ["in_progress", "ready", "cancelled"],
  in_progress: ["ready", "accepted"],
  ready: ["collected", "in_progress"],
  collected: [],
  cancelled: [],
  declined: [],
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  accepted: "Confirmed",
  in_progress: "On the machine",
  ready: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
  declined: "Declined",
};

export function dueFrom(dropOff: Date, shop: Pick<Shop, "turnaroundHours">, rush: boolean): Date {
  const hours = rush ? Math.max(4, Math.round(shop.turnaroundHours / 2)) : shop.turnaroundHours;
  return new Date(dropOff.getTime() + hours * 3_600_000);
}

export function priceFor(shop: Pick<Shop, "labourCents" | "rushCents">, string: TennisString | null | undefined, opts: { rush: boolean; supplies: boolean }) {
  return shop.labourCents + (opts.rush ? shop.rushCents : 0) + (!opts.supplies && string?.setPriceCents ? string.setPriceCents : 0);
}

/**
 * When the racket is strung, write the job into the player's own bag history so
 * their reminder resets and the job shows up next to every other restring.
 */
export async function writeJobToBag(booking: Booking, shop: Shop): Promise<number | null> {
  if (booking.stringJobId || !booking.playerUserId || !booking.savedRacketId) return booking.stringJobId ?? null;
  const [racket] = await db
    .select()
    .from(savedRackets)
    .where(and(eq(savedRackets.id, booking.savedRacketId), eq(savedRackets.userId, booking.playerUserId)));
  if (!racket) return null;
  let [stringer] = await db
    .select()
    .from(savedStringers)
    .where(and(eq(savedStringers.userId, booking.playerUserId), eq(savedStringers.shopId, shop.id)));
  if (!stringer) {
    [stringer] = await db
      .insert(savedStringers)
      .values({
        userId: booking.playerUserId,
        stringerName: shop.name,
        stringerAddress: [shop.address, shop.city].filter(Boolean).join(", ") || null,
        phone: shop.phone,
        email: shop.email,
        website: shop.website,
        shopId: shop.id,
      })
      .returning();
  }
  const [job] = await db
    .insert(stringJobs)
    .values({
      userId: booking.playerUserId,
      savedRacketId: booking.savedRacketId,
      stringerId: stringer.id,
      recommendationRunId: booking.recommendationRunId,
      strungAt: new Date(),
      mains: booking.mains,
      crosses: booking.crosses,
      gauge: booking.gauge,
      tensionMains: booking.tensionMains,
      tensionCrosses: booking.tensionCrosses,
      price: booking.priceCents != null ? booking.priceCents / 100 : null,
      notes: booking.shopNotes ? `${shop.name}: ${booking.shopNotes}` : `Strung by ${shop.name}`,
      bookingId: booking.id,
      stringId: booking.stringId,
    })
    .returning();
  // A fresh job restarts the reminder clock.
  await db.update(savedRackets).set({ lastReminderSentAt: null }).where(eq(savedRackets.id, racket.id));
  return job.id;
}

export async function notifyPlayer(booking: Booking, shop: Shop, status: BookingStatus) {
  if (!process.env.RESEND_API_KEY || !booking.customerEmail) return;
  if (!["accepted", "ready", "declined"].includes(status)) return;
  const appUrl = process.env.APP_URL ?? "https://10is.app";
  const line =
    status === "ready"
      ? `${booking.racketLabel} is strung and ready for pickup at ${shop.name}.`
      : status === "accepted"
        ? `${shop.name} confirmed your restring for ${booking.racketLabel}.`
        : `${shop.name} can't take this restring. Book another stringer in 10IS.`;
  try {
    await resendSender({
      to: booking.customerEmail,
      subject: `${STATUS_LABEL[status]} · ${booking.racketLabel}`,
      text: `${line}\n\nTrack it: ${appUrl}/bookings`,
      html: `<p>${line}</p><p><a href="${appUrl}/bookings">Track it in 10IS</a></p>`,
    });
  } catch (err) {
    log(`booking email failed: ${(err as Error).message}`, "b2b");
  }
}

export async function bookingsThisMonth(shopId: number): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.shopId, shopId), sql`${bookings.playerUserId} is not null`, sql`${bookings.createdAt} >= ${start}`));
  return row?.n ?? 0;
}

export async function usersByIds(ids: number[]) {
  if (!ids.length) return new Map<number, { id: number; firstName: string | null; lastName: string | null }>();
  const rows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(inArray(users.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
