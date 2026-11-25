import * as React from "react";
import { Info } from "lucide-react";
import type { Brand, Campaign, RetailOffer, SampleProgram, TennisString } from "@shared/schema";
import { BRAND_PLANS } from "@shared/tiers";
import { Card } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** Dates arrive from the API as ISO strings. */
type Jsonify<T> = T extends Date ? string : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T;

export type BrandJson = Jsonify<Brand>;
export type BrandString = Jsonify<TennisString>;
export type BrandPlanId = keyof typeof BRAND_PLANS;

export interface BrandMeResponse {
  brand: BrandJson | null;
  strings?: BrandString[];
  plans: typeof BRAND_PLANS;
  insightsUnlocked?: boolean;
}

export const brandMeKey = ["/api/brand/me"] as const;

export type CampaignRow = Jsonify<Campaign> & {
  stringModel: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spendCents: number;
  monthSpendCents: number;
  avgFit: number | null;
  bookings: number;
};

export interface ReachResponse {
  sampled: number;
  eligible: number;
  eligiblePct: number;
  avgFit: number | null;
  heldBack: Array<{ reason: string; n: number }>;
  specsPending: boolean;
}

export interface SampleStat {
  id: number;
  title: string;
  status: string;
  unitsTotal: number;
  claimed: number;
  installed: number;
  avgRating: number | null;
  rebought: number;
  rebuyRate: number | null;
  spendCents: number;
}

export interface ProgramsResponse {
  unlocked: boolean;
  programs: Array<Jsonify<SampleProgram> & { shops: number; stats: SampleStat | null }>;
  shops: Array<{ id: number; name: string; city: string | null }>;
}

export type OfferRow = Jsonify<RetailOffer> & { brandName: string; model: string };
export type CatalogString = BrandString & { brandSlug: string | null; brandVerified: boolean };

type Named = { name: string; share?: number | null; players: number | null };

export interface StringInsights {
  windowWeeks: number;
  kAnonymity: number;
  weekly: Array<{ week: string; recommended: number | null; total: number | null; share: number | null }>;
  funnel: Array<{ stage: string; players: number | null }>;
  ratings: Array<{ stringId: number; model: string; avg: number | null; players: number | null }>;
  levels: Named[];
  playstyles: Named[];
  retention: { cohort: number | null; rate: number | null; switchedTo: Array<{ brand: string; players: number }> };
  regions: Array<{ name: string; players: number }>;
  frames: Array<{ name: string; players: number }>;
  samples: SampleStat[];
}

export interface RacketInsights {
  windowWeeks: number;
  kAnonymity: number;
  players: number | null;
  playersWithFrameInBag: number | null;
  pairings: Array<{ name: string; players: number }>;
  levels: Array<{ name: string; players: number }>;
}

export interface RetailerInsights {
  offers: Array<{ stringId: number; model: string; brandName: string; clicks: number; orders: number; revenueCents: number; commissionCents: number }>;
}

export type InsightsResponse =
  | { kind: "string"; unlocked: true; data: StringInsights }
  | { kind: "racket"; unlocked: true; data: RacketInsights }
  | { kind: "retailer"; unlocked: true; data: RetailerInsights };

// ─── Formatting ─────────────────────────────────────────────────────────────

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dollars = (cents: number | null | undefined) => (cents == null ? "—" : usd.format(cents / 100));
export const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);
export const int = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
/** "$1.25" / "1.25" → 125 cents; NaN when it isn't a number. */
export const toCents = (s: string) => Math.round(parseFloat(s.replace(/[$,\s]/g, "")) * 100);
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const KIND_LABEL: Record<BrandJson["kind"], string> = {
  string: "String company",
  racket: "Racket brand",
  retailer: "Retailer",
};

export const SUPPRESSED_NOTE = "Hidden: fewer than 5 players";

// ─── Building blocks ────────────────────────────────────────────────────────

/** A value that may be k-anonymity suppressed (null). */
export function Kv({ value, format = int, className }: { value: number | null | undefined; format?: (n: number) => string; className?: string }) {
  if (value == null) {
    return (
      <span title={SUPPRESSED_NOTE} aria-label={SUPPRESSED_NOTE} className={cn("cursor-help text-faint", className)}>
        —
      </span>
    );
  }
  return <span className={cn("tabular", className)}>{format(value)}</span>;
}

export function Panel({
  title,
  eyebrow,
  description,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h3 className="display text-2xl leading-tight">{title}</h3>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "up" | "down" | "flat";
}) {
  return (
    <Card className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="display mt-3 truncate text-[2rem] leading-none tabular sm:text-[2.5rem]">{value}</p>
      {sub && (
        <p
          className={cn(
            "mt-2 text-xs leading-snug",
            tone === "up" ? "text-grass" : tone === "down" ? "text-brand" : "text-muted",
          )}
        >
          {sub}
        </p>
      )}
    </Card>
  );
}

export function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs leading-relaxed text-muted", className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function AccentDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3 shrink-0 rounded-full ring-2 ring-surface", className)}
      style={{ background: color || "rgb(var(--ink))" }}
    />
  );
}

/** Pill tabs that scroll horizontally on phones. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  React.useEffect(() => {
    const el = refs.current[value];
    const strip = el?.parentElement;
    if (!el || !strip) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [value]);
  return (
    <div role="tablist" aria-label={label} className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => (refs.current[t.id] = el)}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-spring",
            value === t.id ? "bg-ink text-bg" : "bg-surface text-muted ring-1 ring-line hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Status dot + label (never colour alone). */
export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "active" ? "bg-grass" : status === "paused" ? "bg-clay" : status === "draft" ? "bg-faint" : "bg-muted";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink">
      <span aria-hidden className={cn("size-1.5 rounded-full", tone)} />
      {cap(status)}
    </span>
  );
}

/** Shown on tabs whose output reaches players, until 10IS has verified the brand. */
export function VerifyNotice({ brand, what }: { brand: BrandJson; what: string }) {
  if (brand.claimed) return null;
  return (
    <div className="flex gap-3 rounded-2xl bg-clay-soft px-4 py-3 text-sm leading-relaxed text-clay" role="status">
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-clay" />
      <p>
        <span className="font-semibold">Verification pending.</span> {what} go live once we've confirmed you represent {brand.name}, so nobody can
        advertise or send players to a link under a lookalike name. Email{" "}
        <a className="font-semibold underline underline-offset-4" href="mailto:partners@10is.app">
          partners@10is.app
        </a>{" "}
        from a company address{brand.website ? ` on ${(() => { try { return new URL(brand.website).hostname.replace(/^www\./, ""); } catch { return brand.website; } })()}` : ""}.
      </p>
    </div>
  );
}
