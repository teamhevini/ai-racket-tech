import OpenAI from "openai";
import {
  recommendationOutputSchema,
  type OnboardingInputs,
  type Racket,
  type RecommendationOutput,
} from "@shared/schema";

let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

export const aiConfigured = () => !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY);
export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export function confidenceFor(input: OnboardingInputs): "high" | "medium" | "estimated" {
  if (!input.racketId) return "estimated";
  if (!input.level || !input.stringHistory) return "medium";
  return "high";
}

export function buildPrompt(input: OnboardingInputs, racketSpecs: Racket | null | undefined): string {
const ra = racketSpecs?.stiffnessRa;
const pattern = racketSpecs?.stringPattern;
const headSize = racketSpecs?.headSize;
const beam = racketSpecs?.beamWidth;
const bal = racketSpecs?.balance;
const wt = racketSpecs?.weightUnstrung;
const tMin = racketSpecs?.recTensionMin || 45;
const tMax = racketSpecs?.recTensionMax || 60;
const tMid = Math.round((tMin + tMax) / 2);

const prompt = `
  Act as a professional tennis racket technician. Recommend a string setup that
  is cross-functionally tuned to BOTH the racket's physical specs AND the
  player's profile.

  Player Profile:
  - Level: ${input.level || "Unknown"}
  - Playstyle: ${input.playstyle || "Unknown"}
  - Goals: ${input.goals?.join(", ") || "None"}
  - Swing Speed: ${input.swingSpeed || "Unknown"}
  - Injury Risk: ${input.injuryRisk || "None"}
  - Play Frequency: ${input.frequency || "Unknown"} hours/week
  - String History: ${input.stringHistory || "Unknown"}
  - Tension History: ${input.tensionHistory || "Unknown"}

  Racket Specs:
  ${racketSpecs ? JSON.stringify(racketSpecs) : "Unknown Racket"}

  Cross-functional rules — apply ALL that fit, weighted by how strongly the spec
  and the player's profile push in the same direction:

  SAFETY / INJURY (highest priority)
  - Injury risk = elbow/shoulder/wrist OR racket stiffness RA >= 67: AVOID full
    stiff polyester. Recommend multifilament, natural gut, or a soft hybrid
    (gut/multi mains, soft poly crosses) and bias tension to the LOWER half of
    the racket's range (${tMin}–${tMid} lbs).

  FRAME STIFFNESS (RA = ${ra ?? "unknown"})
  - RA >= 68 (stiff frame, e.g. Pure Drive/Aero, Ultra): pair with a softer
    string or drop tension 2–3 lbs to protect the arm.
  - RA <= 62 (flexible frame, e.g. Pro Staff, Prestige, Blade): can handle
    stiffer/crisper strings; tension can sit mid-to-upper range for control.

  STRING PATTERN (${pattern ?? "unknown"})
  - 18x20 / 18x19 (dense, e.g. Prestige Pro, Pure Strike VS): poly is fine,
    tension can sit MID-LOW for a livelier response; great with control polys.
  - 16x19 / 16x20 (open-to-medium): standard tuning around mid-range.
  - 16x18 / 16x15 / very open (e.g. Prince ATS Tour 100P): use a
    spin-friendly poly and bias tension UPPER half (${tMid}–${tMax} lbs) to
    tame launch angle; warn about faster string movement / shorter life.

  HEAD SIZE & WEIGHT (${headSize ?? "?"} sq in, ${wt ?? "?"} g)
  - Head size >= 104 OR unstrung weight <= 285 g (tweener/light): LOWER tension
    (${tMin}–${tMid - 1}) for control; avoid stiffest polys.
  - Head size <= 98 AND weight >= 310 g (player's frame): the player needs to
    generate spin/power; mid tension and modern poly or hybrid work well.

  BEAM WIDTH (${beam ?? "unknown"})
  - Beam >= 25 mm (power frame): drop tension and/or soften strings to balance
    the extra power.
  - Beam <= 21 mm (control frame): can push tension slightly higher for feel.

  BALANCE (${bal ?? "unknown"})
  - Head-heavy (HH) or even-balance light frames generate easy power → soften
    string / drop tension.
  - 5+ pts head-light, traditional player frames → standard or upper-range
    tension is fine for control.

  PLAYSTYLE & GOALS
  - Heavy-spin baseliner / aggressive: shaped or textured poly mains; consider
    gut/multi crosses for comfort if RA is high.
  - All-court / serve & volley: hybrid with multi or gut for touch.
  - Defensive / comfort goals: multi or gut, lower tension.
  - Frequency 5+ hrs/week: warn about poly tension-loss; recommend
    restringing every ~15–20 hours or switching to multi/hybrid for durability.

  TENSION BOUNDS (always respect)
  - Stay within the racket's recommended range: ${tMin}–${tMax} lbs.
  - Default fallbacks if unknown: Poly 45–52, Multi 52–58, Gut 52–60.

  EXPLANATION
  - In "explanation", explicitly cite at least TWO racket specs (e.g. "RA 68 +
    16x19 pattern") and at least ONE player factor that drove the choice, so
    the recommendation feels personalized and not generic.
  
  Output JSON ONLY matching this exact schema:
  {
    "setup": { 
      "mains": { "stringFamily": "String type", "exampleStrings": ["Specific Model 1", "Specific Model 2"], "gauge": "16 or 17", "tension": "number as string" },
      "crosses": { "stringFamily": "String type", "exampleStrings": ["Specific Model 1"], "gauge": "16 or 17", "tension": "number as string" }
    },
    "alternatives": [ 
      { "stringFamily": "Type", "exampleStrings": ["Model"], "gauge": "16/17", "tension": "number" }
    ],
    "explanation": "Brief technician reasoning",
    "warnings": ["Health/Performance warnings"],
    "confidenceReason": "Why this setup matches"
  }
`;
  return prompt;
}

export function fallbackRecommendation(input: OnboardingInputs, racketSpecs: Racket | null | undefined): RecommendationOutput {
  const soft = !!input.injuryRisk && input.injuryRisk !== "none";
  const mid = racketSpecs
    ? String(Math.round(((racketSpecs.recTensionMin || 48) + (racketSpecs.recTensionMax || 57)) / 2))
    : "52";
  return {
    setup: {
      mains: {
        stringFamily: soft ? "Multifilament" : "Polyester",
        exampleStrings: soft ? ["Wilson NXT 16", "Tecnifibre X-One Biphase 16"] : ["Luxilon ALU Power 125", "Babolat RPM Blast 125"],
        gauge: "16",
        tension: mid,
      },
    },
    alternatives: [
      { stringFamily: "Synthetic Gut", exampleStrings: ["Prince Synthetic Gut 16"], gauge: "16", tension: "54" },
      { stringFamily: "Hybrid", exampleStrings: ["Luxilon ALU Power 125 / Wilson NXT 16"], gauge: "16/17", tension: "50/52" },
    ],
    explanation:
      "This is a safe baseline setup for your racket. Our AI technician couldn't be reached just now — run it again in a minute for a fully personalised recommendation.",
    warnings: ["Estimated fallback recommendation — results may vary."],
    confidenceReason: "Fallback while the AI technician was unavailable.",
  };
}

export async function generateRecommendation(
  input: OnboardingInputs,
  racketSpecs: Racket | null | undefined,
): Promise<{ output: RecommendationOutput; fallback: boolean }> {
  if (!aiConfigured()) return { output: fallbackRecommendation(input, racketSpecs), fallback: true };
  const prompt = buildPrompt(input, racketSpecs);
  const call = async () => {
    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a professional tennis stringing expert and technician. You recommend string setups based on racket specs and player profile. You provide detailed explanations and specific string models (e.g., 'Luxilon ALU Power 1.25', 'Babolat VS Touch'). Always respond in valid JSON format only, no markdown, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });
    return recommendationOutputSchema.parse(JSON.parse(completion.choices[0]?.message?.content || "{}"));
  };
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return { output: await call(), fallback: false };
    } catch (err: any) {
      console.warn(`[recommend] AI attempt ${attempt} failed:`, err?.message ?? err);
    }
  }
  return { output: fallbackRecommendation(input, racketSpecs), fallback: true };
}
