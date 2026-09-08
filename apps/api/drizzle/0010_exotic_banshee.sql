CREATE TYPE "public"."product_lifecycle" AS ENUM('wanted', 'importing', 'express');--> statement-breakpoint
CREATE TYPE "public"."wanted_cycle_status" AS ENUM('active', 'importing', 'completed');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'product_wanted_available' BEFORE 'account_suspended';--> statement-breakpoint
CREATE TABLE "wanted_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"status" "wanted_cycle_status" DEFAULT 'active' NOT NULL,
	"imported_quantity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"importing_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wanted_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wanted_cycle_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wanted_notify_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wanted_cycle_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lifecycle" "product_lifecycle" DEFAULT 'express' NOT NULL;--> statement-breakpoint
ALTER TABLE "wanted_cycles" ADD CONSTRAINT "wanted_cycles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_likes" ADD CONSTRAINT "wanted_likes_wanted_cycle_id_wanted_cycles_id_fk" FOREIGN KEY ("wanted_cycle_id") REFERENCES "public"."wanted_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_likes" ADD CONSTRAINT "wanted_likes_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_notify_requests" ADD CONSTRAINT "wanted_notify_requests_wanted_cycle_id_wanted_cycles_id_fk" FOREIGN KEY ("wanted_cycle_id") REFERENCES "public"."wanted_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_notify_requests" ADD CONSTRAINT "wanted_notify_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wanted_cycles_product_number_unique" ON "wanted_cycles" USING btree ("product_id","cycle_number");--> statement-breakpoint
CREATE UNIQUE INDEX "wanted_cycles_one_open_per_product" ON "wanted_cycles" USING btree ("product_id") WHERE "wanted_cycles"."status" <> 'completed';--> statement-breakpoint
CREATE INDEX "wanted_cycles_product_id_idx" ON "wanted_cycles" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wanted_likes_cycle_customer_unique" ON "wanted_likes" USING btree ("wanted_cycle_id","customer_id");--> statement-breakpoint
CREATE INDEX "wanted_likes_cycle_id_idx" ON "wanted_likes" USING btree ("wanted_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wanted_notify_requests_cycle_customer_unique" ON "wanted_notify_requests" USING btree ("wanted_cycle_id","customer_id");--> statement-breakpoint
CREATE INDEX "wanted_notify_requests_cycle_id_idx" ON "wanted_notify_requests" USING btree ("wanted_cycle_id");