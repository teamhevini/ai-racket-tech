import type { UserTier } from "./schema";

/** Free accounts can keep this many rackets in their bag. */
export const FREE_RACKET_LIMIT = 3;
/** Free accounts see this many history entries per racket; paid plans see everything. */
export const FREE_HISTORY_LIMIT = 3;
/** Free accounts see this many stringer search results. */
export const FREE_STRINGER_RESULTS = 3;
/** Free accounts can browse this many catalog rackets per brand. */
export const FREE_CATALOG_PER_BRAND = 3;

export interface Entitlements {
  tier: UserTier;
  isPaid: boolean;
  isClub: boolean;
  unlimitedRackets: boolean;
  fullHistory: boolean;
  allStringers: boolean;
  fullCatalog: boolean;
  share: boolean;
  chat: boolean;
  emailReminders: boolean;
  /** Paid players never see sponsored placements. */
  adFree: boolean;
}

export function entitlementsFor(tier: UserTier, isAdmin = false): Entitlements {
  const isPaid = isAdmin || tier === "pro" || tier === "club";
  const isClub = isAdmin || tier === "club";
  return {
    tier,
    isPaid,
    isClub,
    unlimitedRackets: isPaid,
    fullHistory: isPaid,
    allStringers: isPaid,
    fullCatalog: isPaid,
    share: isPaid,
    chat: isClub,
    emailReminders: true,
    adFree: isPaid,
  };
}

export const PLANS = {
  pro: {
    name: "Pro",
    price: "$4.99",
    cadence: "one-time",
    amountCents: 499,
    features: [
      "Unlimited rackets in your bag",
      "Full restring history for every racket",
      "Every stringer near you",
      "The full racket catalog",
      "Shareable setup links",
      "No sponsored placements",
    ],
  },
  club: {
    name: "Club",
    price: "$1.99",
    cadence: "per month",
    amountCents: 199,
    features: ["Everything in Pro", "Live AI racket technician chat", "No sponsored placements", "Priority support"],
  },
} as const;

// ─── 10IS for Business ──────────────────────────────────────────────────────

/** Bookings a free shop can take through 10IS per calendar month (walk-ins are unlimited). */
export const FREE_SHOP_MONTHLY_BOOKINGS = 20;
/** Insights never show a group with fewer distinct players than this. */
export const K_ANONYMITY = 5;
/** 10IS keeps this share of a sample programme's install fee; the stringer gets the rest. */
export const SAMPLE_PLATFORM_FEE_PCT = 20;

export const SHOP_PLANS = {
  free: {
    name: "Shop",
    price: "$0",
    cadence: "forever",
    amountCents: 0,
    features: [
      "Public shop page with online booking",
      `${FREE_SHOP_MONTHLY_BOOKINGS} app bookings a month, unlimited walk-ins`,
      "Job queue with live status for players",
      "Your own job history per customer racket",
    ],
  },
  pro: {
    name: "Shop Pro",
    price: "$19",
    cadence: "per month",
    amountCents: 1900,
    features: [
      "Unlimited app bookings",
      "Full racket history from every stringer (with the player's consent)",
      "Rebook prompts when your customers' strings are due",
      "Paid brand sample installs",
      "Shop insights: regulars, revenue, top strings",
    ],
  },
} as const;

export const BRAND_PLANS = {
  free: {
    name: "Listing",
    price: "$0",
    cadence: "forever",
    amountCents: 0,
    features: ["Verified brand page", "Manage your string catalogue and specs", "Sponsored placements, pay per click", "Campaign reporting"],
  },
  insights: {
    name: "Insights",
    price: "$490",
    cadence: "per month",
    amountCents: 49000,
    features: [
      "Everything in Listing",
      "Demand: how often the AI recommends you vs. the category",
      "Retention: who re-strings with you and where switchers go",
      "Ratings by string, level and playstyle",
      "Pseudonymised and aggregated, never below 5 players per group",
    ],
  },
  partner: {
    name: "Partner",
    price: "$1,490",
    cadence: "per month",
    amountCents: 149000,
    features: ["Everything in Insights", "Sample programmes through partner stringers", "Sample-to-rebuy tracking", "Quarterly category report"],
  },
} as const;

export const SPONSORED_MIN_CPC_CENTS = 80;
