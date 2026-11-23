CREATE TYPE "public"."user_tier" AS ENUM('free', 'pro', 'club');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendation_run_id" integer NOT NULL,
	"rating_power" integer,
	"rating_control" integer,
	"rating_comfort" integer,
	"durability_hours" real,
	"comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rackets" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport" text DEFAULT 'tennis' NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"head_size" integer,
	"string_pattern" text,
	"weight_unstrung" real,
	"balance" text,
	"stiffness_ra" integer,
	"beam_width" text,
	"rec_tension_min" integer,
	"rec_tension_max" integer,
	"source_url" text,
	"level" text DEFAULT 'intermediate',
	"year" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommendation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" text,
	"racket_id" integer,
	"racket_label" text,
	"saved_racket_id" integer,
	"inputs_json" jsonb NOT NULL,
	"output_json" jsonb NOT NULL,
	"confidence" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_rackets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nickname" text NOT NULL,
	"brand" text,
	"model" text,
	"head_size" text,
	"string_pattern" text,
	"weight" text,
	"hours_per_week" real,
	"restring_interval_days" integer,
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"last_reminder_sent_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_stringers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stringer_name" text NOT NULL,
	"stringer_address" text,
	"stringer_place_id" text,
	"phone" text,
	"email" text,
	"website" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "string_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"saved_racket_id" integer NOT NULL,
	"stringer_id" integer,
	"recommendation_run_id" integer,
	"strung_at" timestamp NOT NULL,
	"mains" text,
	"crosses" text,
	"gauge" text,
	"tension_mains" real,
	"tension_crosses" real,
	"price" real,
	"rating" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"tier" "user_tier" DEFAULT 'free' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"first_name" text,
	"last_name" text,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"password_hash" text,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"reminder_frequency_weeks" integer DEFAULT 4,
	"last_restrung_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_recommendation_run_id_recommendation_runs_id_fk" FOREIGN KEY ("recommendation_run_id") REFERENCES "public"."recommendation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_racket_id_rackets_id_fk" FOREIGN KEY ("racket_id") REFERENCES "public"."rackets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_rackets" ADD CONSTRAINT "saved_rackets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_stringers" ADD CONSTRAINT "saved_stringers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "string_jobs" ADD CONSTRAINT "string_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "string_jobs" ADD CONSTRAINT "string_jobs_saved_racket_id_saved_rackets_id_fk" FOREIGN KEY ("saved_racket_id") REFERENCES "public"."saved_rackets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "string_jobs" ADD CONSTRAINT "string_jobs_stringer_id_saved_stringers_id_fk" FOREIGN KEY ("stringer_id") REFERENCES "public"."saved_stringers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "string_jobs" ADD CONSTRAINT "string_jobs_recommendation_run_id_recommendation_runs_id_fk" FOREIGN KEY ("recommendation_run_id") REFERENCES "public"."recommendation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_runs_user_idx" ON "recommendation_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_rackets_user_idx" ON "saved_rackets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_stringers_user_idx" ON "saved_stringers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "string_jobs_racket_idx" ON "string_jobs" USING btree ("saved_racket_id");--> statement-breakpoint
CREATE INDEX "string_jobs_user_idx" ON "string_jobs" USING btree ("user_id");