CREATE TYPE "public"."booking_status" AS ENUM('requested', 'accepted', 'in_progress', 'ready', 'collected', 'cancelled', 'declined');--> statement-breakpoint
CREATE TYPE "public"."brand_kind" AS ENUM('string', 'racket', 'retailer');--> statement-breakpoint
CREATE TYPE "public"."brand_plan" AS ENUM('free', 'insights', 'partner');--> statement-breakpoint
CREATE TYPE "public"."shop_plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TABLE "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"string_id" integer,
	"offer_id" integer,
	"campaign_id" integer,
	"run_id" integer,
	"user_id" integer,
	"source" text NOT NULL,
	"destination" text NOT NULL,
	"converted_at" timestamp,
	"order_cents" integer,
	"commission_cents" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliate_clicks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"player_user_id" integer,
	"saved_racket_id" integer,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"racket_label" text NOT NULL,
	"string_id" integer,
	"mains" text,
	"crosses" text,
	"gauge" text,
	"tension_mains" real,
	"tension_crosses" real,
	"player_supplies_string" boolean DEFAULT false NOT NULL,
	"rush" boolean DEFAULT false NOT NULL,
	"drop_off_at" timestamp NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" "booking_status" DEFAULT 'requested' NOT NULL,
	"status_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_cents" integer,
	"notes" text,
	"shop_notes" text,
	"share_history" boolean DEFAULT true NOT NULL,
	"recommendation_run_id" integer,
	"sample_program_id" integer,
	"affiliate_click_id" integer,
	"string_job_id" integer,
	"rating" integer,
	"source" text DEFAULT 'app' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "brand_kind" DEFAULT 'string' NOT NULL,
	"tagline" text,
	"about" text,
	"website" text,
	"accent" text,
	"plan" "brand_plan" DEFAULT 'free' NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"run_id" integer,
	"kind" text NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"fit_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"string_id" integer NOT NULL,
	"name" text NOT NULL,
	"headline" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cpc_cents" integer NOT NULL,
	"monthly_budget_cents" integer NOT NULL,
	"levels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "retail_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"retailer_id" integer NOT NULL,
	"string_id" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"url" text NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"commission_pct" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sample_program_shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sample_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"string_id" integer NOT NULL,
	"title" text NOT NULL,
	"pitch" text,
	"units_total" integer NOT NULL,
	"install_fee_cents" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"bio" text,
	"address" text,
	"city" text,
	"phone" text,
	"email" text,
	"website" text,
	"certifications" text,
	"machine" text,
	"opening_hours" text,
	"labour_cents" integer DEFAULT 2000 NOT NULL,
	"rush_cents" integer DEFAULT 1000 NOT NULL,
	"turnaround_hours" integer DEFAULT 48 NOT NULL,
	"accepting_bookings" boolean DEFAULT true NOT NULL,
	"plan" "shop_plan" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shops_owner_user_id_unique" UNIQUE("owner_user_id"),
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "string_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"string_id" integer NOT NULL,
	"kind" text NOT NULL,
	"player_hash" text,
	"level" text,
	"playstyle" text,
	"region" text,
	"rating" integer,
	"racket_brand" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strings" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer,
	"brand_name" text NOT NULL,
	"model" text NOT NULL,
	"family" text NOT NULL,
	"gauges" text,
	"stiffness" integer,
	"comfort" integer,
	"spin" integer,
	"control" integer,
	"power" integer,
	"durability" integer,
	"set_price_cents" integer,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "saved_stringers" ADD COLUMN "shop_id" integer;--> statement-breakpoint
ALTER TABLE "string_jobs" ADD COLUMN "booking_id" integer;--> statement-breakpoint
ALTER TABLE "string_jobs" ADD COLUMN "string_id" integer;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_string_id_strings_id_fk" FOREIGN KEY ("string_id") REFERENCES "public"."strings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_offer_id_retail_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."retail_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_run_id_recommendation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."recommendation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_player_user_id_users_id_fk" FOREIGN KEY ("player_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_saved_racket_id_saved_rackets_id_fk" FOREIGN KEY ("saved_racket_id") REFERENCES "public"."saved_rackets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_string_id_strings_id_fk" FOREIGN KEY ("string_id") REFERENCES "public"."strings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_recommendation_run_id_recommendation_runs_id_fk" FOREIGN KEY ("recommendation_run_id") REFERENCES "public"."recommendation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_run_id_recommendation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."recommendation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_string_id_strings_id_fk" FOREIGN KEY ("string_id") REFERENCES "public"."strings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_offers" ADD CONSTRAINT "retail_offers_retailer_id_brands_id_fk" FOREIGN KEY ("retailer_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_offers" ADD CONSTRAINT "retail_offers_string_id_strings_id_fk" FOREIGN KEY ("string_id") REFERENCES "public"."strings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_program_shops" ADD CONSTRAINT "sample_program_shops_program_id_sample_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."sample_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_program_shops" ADD CONSTRAINT "sample_program_shops_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_programs" ADD CONSTRAINT "sample_programs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_programs" ADD CONSTRAINT "sample_programs_string_id_strings_id_fk" FOREIGN KEY ("string_id") REFERENCES "public"."strings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "string_signals" ADD CONSTRAINT "string_signals_string_id_strings_id_fk" FOREIGN KEY ("string_id") REFERENCES "public"."strings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strings" ADD CONSTRAINT "strings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_clicks_string_idx" ON "affiliate_clicks" USING btree ("string_id");--> statement-breakpoint
CREATE INDEX "bookings_shop_idx" ON "bookings" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "bookings_player_idx" ON "bookings" USING btree ("player_user_id");--> statement-breakpoint
CREATE INDEX "campaign_events_campaign_idx" ON "campaign_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_brand_idx" ON "campaigns" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "retail_offers_retailer_string_idx" ON "retail_offers" USING btree ("retailer_id","string_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sample_program_shop_idx" ON "sample_program_shops" USING btree ("program_id","shop_id");--> statement-breakpoint
CREATE INDEX "string_signals_string_idx" ON "string_signals" USING btree ("string_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "strings_brand_model_idx" ON "strings" USING btree ("brand_name","model");