CREATE TYPE "public"."agency_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('alta', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('ia', 'novo', 'voce');--> statement-breakpoint
CREATE TYPE "public"."lead_channel" AS ENUM('anuncio', 'organico');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('novo', 'contato', 'matriculado');--> statement-breakpoint
CREATE TYPE "public"."message_from" AS ENUM('them', 'bot', 'you');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('start', 'pro');--> statement-breakpoint
CREATE TABLE "agency_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "agency_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agency_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_email" text,
	"business_description" text,
	"whatsapp_number" text,
	"whatsapp_phone_id" text,
	"assistant_name" text,
	"tone" text DEFAULT 'Amigável' NOT NULL,
	"welcome_message" text,
	"handoff_triggers" text[] DEFAULT '{}' NOT NULL,
	"knowledge_base" text,
	"plan" "plan" DEFAULT 'start' NOT NULL,
	"monthly_fee" numeric(10, 2),
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_whatsapp_phone_id_unique" UNIQUE("whatsapp_phone_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_name" text,
	"contact_phone" text NOT NULL,
	"status" "conversation_status" DEFAULT 'ia' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "conversations_client_contact_uq" UNIQUE("client_id","contact_phone")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"conversation_id" uuid,
	"contact_name" text,
	"course_interest" text,
	"channel" "lead_channel" DEFAULT 'organico' NOT NULL,
	"status" "lead_status" DEFAULT 'novo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"from" "message_from" NOT NULL,
	"text" text NOT NULL,
	"is_audio" boolean DEFAULT false NOT NULL,
	"course_mentioned" text,
	"confidence" "confidence",
	"wa_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_wa_message_id_unique" UNIQUE("wa_message_id")
);
--> statement-breakpoint
CREATE TABLE "usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"audio_seconds" integer DEFAULT 0 NOT NULL,
	"whatsapp_messages" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;