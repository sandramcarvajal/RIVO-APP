ALTER TABLE "users" ALTER COLUMN "rating" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_documents" ADD COLUMN "document_name" text;--> statement-breakpoint
ALTER TABLE "user_documents" ADD COLUMN "uploaded_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "review_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD COLUMN "document_name" text;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD COLUMN "uploaded_at" timestamp DEFAULT now();