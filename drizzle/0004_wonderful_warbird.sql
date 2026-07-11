CREATE TABLE "dismissed_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"notif_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dismissed_notif_uq" UNIQUE("client_id","notif_key")
);
--> statement-breakpoint
ALTER TABLE "dismissed_notifications" ADD CONSTRAINT "dismissed_notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;