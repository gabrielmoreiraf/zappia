/**
 * Zappia: schema Drizzle (§2 do build spec).
 *
 * Multi-tenant: quase tudo pendura em `clients.id`. Toda query de dados de um
 * cliente filtra por client_id.
 */
import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/* ---------- enums ---------- */

export const planEnum = pgEnum("plan", ["start", "pro"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "paused"]);
export const conversationStatusEnum = pgEnum("conversation_status", [
  "ia",
  "novo",
  "voce",
]);
export const messageFromEnum = pgEnum("message_from", ["them", "bot", "you"]);
export const confidenceEnum = pgEnum("confidence", ["alta", "baixa"]);
export const leadChannelEnum = pgEnum("lead_channel", ["anuncio", "organico"]);
export const leadStatusEnum = pgEnum("lead_status", [
  "novo",
  "contato",
  "matriculado",
]);
export const userRoleEnum = pgEnum("user_role", ["owner", "member"]);

/* ---------- clients ---------- */

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Logo da empresa (data URL base64, como o avatar do usuário). Aparece na
  // sidebar no lugar do ícone genérico.
  logoUrl: text("logo_url"),
  // Cor da marca (#hex). null = verde padrão do Zappia. Quando definida, o
  // painel inteiro é recolorido (variáveis --color-emerald-* no shell).
  brandColor: text("brand_color"),
  // Login simples do cliente no v1 (§3). Auth real de papéis vem depois.
  ownerEmail: text("owner_email"),
  businessDescription: text("business_description"),
  whatsappNumber: text("whatsapp_number"),
  // Concierge: quando o cliente pede pra conectar o número (a equipe conecta na
  // Meta por trás). null = ainda não pediu; preenchido = aguardando conexão.
  whatsappRequestedAt: timestamp("whatsapp_requested_at", {
    withTimezone: true,
  }),
  // Usado pelo webhook (§5.2) para identificar o cliente pelo número de destino.
  whatsappPhoneId: text("whatsapp_phone_id").unique(),
  assistantName: text("assistant_name"),
  tone: text("tone").default("Amigável").notNull(),
  welcomeMessage: text("welcome_message"),
  handoffTriggers: text("handoff_triggers").array().default([]).notNull(),
  // Mensagem de "alta demanda" enviada quando o cliente insiste enquanto a
  // conversa aguarda atendimento humano (não é gerada pela IA, texto fixo).
  waitingMessage: text("waiting_message")
    .default(
      "Estamos com bastante procura no momento, mas logo já retornamos por aqui. Obrigado pela paciência!",
    )
    .notNull(),
  // Encerramento por inatividade: minutos de silêncio do cliente até fechar
  // (0 = desligado) e a mensagem de despedida enviada ao encerrar.
  inactivityMinutes: integer("inactivity_minutes").default(15).notNull(),
  closingMessage: text("closing_message")
    .default(
      "Como ficamos um tempinho sem falar, vou encerrar nosso atendimento por aqui. Se precisar de qualquer coisa, é só me chamar de novo!",
    )
    .notNull(),
  // true assim que o cliente salvar os Ajustes da IA ao menos uma vez (tutorial).
  aiConfigured: boolean("ai_configured").default(false).notNull(),
  // Markdown estruturado (§3 do prompt mestre), injetado no prompt com caching.
  knowledgeBase: text("knowledge_base"),
  plan: planEnum("plan").default("start").notNull(),
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }),
  status: clientStatusEnum("status").default("active").notNull(),
  // Notificações (§4.8 / Fase 7): para onde e quando avisar o dono do negócio.
  notificationEmail: text("notification_email"),
  notifyNewLead: boolean("notify_new_lead").default(true).notNull(),
  notifyHandoff: boolean("notify_handoff").default(true).notNull(),
  notifyDailySummary: boolean("notify_daily_summary")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- conversations ---------- */

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone").notNull(),
    status: conversationStatusEnum("status").default("ia").notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Preenchido quando a conversa é encerrada por inatividade. Uma nova
    // mensagem do cliente zera isso e reabre a conversa (status → "ia").
    closedAt: timestamp("closed_at", { withTimezone: true }),
    unreadCount: integer("unread_count").default(0).notNull(),
  },
  (t) => [unique("conversations_client_contact_uq").on(t.clientId, t.contactPhone)],
);

/* ---------- messages ---------- */

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  from: messageFromEnum("from").notNull(),
  text: text("text").notNull(),
  isAudio: boolean("is_audio").default(false).notNull(),
  courseMentioned: text("course_mentioned"),
  confidence: confidenceEnum("confidence"),
  // ID da mensagem na Meta: idempotência do webhook (§5).
  waMessageId: text("wa_message_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- leads ---------- */

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  contactName: text("contact_name"),
  courseInterest: text("course_interest"),
  channel: leadChannelEnum("channel").default("organico").notNull(),
  status: leadStatusEnum("status").default("novo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- users (login do sistema / admin) ---------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("member").notNull(),
  // Permissões granulares do funcionário (chaves de permissions.ts). O dono
  // (role owner) ignora isso, tem tudo.
  permissions: text("permissions").array().default([]).notNull(),
  // Negócio do usuário-cliente (null para o admin e antes do onboarding).
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  // Perfil: foto e plano da conta (assinatura do Zappia).
  image: text("image"),
  plan: text("plan").default("free").notNull(),
  // null enquanto não confirmou o código de 6 dígitos.
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- verificação de e-mail (código de 6 dígitos, Resend) ---------- */

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  codeHash: text("code_hash").notNull(), // bcrypt do código
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- convites de equipe (funcionários) ---------- */

export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  permissions: text("permissions").array().default([]).notNull(),
  // bcrypt do "secret" que vai no link do convite (a parte após o id).
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- notificações dispensadas (sino do topo) ---------- */

export const dismissedNotifications = pgTable(
  "dismissed_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    notifKey: text("notif_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("dismissed_notif_uq").on(t.clientId, t.notifKey)],
);

/* ---------- usage_log (§6) ---------- */

export const usageLog = pgTable("usage_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  tokensIn: integer("tokens_in").default(0).notNull(),
  tokensOut: integer("tokens_out").default(0).notNull(),
  audioSeconds: integer("audio_seconds").default(0).notNull(),
  whatsappMessages: integer("whatsapp_messages").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- relations (facilita as queries dos painéis) ---------- */

export const clientsRelations = relations(clients, ({ many }) => ({
  conversations: many(conversations),
  leads: many(leads),
  usageLog: many(usageLog),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [conversations.clientId],
      references: [clients.id],
    }),
    messages: many(messages),
    leads: many(leads),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  client: one(clients, { fields: [leads.clientId], references: [clients.id] }),
  conversation: one(conversations, {
    fields: [leads.conversationId],
    references: [conversations.id],
  }),
}));

export const usageLogRelations = relations(usageLog, ({ one }) => ({
  client: one(clients, {
    fields: [usageLog.clientId],
    references: [clients.id],
  }),
}));

/* ---------- tipos inferidos ---------- */

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type TeamInvite = typeof teamInvites.$inferSelect;
export type UsageLog = typeof usageLog.$inferSelect;
export type NewUsageLog = typeof usageLog.$inferInsert;
