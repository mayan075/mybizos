DROP INDEX "org_members_org_user_idx";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "previous_refresh_token" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "previous_refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookable_services" ADD COLUMN "pricing_mode" text DEFAULT 'range' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookable_services" ADD COLUMN "pricing_unit" text DEFAULT 'job' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookable_services" ADD COLUMN "price_min" integer;--> statement-breakpoint
ALTER TABLE "bookable_services" ADD COLUMN "price_max" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_idx" ON "sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_user_unique_idx" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refresh_token");--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_balance_check" CHECK ("wallet_accounts"."balance" >= 0);