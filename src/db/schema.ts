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
// Espelha o status da assinatura no Asaas. "none" = nunca assinou (cliente
// antigo/manual, sem cobrança). "pending" = assinatura criada, 1ª fatura em
// aberto. Ver src/app/api/webhook/asaas/route.ts para as transições.
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "none",
  "pending",
  "active",
  "overdue",
  "canceled",
]);
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
  // Reengajamento de lead: quando um contato que JÁ virou lead fica em
  // silêncio, em vez de mandar a despedida de cara a IA dá uma cutucada e só
  // encerra se ele continuar quieto (ver lib/inactivity.ts). Usa o mesmo timer
  // de inatividade, então a cutucada sai ~15min depois do silêncio: bem dentro
  // da janela de 24h da Meta, ou seja, texto livre e SEM custo (mensagem fora
  // da janela exigiria template pago — ver pricing.ts).
  reengageLeadsEnabled: boolean("reengage_leads_enabled").default(false).notNull(),
  reengagementMessage: text("reengagement_message")
    .default(
      "Oi! Vi que você se interessou e acabamos parando por aqui. Ficou alguma dúvida? Posso te ajudar a seguir daqui. 😊",
    )
    .notNull(),
  // Horário de atendimento: quando ativado, a IA só responde dentro da janela
  // configurada. Fora dela, manda uma única mensagem avisando e a conversa vira
  // "novo" (aguardando humano) até o expediente voltar. Desligado = 24h (padrão).
  businessHoursEnabled: boolean("business_hours_enabled")
    .default(false)
    .notNull(),
  // JSON por dia da semana: {"mon":{"enabled":true,"start":"08:00","end":"18:00"},...}
  businessHours: text("business_hours"),
  outOfHoursMessage: text("out_of_hours_message")
    .default(
      "No momento estamos fora do nosso horário de atendimento. Assim que o expediente começar, alguém da nossa equipe vai te responder por aqui. Obrigado pela paciência!",
    )
    .notNull(),
  // true assim que o cliente salvar os Ajustes da IA ao menos uma vez (tutorial).
  aiConfigured: boolean("ai_configured").default(false).notNull(),
  // Markdown estruturado (§3 do prompt mestre), injetado no prompt com caching.
  knowledgeBase: text("knowledge_base"),
  plan: planEnum("plan").default("start").notNull(),
  monthlyFee: numeric("monthly_fee", { precision: 10, scale: 2 }),
  status: clientStatusEnum("status").default("active").notNull(),
  // Cobrança (Asaas). cpfCnpj é exigido pela Asaas pra criar o cliente lá.
  cpfCnpj: text("cpf_cnpj"),
  asaasCustomerId: text("asaas_customer_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .default("none")
    .notNull(),
  // Vencimento da próxima cobrança (informado pela Asaas via webhook).
  subscriptionDueDate: timestamp("subscription_due_date", {
    withTimezone: true,
  }),
  // "PIX" | "CREDIT_CARD" | "BOLETO" — vem do billingType do último pagamento.
  paymentMethod: text("payment_method"),
  // Link da fatura em aberto (pra "pagar agora" quando pending/overdue).
  lastInvoiceUrl: text("last_invoice_url"),
  // Pix Automático (BACEN): autorização de débito recorrente, separada da
  // assinatura normal (cartão). A Asaas NÃO cria a cobrança de cada mês
  // sozinha aqui — o cron (api/cron/pix-automatico) que cria, dentro da
  // janela de 2 a 10 dias úteis antes do vencimento (ver asaas.ts).
  pixAutomaticAuthorizationId: text("pix_automatic_authorization_id"),
  // Espelha o status literal da Asaas: CREATED | ACTIVE | CANCELLED | REFUSED | EXPIRED.
  pixAutomaticStatus: text("pix_automatic_status"),
  // Vencimento da próxima cobrança a criar (o cron usa isso pra saber quando agir).
  pixNextChargeDue: timestamp("pix_next_charge_due", { withTimezone: true }),
  // Quantas retentativas já foram disparadas pra cobrança atual (máx. 3, ver
  // "Processo de retentativas Jornada 3" da Asaas). Zera a cada cobrança nova.
  pixRetryAttempt: integer("pix_retry_attempt").default(0).notNull(),
  // Primeira vez que a assinatura ficou "active" (pra mostrar "cliente desde").
  subscriptionStartedAt: timestamp("subscription_started_at", {
    withTimezone: true,
  }),
  // Último pagamento confirmado (espelha payment_events, mas rápido de ler).
  lastPaymentAt: timestamp("last_payment_at", { withTimezone: true }),
  // Crédito de meses grátis dado pelo admin (§ liberar acesso sem cobrar).
  freeMonthsGranted: integer("free_months_granted").default(0).notNull(),
  freeMonthsRemaining: integer("free_months_remaining").default(0).notNull(),
  // Acesso vitalício (sem plano, sem cobrança) — dado pelo admin, ex.: contas
  // internas da própria Zappia. Quando true, some com preço/cobrança na tela.
  lifetimeAccess: boolean("lifetime_access").default(false).notNull(),
  // Dedupe do lembrete de "pagamento chegando": guarda a due date já avisada.
  lastReminderDueDate: timestamp("last_reminder_due_date", {
    withTimezone: true,
  }),
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
    // Já mandamos a mensagem de "fora do expediente" nessa janela fora do
    // horário? Evita repetir a cada mensagem nova do contato; zera quando o
    // expediente volta.
    outOfHoursNotified: boolean("out_of_hours_notified")
      .default(false)
      .notNull(),
    // Quando a IA já deu a cutucada de reengajamento nessa conversa. Garante
    // no máximo UMA por conversa: na segunda vez que o lead fica quieto, a
    // conversa encerra normalmente (ver lib/inactivity.ts).
    reengagedAt: timestamp("reengaged_at", { withTimezone: true }),
    // Origem do contato, quando veio de anúncio "Clique para WhatsApp": a Meta
    // manda um objeto `referral` na PRIMEIRA mensagem da conversa (só nela).
    // Preenchido = veio de anúncio; null = orgânico. Não é inferência nossa, é
    // o que a Meta afirma — por isso não é configurável pelo cliente.
    referralSourceType: text("referral_source_type"), // "ad" | "post"
    referralSourceId: text("referral_source_id"), // qual anúncio
    referralHeadline: text("referral_headline"), // título do anúncio, pro painel
    referralCtwaClid: text("referral_ctwa_clid"), // id do clique (Conversions API)
    referralAt: timestamp("referral_at", { withTimezone: true }),
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
  // Anexo (imagem ou PDF) enviado manualmente pelo humano. Guardado como data
  // URL (base64), igual avatar/logo — sem storage externo.
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // "image" | "document"
  mediaFilename: text("media_filename"), // nome original, só documento
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

/* ---------- respostas rápidas ("/" no chat, como no WhatsApp Business) ---------- */

export const quickReplies = pgTable("quick_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  // Atalho digitado depois da "/" no chat (ex.: "boleto" → "/boleto").
  shortcut: text("shortcut").notNull(),
  message: text("message").notNull(),
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
  // Administrador da agência Zappia (vê /clientes e /faturamento, entra como
  // qualquer cliente). Substitui o antigo e-mail fixo; agora vários usuários
  // podem ser admin, via convite (ver adminInvites).
  isAdmin: boolean("is_admin").default(false).notNull(),
  // Negócio do usuário-cliente (null para o admin e antes do onboarding).
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  // Perfil: foto e plano da conta (assinatura do Zappia).
  image: text("image"),
  plan: text("plan").default("free").notNull(),
  // null enquanto não confirmou o código de 6 dígitos.
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  // Token de uso único (hash) pra logar automaticamente logo após verificar o
  // e-mail no cadastro, sem pedir a senha de novo. Curta duração, limpo no
  // primeiro uso (ver provider "signup-auto" em auth.ts).
  autoLoginToken: text("auto_login_token"),
  autoLoginTokenExpiresAt: timestamp("auto_login_token_expires_at", {
    withTimezone: true,
  }),
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

/* ---------- convites de administrador (agência Zappia) ---------- */

export const adminInvites = pgTable("admin_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  // bcrypt do "secret" que vai no link do convite (a parte após o id).
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedByEmail: text("invited_by_email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- convites de cliente (dono de um novo negócio) ---------- */

export const clientInvites = pgTable("client_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedByEmail: text("invited_by_email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- LGPD: registro de acesso do admin a um cliente ---------- */

export const clientAccessLog = pgTable("client_access_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  adminEmail: text("admin_email").notNull(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ---------- histórico de eventos de pagamento (Asaas) ---------- */

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  asaasPaymentId: text("asaas_payment_id"),
  event: text("event").notNull(),
  status: text("status").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }),
  // Valor líquido que a Asaas repassa (depois da taxa dela). Com os dois, a
  // taxa real do gateway é value - netValue — não precisa mais estimar.
  netValue: numeric("net_value", { precision: 10, scale: 2 }),
  billingType: text("billing_type"),
  dueDate: timestamp("due_date", { withTimezone: true }),
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
  // Custo real (USD) computado NA HORA da chamada, já por modelo e por
  // camada de cache — ver src/lib/pricing.ts. tokensIn/tokensOut acima ficam
  // só como dado informativo/depuração.
  aiCostUsd: numeric("ai_cost_usd", { precision: 12, scale: 6 }).default("0").notNull(),
  audioCostUsd: numeric("audio_cost_usd", { precision: 12, scale: 6 })
    .default("0")
    .notNull(),
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
export type AdminInvite = typeof adminInvites.$inferSelect;
export type ClientInvite = typeof clientInvites.$inferSelect;
export type ClientAccessLog = typeof clientAccessLog.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type QuickReply = typeof quickReplies.$inferSelect;
export type UsageLog = typeof usageLog.$inferSelect;
export type NewUsageLog = typeof usageLog.$inferInsert;
