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
    ],
  },
  club: {
    name: "Club",
    price: "$1.99",
    cadence: "per month",
    amountCents: 199,
    features: ["Everything in Pro", "Live AI racket technician chat", "Priority support"],
  },
} as const;
