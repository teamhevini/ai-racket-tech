import type {
  SavedRacket,
  SavedStringer,
  StringJob,
  RecommendationOutput,
  Racket,
  UserTier,
} from "@shared/schema";
import type { Entitlements } from "@shared/tiers";
import type { ReminderStatus, StringMaterial } from "@shared/reminders";

/** Dates arrive from the API as ISO strings. */
type Jsonify<T> = T extends Date ? string : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T;

export interface Me {
  id: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  tier: UserTier;
  isAdmin: boolean;
  entitlements: Entitlements;
  /** Set when this account runs a stringing shop on 10IS. */
  shop?: { id: number; slug: string; name: string; plan: "free" | "pro" } | null;
  /** Set when this account manages a string company, racket brand or retailer. */
  brand?: { id: number; slug: string; name: string; kind: "string" | "racket" | "retailer"; plan: "free" | "insights" | "partner" } | null;
}

export interface ReminderJson {
  status: ReminderStatus;
  intervalDays: number;
  lastStrungAt: string | null;
  dueAt: string | null;
  daysLeft: number | null;
  freshness: number;
  material: StringMaterial;
}

export type StringJobJson = Jsonify<StringJob>;
export type SavedStringerJson = Jsonify<SavedStringer>;
export type CatalogRacket = Jsonify<Racket>;

export type BagRacket = Jsonify<SavedRacket> & {
  latestJob: StringJobJson | null;
  jobCount: number;
  reminder: ReminderJson;
};

export interface BagResponse {
  rackets: BagRacket[];
  limit: number | null;
  emailReminders: boolean;
}

export interface RacketDetail {
  racket: BagRacket;
  history: Array<StringJobJson & { stringer: SavedStringerJson | null }>;
  totalJobs: number;
  hiddenJobs: number;
  fullHistory: boolean;
  recommendations: Array<{ id: number; createdAt: string; confidence: string; output: RecommendationOutput }>;
  stats: {
    restrings: number;
    averageDaysBetween: number | null;
    totalSpent: number | null;
    averageTension: number | null;
    firstStrungAt: string;
  } | null;
}

export type MyStringer = SavedStringerJson & { jobCount: number; lastJobAt: string | null; shopSlug: string | null };

export interface PlaceResult {
  name: string;
  address: string;
  place_id: string;
  geometry?: { location: { lat: number; lng: number } };
  types: string[];
  rating?: number;
  ratingCount?: number;
  openNow?: boolean;
}

export interface StringerSearchResponse {
  results: PlaceResult[];
  total: number;
  limited: boolean;
  signedIn?: boolean;
  message?: string;
}

export interface RecommendationRunResponse {
  runId: number;
  recommendation: RecommendationOutput;
  confidence: "high" | "medium" | "estimated";
  createdAt?: string;
  fallback?: boolean;
  racket?: {
    id: number;
    brand: string;
    model: string;
    recTensionMin: number | null;
    recTensionMax: number | null;
    headSize?: number | null;
    stringPattern?: string | null;
    stiffnessRa?: number | null;
    weightUnstrung?: number | null;
    balance?: string | null;
    beamWidth?: string | null;
  } | null;
  racketLabel?: string | null;
  inputs?: Record<string, unknown>;
  isOwner?: boolean;
  savedRacketId?: number | null;
}

export interface HistoryRun {
  id: number;
  createdAt: string;
  confidence: string;
  output: RecommendationOutput;
  savedRacketId: number | null;
  racketLabel: string | null;
}

export interface Profile extends Me {
  createdAt: string | null;
  reminderEnabled: boolean;
  hasSubscription: boolean;
  hasPassword: boolean;
}
