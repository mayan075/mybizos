-- Add refresh token support to sessions table for persistent auth
ALTER TABLE "sessions" ADD COLUMN "refresh_token" text UNIQUE;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "previous_refresh_token" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "previous_refresh_token_expires_at" timestamp;--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_idx" ON "sessions" USING btree ("refresh_token");
