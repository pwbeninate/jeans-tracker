CREATE TABLE "jeans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand" text NOT NULL,
	"name" text NOT NULL,
	"fit" text,
	"color" text,
	"tag_size" text NOT NULL,
	"purchase_price" numeric(10, 2),
	"purchase_date" date,
	"purchased_used" boolean DEFAULT false NOT NULL,
	"initial_wash_count" integer DEFAULT 0 NOT NULL,
	"initial_wear_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"retired_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jean_id" uuid NOT NULL,
	"measured_on" date NOT NULL,
	"is_original" boolean DEFAULT false NOT NULL,
	"waist" numeric(5, 2),
	"rise" numeric(5, 2),
	"inseam" numeric(5, 2),
	"thigh" numeric(5, 2),
	"knee" numeric(5, 2),
	"leg_opening" numeric(5, 2),
	"hip" numeric(5, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wash_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jean_id" uuid NOT NULL,
	"washed_on" date NOT NULL,
	"method" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wear_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jean_id" uuid NOT NULL,
	"worn_on" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jeans" ADD CONSTRAINT "jeans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_jean_id_jeans_id_fk" FOREIGN KEY ("jean_id") REFERENCES "public"."jeans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wash_logs" ADD CONSTRAINT "wash_logs_jean_id_jeans_id_fk" FOREIGN KEY ("jean_id") REFERENCES "public"."jeans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wear_logs" ADD CONSTRAINT "wear_logs_jean_id_jeans_id_fk" FOREIGN KEY ("jean_id") REFERENCES "public"."jeans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jeans_user_idx" ON "jeans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "measurements_jean_idx" ON "measurements" USING btree ("jean_id");--> statement-breakpoint
CREATE UNIQUE INDEX "measurements_one_original" ON "measurements" USING btree ("jean_id") WHERE "measurements"."is_original";--> statement-breakpoint
CREATE INDEX "wash_logs_jean_idx" ON "wash_logs" USING btree ("jean_id");--> statement-breakpoint
CREATE INDEX "wear_logs_jean_idx" ON "wear_logs" USING btree ("jean_id");