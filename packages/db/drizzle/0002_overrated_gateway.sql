CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'send', 'invite', 'role_change');--> statement-breakpoint
CREATE TYPE "public"."usage_resource" AS ENUM('ai_call_minute', 'sms_outbound_us', 'sms_outbound_au', 'sms_inbound', 'phone_number_us', 'phone_number_au', 'phone_number_au_tollfree');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_category" AS ENUM('topup', 'ai_call', 'sms_outbound', 'sms_inbound', 'phone_number', 'refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"resource" "usage_resource" NOT NULL,
	"cost_per_unit" numeric(10, 4) NOT NULL,
	"price_per_unit" numeric(10, 4) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"auto_recharge_enabled" boolean DEFAULT false NOT NULL,
	"auto_recharge_threshold" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"auto_recharge_amount" numeric(10, 2) DEFAULT '50.00' NOT NULL,
	"stripe_payment_method_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_after" numeric(10, 2) NOT NULL,
	"category" "wallet_transaction_category" NOT NULL,
	"description" text NOT NULL,
	"related_resource_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "vapi_assistant_id" text;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "vapi_phone_number_id" text;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD COLUMN "gemini_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD COLUMN "provider" text DEFAULT 'vapi';--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD COLUMN "audio_duration_in_ms" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD COLUMN "audio_duration_out_ms" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD COLUMN "text_tokens_in" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD COLUMN "text_tokens_out" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ai_call_logs" ADD COLUMN "actual_cost" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_rates" ADD CONSTRAINT "usage_rates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_id_idx" ON "audit_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("org_id","action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("org_id","resource");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_rates_org_id_idx" ON "usage_rates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "usage_rates_resource_idx" ON "usage_rates" USING btree ("resource");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_accounts_org_id_idx" ON "wallet_accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_org_id_idx" ON "wallet_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_category_idx" ON "wallet_transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_agents_vapi_assistant_idx" ON "ai_agents" USING btree ("vapi_assistant_id");