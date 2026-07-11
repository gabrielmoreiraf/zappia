ALTER TABLE "clients" ADD COLUMN "notification_email" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "notify_new_lead" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "notify_handoff" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "notify_daily_summary" boolean DEFAULT false NOT NULL;