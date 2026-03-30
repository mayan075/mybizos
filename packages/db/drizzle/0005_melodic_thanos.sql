CREATE TYPE "public"."social_platform" AS ENUM('facebook', 'instagram', 'google_business', 'linkedin', 'nextdoor');--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"account_name" text NOT NULL,
	"platform_account_id" text NOT NULL,
	"platform_page_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_accounts_org_id_idx" ON "social_accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "social_accounts_org_platform_idx" ON "social_accounts" USING btree ("org_id","platform");