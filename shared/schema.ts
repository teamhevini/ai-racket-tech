import { pgTable, serial, integer, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const rackets = pgTable('rackets', {
  id: serial('id').primaryKey(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  headSize: integer('head_size'),
  stringPattern: text('string_pattern'),
  weightUnstrung: integer('weight_unstrung'),
  balance: text('balance'),
  stiffnessRa: integer('stiffness_ra'),
  beamWidth: text('beam_width'),
  recTensionMin: integer('rec_tension_min'),
  recTensionMax: integer('rec_tension_max'),
  sourceUrl: text('source_url'),
});

export const recommendationRuns = pgTable('recommendation_runs', {
  id: serial('id').primaryKey(),
  racketId: integer('racket_id').references(() => rackets.id),
  inputJson: jsonb('input_json').notNull(),
  outputJson: jsonb('output_json').notNull(),
  confidence: text('confidence').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  recommendationRunId: integer('recommendation_run_id').references(() => recommendationRuns.id),
  ratingPower: integer('rating_power'),
  ratingControl: integer('rating_control'),
  ratingComfort: integer('rating_comfort'),
  durabilityHours: integer('durability_hours'),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Racket = typeof rackets.$inferSelect;
export type InsertRacket = typeof rackets.$inferInsert;
export type RecommendationRun = typeof recommendationRuns.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
