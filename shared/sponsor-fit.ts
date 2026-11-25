/**
 * Sponsored-placement eligibility — the integrity core of 10IS for Business.
 *
 * Rules that make the sponsored slot trustworthy:
 *  1. The AI recommendation is generated and stored BEFORE any of this runs.
 *     These functions receive a frozen copy and only ever return a separate
 *     placement object; they cannot change, replace or reorder the pick.
 *  2. A sponsored string is only shown if it passes the same safety rules the
 *     technician uses (arm-safe for injured players, no stiff poly in stiff
 *     frames, no poly for slow swings unless the technician chose poly) and
 *     belongs to a string type the technician itself recommended.
 *  3. It must clear a fit threshold. Money only breaks ties between strings
 *     that already fit; it never lets a poor fit through.
 *  4. Brands can narrow who sees a placement (by level), never widen it.
 *  5. The technician's own pick is never sold back as a sponsored slot.
 */
import type { OnboardingInputs, RecommendationOutput, StringFamily } from "./schema";

export const FIT_THRESHOLD = 70;

export type FamilyGroup = "poly" | "multi" | "synthetic" | "gut" | "hybrid";

export function familyGroup(text: string | null | undefined): FamilyGroup | null {
  const t = String(text ?? "").toLowerCase();
  if (!t) return null;
  if (t.includes("hybrid")) return "hybrid";
  if (t.includes("poly")) return "poly";
  if (t.includes("multi")) return "multi";
  if (t.includes("synthetic")) return "synthetic";
  if (t.includes("gut")) return "gut";
  return null;
}

/** Lowercase, letters and digits only — "ALU Power 1.25" → "alupower125". */
export const squash = (s: string | null | undefined) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Does free text like "Luxilon ALU Power 125" name this catalogue string? */
export function mentionsString(text: string, s: { brandName: string; model: string }): boolean {
  const t = squash(text);
  const model = squash(s.model);
  if (model.length < 3) return false;
  if (t.includes(squash(s.brandName) + model)) return true;
  // Model alone is enough when it's distinctive (e.g. "RPM Blast", "Hyper-G").
  return model.length >= 5 && t.includes(model);
}

export interface FitString {
  id: number;
  brandName: string;
  model: string;
  family: StringFamily | string;
  stiffness: number | null;
  comfort: number | null;
  spin: number | null;
  control: number | null;
  power: number | null;
  durability: number | null;
}

export interface FitContext {
  primaryGroups: Set<FamilyGroup>;
  acceptableGroups: Set<FamilyGroup>;
  pickedText: string[];
  injury: boolean;
  stiffFrame: boolean;
  slowSwing: boolean;
  level: string | null;
  goals: string[];
}

export function buildFitContext(
  output: Readonly<RecommendationOutput>,
  inputs: Partial<OnboardingInputs>,
  racket: { stiffnessRa?: number | null } | null | undefined,
): FitContext {
  const { mains, crosses } = output.setup;
  const primaryGroups = new Set<FamilyGroup>();
  for (const s of [mains, crosses]) {
    if (!s) continue;
    const g = familyGroup(s.stringFamily);
    if (g === "hybrid") {
      // "Hybrid: poly mains / multi crosses" — read the parts.
      for (const part of [s.stringFamily, ...s.exampleStrings]) {
        const pg = familyGroup(part.replace(/hybrid/gi, ""));
        if (pg && pg !== "hybrid") primaryGroups.add(pg);
      }
    } else if (g) primaryGroups.add(g);
  }
  const acceptableGroups = new Set(primaryGroups);
  for (const alt of output.alternatives) {
    const g = familyGroup(alt.stringFamily);
    if (g && g !== "hybrid") acceptableGroups.add(g);
  }
  return {
    primaryGroups,
    acceptableGroups,
    pickedText: [mains, crosses].filter(Boolean).flatMap((s) => s!.exampleStrings),
    injury: !!inputs.injuryRisk && inputs.injuryRisk !== "none",
    stiffFrame: (racket?.stiffnessRa ?? 0) >= 68,
    slowSwing: inputs.swingSpeed === "slow",
    level: inputs.level ?? null,
    goals: (inputs.goals ?? []).map((g) => g.toLowerCase()),
  };
}

export interface FitResult {
  eligible: boolean;
  score: number;
  reasons: string[];
}

const attr = (v: number | null | undefined) => (typeof v === "number" ? v : 5);

export function assessFit(s: FitString, ctx: FitContext): FitResult {
  const reasons: string[] = [];
  const group = familyGroup(s.family);
  if (!group || group === "hybrid") return { eligible: false, score: 0, reasons: ["Not a single string type"] };

  if (ctx.pickedText.some((t) => mentionsString(t, s))) {
    return { eligible: false, score: 0, reasons: ["Already the technician's pick — never sold as a sponsored slot"] };
  }
  if (!ctx.acceptableGroups.has(group)) {
    return { eligible: false, score: 0, reasons: [`The technician didn't recommend ${s.family} for this player`] };
  }
  if (group === "poly" && ctx.injury && (s.stiffness == null || s.stiffness > 200)) {
    return { eligible: false, score: 0, reasons: ["Too stiff for a player with an arm or shoulder issue"] };
  }
  if (group === "poly" && ctx.stiffFrame && (s.stiffness == null || s.stiffness > 220)) {
    return { eligible: false, score: 0, reasons: ["Too stiff for a stiff (RA 68+) frame"] };
  }
  if (group === "poly" && ctx.slowSwing && !ctx.primaryGroups.has("poly")) {
    return { eligible: false, score: 0, reasons: ["Polyester needs a faster swing than this player has"] };
  }

  let score = ctx.primaryGroups.has(group) ? 62 : 48;
  reasons.push(ctx.primaryGroups.has(group) ? `Same type as the pick (${s.family})` : `A type the technician listed as an alternative`);
  const goalAttr: Record<string, keyof FitString> = {
    power: "power",
    control: "control",
    spin: "spin",
    comfort: "comfort",
    durability: "durability",
    touch: "comfort",
  };
  for (const g of ctx.goals) {
    const key = goalAttr[g];
    if (!key) continue;
    const v = attr(s[key] as number | null);
    score += (v - 5) * 3;
    if (v >= 8) reasons.push(`Strong on ${g}`);
  }
  if (ctx.injury) {
    score += (attr(s.comfort) - 5) * 3;
    if (attr(s.comfort) >= 8) reasons.push("Arm-friendly");
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { eligible: score >= FIT_THRESHOLD, score, reasons };
}

export interface CandidateCampaign {
  id: number;
  cpcCents: number;
  levels: string[];
  remainingBudgetCents: number;
  string: FitString;
}

export interface SponsoredPick {
  campaignId: number;
  stringId: number;
  fit: FitResult;
}

/**
 * Pick at most one sponsored string. Eligibility comes first and is decided by
 * fit alone; among eligible strings, rank = fit × bid so a poor fit can never
 * buy its way past a better one by more than its fit advantage allows.
 */
export function chooseSponsored(campaigns: CandidateCampaign[], ctx: FitContext): SponsoredPick | null {
  let best: { pick: SponsoredPick; rank: number } | null = null;
  for (const c of campaigns) {
    if (c.remainingBudgetCents < c.cpcCents) continue;
    if (c.levels.length && (!ctx.level || !c.levels.includes(ctx.level))) continue;
    const fit = assessFit(c.string, ctx);
    if (!fit.eligible) continue;
    const rank = fit.score * c.cpcCents;
    if (!best || rank > best.rank || (rank === best.rank && c.id < best.pick.campaignId)) {
      best = { pick: { campaignId: c.id, stringId: c.string.id, fit }, rank };
    }
  }
  return best?.pick ?? null;
}

/** Deep-freeze so any attempt to mutate the recommendation throws in strict mode. */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as Record<string, unknown>)) deepFreeze(v);
  }
  return obj;
}
