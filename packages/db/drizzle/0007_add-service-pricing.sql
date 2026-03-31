ALTER TABLE "bookable_services" ADD COLUMN "pricing_mode" text DEFAULT 'range' NOT NULL;
ALTER TABLE "bookable_services" ADD COLUMN "pricing_unit" text DEFAULT 'job' NOT NULL;
ALTER TABLE "bookable_services" ADD COLUMN "price_min" integer;
ALTER TABLE "bookable_services" ADD COLUMN "price_max" integer;
