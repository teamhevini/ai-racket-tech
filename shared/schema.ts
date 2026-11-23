import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────────────
export const userTierEnum = pgEnum("user_tier", ["free", "pro", "club"]);
export type UserTier = (typeof userTierEnum.enumValues)[number];

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  tier: userTierEnum("tier").default("free").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  passwordHash: text("password_hash"),
  // Master switch for reminder emails. Per-racket reminders live on saved_rackets.
  reminderEnabled: boolean("reminder_enabled").default(false).notNull(),
  // Legacy single-schedule reminder fields (v1). Kept so existing data is not lost;
  // the v2 app migrates them onto the user's rackets the first time it sees them.
  reminderFrequencyWeeks: integer("reminder_frequency_weeks").default(4),
  lastRestrungAt: timestamp("last_restrung_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Racket catalog ─────────────────────────────────────────────────────────
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

// ─── Recommendation runs ────────────────────────────────────────────────────
export const recommendationRuns = pgTable(
  "recommendation_runs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id"),
    racketId: integer("racket_id").references(() => rackets.id, { onDelete: "set null" }),
    // Snapshot of the catalog racket at run time so history survives catalog changes.
    racketLabel: text("racket_label"),
    savedRacketId: integer("saved_racket_id"),
    inputsJson: jsonb("inputs_json").notNull(),
    outputJson: jsonb("output_json").notNull(),
    confidence: text("confidence").notNull(), // "high" | "medium" | "estimated"
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("recommendation_runs_user_idx").on(t.userId)],
);

// ─── Feedback ───────────────────────────────────────────────────────────────
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  recommendationRunId: integer("recommendation_run_id")
    .references(() => recommendationRuns.id, { onDelete: "cascade" })
    .notNull(),
  ratingPower: integer("rating_power"),
  ratingControl: integer("rating_control"),
  ratingComfort: integer("rating_comfort"),
  durabilityHours: real("durability_hours"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── AI chat ────────────────────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── My bag: saved rackets ──────────────────────────────────────────────────
export const savedRackets = pgTable(
  "saved_rackets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    nickname: text("nickname").notNull(),
    brand: text("brand"),
    model: text("model"),
    headSize: text("head_size"),
    stringPattern: text("string_pattern"),
    weight: text("weight"),
    // Reminder settings
    hoursPerWeek: real("hours_per_week"),
    restringIntervalDays: integer("restring_interval_days"), // null = calculated automatically
    reminderEnabled: boolean("reminder_enabled").default(true).notNull(),
    lastReminderSentAt: timestamp("last_reminder_sent_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("saved_rackets_user_idx").on(t.userId)],
);

// ─── My stringers ───────────────────────────────────────────────────────────
export const savedStringers = pgTable(
  "saved_stringers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    stringerName: text("stringer_name").notNull(),
    stringerAddress: text("stringer_address"),
    stringerPlaceId: text("stringer_place_id"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("saved_stringers_user_idx").on(t.userId)],
);

// ─── Racket history: every restring job ─────────────────────────────────────
export const stringJobs = pgTable(
  "string_jobs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    savedRacketId: integer("saved_racket_id")
      .references(() => savedRackets.id, { onDelete: "cascade" })
      .notNull(),
    stringerId: integer("stringer_id").references(() => savedStringers.id, { onDelete: "set null" }),
    recommendationRunId: integer("recommendation_run_id").references(() => recommendationRuns.id, {
      onDelete: "set null",
    }),
    strungAt: timestamp("strung_at").notNull(),
    mains: text("mains"),
    crosses: text("crosses"),
    gauge: text("gauge"),
    tensionMains: real("tension_mains"),
    tensionCrosses: real("tension_crosses"),
    price: real("price"),
    rating: integer("rating"), // 1–5, how the job played
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("string_jobs_racket_idx").on(t.savedRacketId),
    index("string_jobs_user_idx").on(t.userId),
  ],
);

// ─── Zod schemas ────────────────────────────────────────────────────────────
export const insertRacketSchema = createInsertSchema(rackets).omit({ id: true, createdAt: true });
export const insertRunSchema = createInsertSchema(recommendationRuns).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be between ${min} and ${max}` });
        return z.NEVER;
      }
      return n;
    });

export const savedRacketInputSchema = z.object({
  nickname: z.string().trim().min(1, "Give this racket a name").max(60),
  brand: optionalText(60),
  model: optionalText(80),
  headSize: optionalText(20),
  stringPattern: optionalText(20),
  weight: optionalText(20),
  hoursPerWeek: optionalNumber(0, 60),
  restringIntervalDays: optionalNumber(1, 365).transform((v) => (v === null ? null : Math.round(v))),
  reminderEnabled: z.boolean().optional(),
  notes: optionalText(1000),
});
export type SavedRacketInput = z.input<typeof savedRacketInputSchema>;

export const savedStringerInputSchema = z.object({
  stringerName: z.string().trim().min(1, "Stringer name is required").max(120),
  stringerAddress: optionalText(240),
  stringerPlaceId: optionalText(240),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  website: optionalText(300),
  notes: optionalText(1000),
});
export type SavedStringerInput = z.input<typeof savedStringerInputSchema>;

export const stringJobInputSchema = z.object({
  strungAt: z.coerce.date({ invalid_type_error: "Pick the date it was strung" }).refine(
    (d) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000,
    "That date is in the future",
  ),
  stringerId: z.number().int().positive().optional().nullable(),
  recommendationRunId: z.number().int().positive().optional().nullable(),
  mains: optionalText(120),
  crosses: optionalText(120),
  gauge: optionalText(20),
  tensionMains: optionalNumber(20, 90),
  tensionCrosses: optionalNumber(20, 90),
  price: optionalNumber(0, 1000),
  rating: optionalNumber(1, 5).transform((v) => (v === null ? null : Math.round(v))),
  notes: optionalText(1000),
});
export type StringJobInput = z.input<typeof stringJobInputSchema>;

// ─── Types ──────────────────────────────────────────────────────────────────
export type Racket = typeof rackets.$inferSelect;
export type RecommendationRun = typeof recommendationRuns.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type SavedRacket = typeof savedRackets.$inferSelect;
export type SavedStringer = typeof savedStringers.$inferSelect;
export type StringJob = typeof stringJobs.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type InsertRacket = z.infer<typeof insertRacketSchema>;
export type InsertRun = z.infer<typeof insertRunSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// ─── Onboarding inputs ──────────────────────────────────────────────────────
export const onboardingInputsSchema = z.object({
  racketId: z.number().nullable(),
  savedRacketId: z.number().int().positive().optional().nullable(),
  level: z.string().optional(),
  playstyle: z.enum(["baseliner", "all-court", "serve&volley", "defensive", "aggressive"]).optional(),
  goals: z.array(z.string()).max(3).optional(),
  swingSpeed: z.enum(["slow", "medium", "fast"]).optional(),
  injuryRisk: z.enum(["none", "elbow", "shoulder", "wrist"]).optional(),
  frequency: z.enum(["1-2", "3-4", "5+"]).optional(), // hours per week
  stringHistory: z.string().max(300).optional(),
  tensionHistory: z.string().max(100).optional(),
});

export type OnboardingInputs = z.infer<typeof onboardingInputsSchema>;

// ─── AI output ──────────────────────────────────────────────────────────────
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
