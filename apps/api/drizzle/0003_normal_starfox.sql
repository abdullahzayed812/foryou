CREATE TYPE "public"."import_request_status" AS ENUM('open', 'offer_selected', 'closed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('active', 'selected', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_stage" AS ENUM('awaiting_deposit', 'deposit_paid', 'processing', 'delivered', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('import', 'express');--> statement-breakpoint
CREATE TABLE "import_request_ignores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_request_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_request_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_request_id" uuid NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"notes" jsonb,
	"source_country" text,
	"status" "import_request_status" DEFAULT 'open' NOT NULL,
	"deposit_deadline_strikes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_request_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"estimated_delivery_days" integer NOT NULL,
	"deposit_percentage" integer NOT NULL,
	"status" "offer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_deposit_percentage_check" CHECK ("offers"."deposit_percentage" IN (20, 30, 40, 50))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "order_type" NOT NULL,
	"customer_id" uuid NOT NULL,
	"import_request_id" uuid,
	"offer_id" uuid,
	"seller_id" uuid,
	"merchant_id" uuid,
	"total_amount" numeric(10, 2) NOT NULL,
	"deposit_percentage" integer,
	"deposit_amount" numeric(10, 2),
	"stage" "order_stage" DEFAULT 'awaiting_deposit' NOT NULL,
	"deposit_deadline_at" timestamp with time zone,
	"deposit_deadline_strikes" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_request_ignores" ADD CONSTRAINT "import_request_ignores_import_request_id_import_requests_id_fk" FOREIGN KEY ("import_request_id") REFERENCES "public"."import_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_request_ignores" ADD CONSTRAINT "import_request_ignores_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_request_links" ADD CONSTRAINT "import_request_links_import_request_id_import_requests_id_fk" FOREIGN KEY ("import_request_id") REFERENCES "public"."import_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_requests" ADD CONSTRAINT "import_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_import_request_id_import_requests_id_fk" FOREIGN KEY ("import_request_id") REFERENCES "public"."import_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_import_request_id_import_requests_id_fk" FOREIGN KEY ("import_request_id") REFERENCES "public"."import_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_request_ignores_unique" ON "import_request_ignores" USING btree ("import_request_id","seller_id");--> statement-breakpoint
CREATE INDEX "import_request_links_request_id_idx" ON "import_request_links" USING btree ("import_request_id");--> statement-breakpoint
CREATE INDEX "import_requests_customer_id_idx" ON "import_requests" USING btree ("customer_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_request_seller_unique" ON "offers" USING btree ("import_request_id","seller_id");--> statement-breakpoint
CREATE INDEX "offers_import_request_id_idx" ON "offers" USING btree ("import_request_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_offer_id_unique" ON "orders" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id","stage");--> statement-breakpoint
CREATE INDEX "orders_seller_id_idx" ON "orders" USING btree ("seller_id","stage");