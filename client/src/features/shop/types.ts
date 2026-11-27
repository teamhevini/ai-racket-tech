import type { SHOP_PLANS } from "@shared/tiers";

export type BookingStatus = "requested" | "accepted" | "in_progress" | "ready" | "collected" | "cancelled" | "declined";

export interface ShopRecord {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  certifications: string | null;
  machine: string | null;
  openingHours: string | null;
  labourCents: number;
  rushCents: number;
  turnaroundHours: number;
  acceptingBookings: boolean;
  plan: "free" | "pro";
  stripeCustomerId: string | null;
}

export interface ShopMe {
  shop: ShopRecord | null;
  counts?: { active: number; requested: number; ready: number; dueToday: number };
  usage?: { bookingsThisMonth: number; limit: number | null };
  plans?: typeof SHOP_PLANS;
}

export interface StatusLogEntry {
  status: BookingStatus;
  at: string;
  note?: string;
}

export interface Booking {
  id: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  racketLabel: string;
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
  statusLog: StatusLogEntry[];
  priceCents: number | null;
  notes: string | null;
  shopNotes: string | null;
  playerUserId: number | null;
  source: string;
  rating: number | null;
}

export interface QueueItem extends Booking {
  string: { id: number; brandName: string; model: string; family: string } | null;
  sample: { id: number; title: string; fee: number } | null;
}

export interface HistoryJob {
  id: number;
  strungAt: string;
  mains: string | null;
  crosses: string | null;
  gauge: string | null;
  tensionMains: number | null;
  tensionCrosses: number | null;
  rating: number | null;
  stringerName: string | null;
}

export interface JobDetail {
  booking: Booking;
  racket: { brand: string | null; model: string | null; headSize: number | null; stringPattern: string | null } | null;
  string: { id: number; brandName: string; model: string; family: string } | null;
  sample: { id: number; title: string; payoutCents: number } | null;
  atThisShop: Booking[];
  fullHistory: HistoryJob[] | null;
  historyState: "shared" | "not-shared" | "locked" | "none";
  next: BookingStatus[];
}

export interface CatalogString {
  id: number;
  brandName: string;
  model: string;
  family: string;
  setPriceCents: number | null;
}

export interface Customer {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  app: boolean;
  jobs: number;
  spentCents: number;
  lastAt: string;
  rackets: string[];
  due: Array<{ label: string; status: string; daysLeft: number | null }> | null;
}

export interface Insights {
  monthly: Array<{ month: string; jobs: number; revenueCents: number; app: number }>;
  topStrings: Array<{ brandName: string; model: string; jobs: number; avgRating: number | null }>;
  repeatRate: number | null;
  customers: number;
  avgRating: number | null;
  sampleInstalls: number;
  samplePayoutCents: number;
}

export interface Programs {
  pro: boolean;
  feePct: number;
  programs: Array<{
    id: number;
    title: string;
    pitch: string | null;
    brandName: string;
    string: { id: number; brandName: string; model: string; family: string };
    payoutCents: number;
    joined: boolean;
  }>;
}
