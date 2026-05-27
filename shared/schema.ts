import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userTierEnum = pgEnum("user_tier", ["free", "pro", "club"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  tier: userTierEnum("tier").default("free").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Rackets table
export const rackets = pgTable("rackets", {
  id: serial("id").primaryKey(),
  sport: text("sport").default("tennis").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  headSize: integer("head_size"), // sq in
  stringPattern: text("string_pattern"), // e.g., "16x19"
  weightUnstrung: real("weight_unstrung"), // grams
  balance: text("balance"), // e.g. "320mm" or "7 pts HL"
  stiffnessRa: integer("stiffness_ra"),
  beamWidth: text("beam_width"),
  recTensionMin: integer("rec_tension_min"),
  recTensionMax: integer("rec_tension_max"),
  sourceUrl: text("source_url"),
  level: text("level").default("intermediate"),
  year: integer("year"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recommendation Runs table
export const recommendationRuns = pgTable("recommendation_runs", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  racketId: integer("racket_id").references(() => rackets.id),
  inputsJson: jsonb("inputs_json").notNull(),
  outputJson: jsonb("output_json").notNull(),
  confidence: text("confidence").notNull(), // "high" | "medium" | "estimated"
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  recommendationRunId: integer("recommendation_run_id").references(() => recommendationRuns.id).notNull(),
  ratingPower: integer("rating_power"),
  ratingControl: integer("rating_control"),
  ratingComfort: integer("rating_comfort"),
  durabilityHours: real("durability_hours"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table (for AI chat)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table (for AI chat)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Schemas
export const insertRacketSchema = createInsertSchema(rackets).omit({ id: true, createdAt: true });
export const insertRunSchema = createInsertSchema(recommendationRuns).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });

// Types
export type Racket = typeof rackets.$inferSelect;
export type RecommendationRun = typeof recommendationRuns.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;

export type InsertRacket = z.infer<typeof insertRacketSchema>;
export type InsertRun = z.infer<typeof insertRunSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Onboarding Inputs Schema
export const onboardingInputsSchema = z.object({
  racketId: z.number().nullable(),
  level: z.string().optional(),
  playstyle: z.enum(["baseliner", "all-court", "serve&volley", "defensive", "aggressive"]).optional(),
  goals: z.array(z.string()).max(3).optional(),
  swingSpeed: z.enum(["slow", "medium", "fast"]).optional(),
  injuryRisk: z.enum(["none", "elbow", "shoulder", "wrist"]).optional(),
  frequency: z.enum(["1-2", "3-4", "5+"]).optional(), // hours per week
  stringHistory: z.string().optional(),
  tensionHistory: z.string().optional(),
});

export type OnboardingInputs = z.infer<typeof onboardingInputsSchema>;

// AI Output Schema
export const stringSetupSchema = z.object({
  stringFamily: z.string(),
  exampleStrings: z.array(z.string()),
  gauge: z.string(),
  tension: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export const recommendationOutputSchema = z.object({
  setup: z.object({
    mains: stringSetupSchema,
    crosses: stringSetupSchema.optional(),
  }),
  alternatives: z.array(stringSetupSchema),
  explanation: z.string(),
  warnings: z.array(z.string()),
  confidenceReason: z.string(),
});

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;
