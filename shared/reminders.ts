/**
 * Restring reminder maths. Shared by the server (emails) and the client (UI),
 * so the date a player sees is the date they get reminded on.
 *
 * Rule of thumb used by stringers: strings go "dead" after a number of playing
 * hours, not calendar days. Polyester loses tension fastest (~20 hours of play);
 * multifilament, synthetic gut and natural gut last roughly twice as long.
 */

export const DEFAULT_HOURS_PER_WEEK = 3;
export const POLY_PLAYABLE_HOURS = 20;
export const SOFT_PLAYABLE_HOURS = 40;
export const MIN_INTERVAL_DAYS = 7;
export const MAX_INTERVAL_DAYS = 180;
export const DUE_SOON_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const POLY_HINTS = [
  "poly",
  "co-poly",
  "copoly",
  "alu",
  "rpm",
  "hyper-g",
  "hyper g",
  "4g",
  "lynx",
  "tour bite",
  "ice code",
  "sg spiral",
  "black code",
  "red code",
  "confidential",
  "element",
  "big banger",
  "razor",
  "revolve",
  "ghost",
  "barb",
  "outlast",
];

const SOFT_HINTS = ["multi", "gut", "nxt", "x-one", "xone", "synthetic", "vs touch", "velocity", "triax", "nrg", "hybrid"];

export type StringMaterial = "poly" | "soft" | "unknown";

function classify(s: string | null | undefined): StringMaterial {
  const text = (s ?? "").toLowerCase();
  if (!text.trim()) return "unknown";
  if (POLY_HINTS.some((h) => text.includes(h))) return "poly";
  if (SOFT_HINTS.some((h) => text.includes(h))) return "soft";
  return "unknown";
}

/**
 * Work out what a setup wears like. The mains break first, so they decide;
 * crosses only matter when the mains are unrecognised.
 */
export function detectMaterial(mains?: string | null, crosses?: string | null): StringMaterial {
  const m = classify(mains);
  return m !== "unknown" ? m : classify(crosses);
}

export interface IntervalInput {
  hoursPerWeek?: number | null;
  restringIntervalDays?: number | null;
  mains?: string | null;
  crosses?: string | null;
}

/** How many days a set of strings should last for this player. */
export function restringIntervalDays(input: IntervalInput): number {
  if (input.restringIntervalDays && input.restringIntervalDays > 0) {
    return Math.round(input.restringIntervalDays);
  }
  const hours = input.hoursPerWeek && input.hoursPerWeek > 0 ? input.hoursPerWeek : DEFAULT_HOURS_PER_WEEK;
  const material = detectMaterial(input.mains, input.crosses);
  const playableHours = material === "poly" ? POLY_PLAYABLE_HOURS : material === "soft" ? SOFT_PLAYABLE_HOURS : 30;
  const days = Math.round((playableHours / hours) * 7);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, days));
}

export type ReminderStatus = "never" | "fresh" | "due-soon" | "overdue";

export interface ReminderState {
  status: ReminderStatus;
  intervalDays: number;
  lastStrungAt: Date | null;
  dueAt: Date | null;
  /** Negative when overdue. */
  daysLeft: number | null;
  /** 1 = freshly strung, 0 = due today, clamped to [0, 1]. */
  freshness: number;
  material: StringMaterial;
}

export function reminderState(
  input: IntervalInput & { lastStrungAt?: Date | string | null },
  now: Date = new Date(),
): ReminderState {
  const intervalDays = restringIntervalDays(input);
  const material = detectMaterial(input.mains, input.crosses);
  if (!input.lastStrungAt) {
    return { status: "never", intervalDays, lastStrungAt: null, dueAt: null, daysLeft: null, freshness: 0, material };
  }
  const last = new Date(input.lastStrungAt);
  const dueAt = new Date(startOfDay(last).getTime() + intervalDays * DAY_MS);
  const daysLeft = Math.round((dueAt.getTime() - startOfDay(now).getTime()) / DAY_MS);
  const freshness = Math.max(0, Math.min(1, daysLeft / intervalDays));
  const status: ReminderStatus = daysLeft < 0 ? "overdue" : daysLeft <= DUE_SOON_DAYS ? "due-soon" : "fresh";
  return { status, intervalDays, lastStrungAt: last, dueAt, daysLeft, freshness, material };
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function describeDaysLeft(daysLeft: number | null): string {
  if (daysLeft === null) return "No restring logged";
  if (daysLeft < -1) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === -1) return "1 day overdue";
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `Due in ${daysLeft} days`;
}
