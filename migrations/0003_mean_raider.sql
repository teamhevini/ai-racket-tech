CREATE TABLE "stringer_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"inviter_user_id" integer NOT NULL,
	"saved_stringer_id" integer NOT NULL,
	"accepted_shop_id" integer,
	"accepted_at" timestamp,
	"opens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stringer_invites_code_unique" UNIQUE("code"),
	CONSTRAINT "stringer_invites_saved_stringer_id_unique" UNIQUE("saved_stringer_id")
);
--> statement-breakpoint
ALTER TABLE "stringer_invites" ADD CONSTRAINT "stringer_invites_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stringer_invites" ADD CONSTRAINT "stringer_invites_saved_stringer_id_saved_stringers_id_fk" FOREIGN KEY ("saved_stringer_id") REFERENCES "public"."saved_stringers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stringer_invites" ADD CONSTRAINT "stringer_invites_accepted_shop_id_shops_id_fk" FOREIGN KEY ("accepted_shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stringer_invites_inviter_idx" ON "stringer_invites" USING btree ("inviter_user_id");