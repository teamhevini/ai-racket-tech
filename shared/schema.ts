import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ── Rackets ──────────────────────────────────────────────────────────────────

export const rackets = pgTable("rackets", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  headSize: integer("head_size"),
  stringPattern: text("string_pattern"),
  weightUnstrung: integer("weight_unstrung"),
  balance: text("balance"),
  stiffnessRa: integer("stiffness_ra"),
  beamWidth: text("beam_width"),
  recTensionMin: integer("rec_tension_min"),
  recTensionMax: integer("rec_tension_max"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRacketSchema = createInsertSchema(rackets).omit({
  id: true,
  createdAt: true,
});

export type Racket = typeof rackets.$inferSelect;
export type InsertRacket = z.infer<typeof insertRacketSchema>;

// ── Recommendation Runs ───────────────────────────────────────────────────────

export const recommendationRuns = pgTable("recommendation_runs", {
  id: serial("id").primaryKey(),
  racketId: integer("racket_id").references(() => rackets.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  inputsJson: jsonb("inputs_json"),
  outputJson: jsonb("output_json"),
  confidence: text("confidence"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRunSchema = createInsertSchema(recommendationRuns).omit({
  id: true,
  createdAt: true,
});

export type RecommendationRun = typeof recommendationRuns.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;

// ── Feedback ──────────────────────────────────────────────────────────────────

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").references(() => recommendationRuns.id, { onDelete: "set null" }),
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// ── Onboarding / Recommendation Schemas ──────────────────────────────────────

export const onboardingInputsSchema = z.object({
  racketId: z.number().nullable().optional(),
  level: z.string().optional(),
  playstyle: z.string().optional(),
  goals: z.array(z.string()).optional(),
  swingSpeed: z.string().optional(),
  injuryRisk: z.string().optional(),
  frequency: z.string().optional(),
  stringHistory: z.string().optional(),
  tensionHistory: z.string().optional(),
});

export type OnboardingInputs = z.infer<typeof onboardingInputsSchema>;

export const stringSetupSchema = z.object({
  stringFamily: z.string(),
  exampleStrings: z.array(z.string()),
  gauge: z.string(),
  tension: z.string(),
});

export const recommendationOutputSchema = z.object({
  setup: z.object({
    mains: stringSetupSchema,
    crosses: stringSetupSchema.optional(),
  }),
  alternatives: z.array(stringSetupSchema.extend({ tension: z.union([z.string(), z.number()]) })).optional(),
  explanation: z.string(),
  warnings: z.array(z.string()).optional(),
  confidenceReason: z.string().optional(),
});

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
