CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jean_id" uuid NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"taken_on" date NOT NULL,
	"caption" text,
	"is_cover" boolean DEFAULT false NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_jean_id_jeans_id_fk" FOREIGN KEY ("jean_id") REFERENCES "public"."jeans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_jean_idx" ON "photos" USING btree ("jean_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_one_cover" ON "photos" USING btree ("jean_id") WHERE "photos"."is_cover";