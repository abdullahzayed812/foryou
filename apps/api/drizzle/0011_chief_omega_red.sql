CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"orders" boolean DEFAULT true NOT NULL,
	"offers" boolean DEFAULT true NOT NULL,
	"disputes" boolean DEFAULT true NOT NULL,
	"reviews" boolean DEFAULT true NOT NULL,
	"verification" boolean DEFAULT true NOT NULL,
	"wallet" boolean DEFAULT true NOT NULL,
	"products" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;