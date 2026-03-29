CREATE TYPE "public"."booked_via" AS ENUM('ai_webchat', 'ai_sms', 'ai_whatsapp', 'ai_email', 'ai_call', 'manual', 'public_form');--> statement-breakpoint
CREATE TYPE "public"."google_calendar_sync_status" AS ENUM('pending', 'synced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'notified', 'booked', 'expired');--> statement-breakpoint
CREATE TABLE "bookable_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"qualifying_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_team_members_service_user_unique" UNIQUE("service_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "google_calendar_busy_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"google_event_id" text NOT NULL,
	"summary" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gcal_busy_blocks_event_id_unique" UNIQUE("google_event_id")
);
--> statement-breakpoint
CREATE TABLE "google_calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_sync_at" timestamp,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gcal_connections_org_user_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"service_id" uuid,
	"preferred_date_range" jsonb,
	"preferred_time_of_day" text,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "service_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "booked_via" "booked_via";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_calendar_sync_status" "google_calendar_sync_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "bookable_services" ADD CONSTRAINT "bookable_services_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_team_members" ADD CONSTRAINT "service_team_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_team_members" ADD CONSTRAINT "service_team_members_service_id_bookable_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."bookable_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_team_members" ADD CONSTRAINT "service_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_busy_blocks" ADD CONSTRAINT "google_calendar_busy_blocks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_busy_blocks" ADD CONSTRAINT "google_calendar_busy_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_service_id_bookable_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."bookable_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookable_services_org_id_idx" ON "bookable_services" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "bookable_services_org_active_idx" ON "bookable_services" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "service_team_members_org_id_idx" ON "service_team_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "service_team_members_org_user_idx" ON "service_team_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "gcal_busy_blocks_org_user_time_idx" ON "google_calendar_busy_blocks" USING btree ("org_id","user_id","start_time");--> statement-breakpoint
CREATE INDEX "gcal_connections_org_id_idx" ON "google_calendar_connections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "gcal_connections_sync_enabled_idx" ON "google_calendar_connections" USING btree ("sync_enabled");--> statement-breakpoint
CREATE INDEX "waitlist_org_id_idx" ON "waitlist" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "waitlist_org_status_idx" ON "waitlist" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "waitlist_org_contact_idx" ON "waitlist" USING btree ("org_id","contact_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_bookable_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."bookable_services"("id") ON DELETE set null ON UPDATE no action;