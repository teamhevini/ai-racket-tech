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
  uniqueIndex,
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
    // Set when this stringer is a 10IS shop, so the player can book them in-app.
    shopId: integer("shop_id"),
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
    // Set when the job came from a 10IS booking.
    bookingId: integer("booking_id"),
    stringId: integer("string_id"),
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

// ════════════════════════════════════════════════════════════════════════════
// 10IS for Business — stringers, string companies, retailers, racket brands
// ════════════════════════════════════════════════════════════════════════════

export const shopPlanEnum = pgEnum("shop_plan", ["free", "pro"]);
export const brandKindEnum = pgEnum("brand_kind", ["string", "racket", "retailer"]);
export const brandPlanEnum = pgEnum("brand_plan", ["free", "insights", "partner"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "accepted",
  "in_progress",
  "ready",
  "collected",
  "cancelled",
  "declined",
]);
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type ShopPlan = (typeof shopPlanEnum.enumValues)[number];
export type BrandKind = (typeof brandKindEnum.enumValues)[number];
export type BrandPlan = (typeof brandPlanEnum.enumValues)[number];

// ─── Stringer shops ─────────────────────────────────────────────────────────
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  bio: text("bio"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  certifications: text("certifications"), // e.g. "USRSA Master Racquet Technician"
  machine: text("machine"), // e.g. "Babolat Sensor Expert"
  openingHours: text("opening_hours"),
  labourCents: integer("labour_cents").default(2000).notNull(),
  rushCents: integer("rush_cents").default(1000).notNull(),
  turnaroundHours: integer("turnaround_hours").default(48).notNull(),
  acceptingBookings: boolean("accepting_bookings").default(true).notNull(),
  plan: shopPlanEnum("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isDemo: boolean("is_demo").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Brands: string companies, racket brands and retailers ──────────────────
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: brandKindEnum("kind").default("string").notNull(),
  tagline: text("tagline"),
  about: text("about"),
  website: text("website"),
  accent: text("accent"), // hex colour for the brand chip
  plan: brandPlanEnum("plan").default("free").notNull(),
  // Brands are listed from public info until someone from the company claims them.
  claimed: boolean("claimed").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isDemo: boolean("is_demo").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── String catalogue ───────────────────────────────────────────────────────
export const stringFamilies = ["polyester", "co-polyester", "multifilament", "synthetic gut", "natural gut", "hybrid"] as const;
export type StringFamily = (typeof stringFamilies)[number];

export const strings = pgTable(
  "strings",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
    brandName: text("brand_name").notNull(),
    model: text("model").notNull(),
    family: text("family").notNull(), // one of stringFamilies
    gauges: text("gauges"), // "16, 17, 1.25"
    // Stiffness in lb/in where published (lower = softer). Comfort/spin/control/power/durability 1–10.
    stiffness: integer("stiffness"),
    comfort: integer("comfort"),
    spin: integer("spin"),
    control: integer("control"),
    power: integer("power"),
    durability: integer("durability"),
    setPriceCents: integer("set_price_cents"),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("strings_brand_model_idx").on(t.brandName, t.model)],
);

// ─── Bookings: a restring booked through 10IS ───────────────────────────────
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    shopId: integer("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
    // Null for walk-ins the stringer adds themselves.
    playerUserId: integer("player_user_id").references(() => users.id, { onDelete: "set null" }),
    savedRacketId: integer("saved_racket_id").references(() => savedRackets.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    racketLabel: text("racket_label").notNull(),
    stringId: integer("string_id").references(() => strings.id, { onDelete: "set null" }),
    mains: text("mains"),
    crosses: text("crosses"),
    gauge: text("gauge"),
    tensionMains: real("tension_mains"),
    tensionCrosses: real("tension_crosses"),
    playerSuppliesString: boolean("player_supplies_string").default(false).notNull(),
    rush: boolean("rush").default(false).notNull(),
    dropOffAt: timestamp("drop_off_at").notNull(),
    dueAt: timestamp("due_at").notNull(),
    status: bookingStatusEnum("status").default("requested").notNull(),
    statusLog: jsonb("status_log").$type<Array<{ status: BookingStatus; at: string; note?: string }>>().default([]).notNull(),
    priceCents: integer("price_cents"),
    notes: text("notes"),
    shopNotes: text("shop_notes"),
    // The player lets this shop see the racket's full string history (from every stringer).
    shareHistory: boolean("share_history").default(true).notNull(),
    recommendationRunId: integer("recommendation_run_id").references(() => recommendationRuns.id, { onDelete: "set null" }),
    sampleProgramId: integer("sample_program_id"),
    affiliateClickId: integer("affiliate_click_id"),
    stringJobId: integer("string_job_id"),
    rating: integer("rating"),
    source: text("source").default("app").notNull(), // app | reminder | sample | walk-in | profile
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("bookings_shop_idx").on(t.shopId),
    index("bookings_player_idx").on(t.playerUserId),
  ],
);

// ─── Sponsored placements ───────────────────────────────────────────────────
export const campaigns = pgTable(
  "campaigns",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }).notNull(),
    stringId: integer("string_id").references(() => strings.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    headline: text("headline").notNull(),
    status: text("status").default("draft").notNull(), // draft | active | paused | ended
    cpcCents: integer("cpc_cents").notNull(), // paid per click on a qualified placement
    monthlyBudgetCents: integer("monthly_budget_cents").notNull(),
    // Brands can only NARROW who sees a placement, never widen the fit check.
    levels: jsonb("levels").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("campaigns_brand_idx").on(t.brandId)],
);

export const campaignEvents = pgTable(
  "campaign_events",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
    runId: integer("run_id").references(() => recommendationRuns.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // impression | click
    costCents: integer("cost_cents").default(0).notNull(),
    fitScore: integer("fit_score"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("campaign_events_campaign_idx").on(t.campaignId)],
);

// ─── Retailer offers + affiliate clicks ─────────────────────────────────────
export const retailOffers = pgTable(
  "retail_offers",
  {
    id: serial("id").primaryKey(),
    retailerId: integer("retailer_id").references(() => brands.id, { onDelete: "cascade" }).notNull(),
    stringId: integer("string_id").references(() => strings.id, { onDelete: "cascade" }).notNull(),
    priceCents: integer("price_cents").notNull(),
    url: text("url").notNull(),
    inStock: boolean("in_stock").default(true).notNull(),
    commissionPct: real("commission_pct").default(0).notNull(), // never used for ordering
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [uniqueIndex("retail_offers_retailer_string_idx").on(t.retailerId, t.stringId)],
);

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    stringId: integer("string_id").references(() => strings.id, { onDelete: "set null" }),
    offerId: integer("offer_id").references(() => retailOffers.id, { onDelete: "set null" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    runId: integer("run_id").references(() => recommendationRuns.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    source: text("source").notNull(), // recommendation | sponsored | string-page
    destination: text("destination").notNull(), // retailer | booking
    convertedAt: timestamp("converted_at"),
    orderCents: integer("order_cents"),
    commissionCents: integer("commission_cents"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("affiliate_clicks_string_idx").on(t.stringId)],
);

// ─── Sample programmes run through partner stringers ────────────────────────
export const samplePrograms = pgTable("sample_programs", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "cascade" }).notNull(),
  stringId: integer("string_id").references(() => strings.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  pitch: text("pitch"),
  unitsTotal: integer("units_total").notNull(),
  installFeeCents: integer("install_fee_cents").notNull(), // brand pays the stringer this per install
  status: text("status").default("active").notNull(), // active | paused | ended
  createdAt: timestamp("created_at").defaultNow(),
});

export const sampleProgramShops = pgTable(
  "sample_program_shops",
  {
    id: serial("id").primaryKey(),
    programId: integer("program_id").references(() => samplePrograms.id, { onDelete: "cascade" }).notNull(),
    shopId: integer("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("sample_program_shop_idx").on(t.programId, t.shopId)],
);

// ─── Pseudonymised demand signals (feeds the insights dashboard) ───────────
// No user id: players are a keyed hash so retention can be measured without
// naming anyone. That is pseudonymous, not anonymous, data under GDPR, so it
// never leaves 10IS raw; brands only see aggregates of at least K_ANONYMITY players.
export const stringSignals = pgTable(
  "string_signals",
  {
    id: serial("id").primaryKey(),
    stringId: integer("string_id").references(() => strings.id, { onDelete: "cascade" }).notNull(),
    kind: text("kind").notNull(), // recommended | alternative | booked | installed | rated | affiliate_click | sample
    playerHash: text("player_hash"),
    level: text("level"),
    playstyle: text("playstyle"),
    region: text("region"),
    rating: integer("rating"),
    racketBrand: text("racket_brand"),
    // True for installs and ratings that came from a brand-funded free sample.
    sampled: boolean("sampled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("string_signals_string_idx").on(t.stringId, t.kind)],
);

// ─── Invites: a player invites their own stringer to take bookings on 10IS ──
// Sent from the player's phone (share sheet / text), never emailed by 10IS.
export const stringerInvites = pgTable(
  "stringer_invites",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    inviterUserId: integer("inviter_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    savedStringerId: integer("saved_stringer_id").references(() => savedStringers.id, { onDelete: "cascade" }).notNull().unique(),
    acceptedShopId: integer("accepted_shop_id").references(() => shops.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at"),
    opens: integer("opens").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("stringer_invites_inviter_idx").on(t.inviterUserId)],
);
export type StringerInvite = typeof stringerInvites.$inferSelect;

// ─── B2B input schemas ──────────────────────────────────────────────────────
const slugText = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(40)
  .regex(/^[a-z0-9-]+$/, "Letters, numbers and dashes only");

const cents = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const shopInputSchema = z.object({
  name: z.string().trim().min(2, "Shop name is required").max(80),
  slug: slugText.optional(),
  tagline: optionalText(120),
  bio: optionalText(1200),
  address: optionalText(240),
  city: optionalText(80),
  phone: optionalText(40),
  email: optionalText(160),
  website: optionalText(300),
  certifications: optionalText(160),
  machine: optionalText(80),
  openingHours: optionalText(240),
  labourCents: cents(0, 20000).optional(),
  rushCents: cents(0, 20000).optional(),
  turnaroundHours: z.coerce.number().int().min(1).max(336).optional(),
  acceptingBookings: z.boolean().optional(),
  /** Set when the stringer arrived through a customer's invite link. */
  inviteCode: z.string().trim().max(40).optional(),
});
export type ShopInput = z.input<typeof shopInputSchema>;

export const bookingInputSchema = z.object({
  savedRacketId: z.number().int().positive().optional().nullable(),
  racketLabel: optionalText(120),
  stringId: z.number().int().positive().optional().nullable(),
  mains: optionalText(120),
  crosses: optionalText(120),
  gauge: optionalText(20),
  tensionMains: optionalNumber(20, 90),
  tensionCrosses: optionalNumber(20, 90),
  playerSuppliesString: z.boolean().optional(),
  rush: z.boolean().optional(),
  dropOffAt: z.coerce.date({ invalid_type_error: "Pick a drop-off day" }),
  notes: optionalText(600),
  shareHistory: z.boolean().optional(),
  recommendationRunId: z.number().int().positive().optional().nullable(),
  sampleProgramId: z.number().int().positive().optional().nullable(),
  affiliateCode: optionalText(40),
  source: z.enum(["app", "reminder", "sample", "profile"]).optional(),
});
export type BookingInput = z.input<typeof bookingInputSchema>;

export const walkInInputSchema = bookingInputSchema
  .omit({ savedRacketId: true, shareHistory: true, recommendationRunId: true, sampleProgramId: true, affiliateCode: true, source: true })
  .extend({
    customerName: z.string().trim().min(1, "Customer name is required").max(80),
    customerEmail: optionalText(160),
    customerPhone: optionalText(40),
    racketLabel: z.string().trim().min(1, "Which racket?").max(120),
    dropOffAt: z.coerce.date().optional(),
  });

export const brandInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(["string", "racket", "retailer"]).optional(),
  tagline: optionalText(140),
  about: optionalText(1500),
  website: optionalText(300),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1a1a1a")
    .optional()
    .nullable(),
});

const scoreField = z.coerce.number().int().min(1).max(10).optional().nullable();
export const stringInputSchema = z.object({
  model: z.string().trim().min(1, "Model name is required").max(80),
  family: z.enum(stringFamilies),
  gauges: optionalText(60),
  stiffness: z.coerce.number().int().min(50).max(400).optional().nullable(),
  comfort: scoreField,
  spin: scoreField,
  control: scoreField,
  power: scoreField,
  durability: scoreField,
  setPriceCents: cents(0, 20000).optional().nullable(),
  description: optionalText(600),
  active: z.boolean().optional(),
});

export const campaignInputSchema = z.object({
  stringId: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(4, "Write a short headline").max(90),
  cpcCents: cents(80, 2000), // $0.80 minimum per click
  monthlyBudgetCents: cents(5000, 5_000_000), // $50 minimum
  levels: z.array(z.enum(["beginner", "intermediate", "advanced", "pro"])).max(4).optional(),
  status: z.enum(["draft", "active", "paused", "ended"]).optional(),
});

export const sampleProgramInputSchema = z.object({
  stringId: z.number().int().positive(),
  title: z.string().trim().min(4).max(80),
  pitch: optionalText(400),
  unitsTotal: z.coerce.number().int().min(10).max(10000),
  installFeeCents: cents(500, 5000),
  shopIds: z.array(z.number().int().positive()).max(500).optional(),
  status: z.enum(["active", "paused", "ended"]).optional(),
});

export const retailOfferInputSchema = z.object({
  stringId: z.number().int().positive(),
  priceCents: cents(100, 100000),
  url: z.string().trim().url("Enter the product page URL").max(500).refine((u) => u.startsWith("https://"), "Use an https link"),
  inStock: z.boolean().optional(),
  commissionPct: z.coerce.number().min(0).max(50).optional(),
});

export type Shop = typeof shops.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type TennisString = typeof strings.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type RetailOffer = typeof retailOffers.$inferSelect;
export type SampleProgram = typeof samplePrograms.$inferSelect;
