import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import {
  clients,
  conversations,
  leads,
  messages,
  usageLog,
  type Client,
  type Conversation,
  type Message,
  type NewMessage,
} from "./schema";

/** Identifica o cliente pelo número de destino (whatsapp_phone_id), §5.2. */
export async function getClientByPhoneId(
  phoneId: string,
): Promise<Client | null> {
  const [row] = await db
    .select()
    .from(clients)
    .where(eq(clients.whatsappPhoneId, phoneId))
    .limit(1);
  return row ?? null;
}

/** Idempotência do webhook (§5): já processamos essa mensagem da Meta? */
export async function messageExistsByWaId(waId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.waMessageId, waId))
    .limit(1);
  return !!row;
}

/** Conversa por (cliente, contato): cria se não existir. */
export async function getOrCreateConversation(
  clientId: string,
  contactPhone: string,
  contactName?: string | null,
): Promise<Conversation> {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.clientId, clientId),
        eq(conversations.contactPhone, contactPhone),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ clientId, contactPhone, contactName: contactName ?? null })
    .returning();
  return created;
}

/** Últimas N mensagens da conversa, mais antigas primeiro (pro prompt). */
export async function getRecentMessages(
  conversationId: string,
  limit = 12,
): Promise<Message[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function insertMessage(values: NewMessage): Promise<Message> {
  const [row] = await db.insert(messages).values(values).returning();
  return row;
}

/** Atualiza status/last_message_at, closed_at e (opcional) incrementa unread. */
export async function touchConversation(
  conversationId: string,
  opts: {
    status?: Conversation["status"];
    lastMessageAt?: Date;
    incUnread?: number;
    closedAt?: Date | null;
    outOfHoursNotified?: boolean;
    reengagedAt?: Date | null;
  },
): Promise<void> {
  const set: Record<string, unknown> = {
    lastMessageAt: opts.lastMessageAt ?? new Date(),
  };
  if (opts.status) set.status = opts.status;
  if ("closedAt" in opts) set.closedAt = opts.closedAt;
  if (opts.incUnread && opts.incUnread > 0) {
    set.unreadCount = sql`${conversations.unreadCount} + ${opts.incUnread}`;
  }
  if ("outOfHoursNotified" in opts) set.outOfHoursNotified = opts.outOfHoursNotified;
  if ("reengagedAt" in opts) set.reengagedAt = opts.reengagedAt;
  await db
    .update(conversations)
    .set(set)
    .where(eq(conversations.id, conversationId));
}

/**
 * Grava a origem de anúncio ("Clique para WhatsApp") na conversa. A Meta só
 * manda isso na primeira mensagem — ver InboundMessage.referral no pipeline.
 */
export async function saveReferral(
  conversationId: string,
  referral: {
    sourceType?: string;
    sourceId?: string;
    headline?: string;
    ctwaClid?: string;
  },
): Promise<void> {
  await db
    .update(conversations)
    .set({
      referralSourceType: referral.sourceType ?? null,
      referralSourceId: referral.sourceId ?? null,
      referralHeadline: referral.headline ?? null,
      referralCtwaClid: referral.ctwaClid ?? null,
      referralAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));
}

/** Momento da última mensagem NOSSA (bot/você) na conversa, se houver. */
export async function getLastOutboundAt(
  conversationId: string,
): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: messages.createdAt })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        inArray(messages.from, ["bot", "you"]),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

/** De quem foi a última mensagem da conversa ("them" | "bot" | "you"). */
export async function getLastMessageFrom(
  conversationId: string,
): Promise<Message["from"] | null> {
  const [row] = await db
    .select({ from: messages.from })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return row?.from ?? null;
}

export interface InactivityCandidate {
  conversationId: string;
  contactPhone: string;
  clientId: string;
  whatsappPhoneId: string | null;
  closingMessage: string;
  // Reengajamento: a conversa já virou lead? já cutucamos? o cliente quer isso?
  // Ver lib/inactivity.ts, que decide entre cutucar e encerrar.
  isLead: boolean;
  reengagedAt: Date | null;
  reengageLeadsEnabled: boolean;
  reengagementMessage: string;
}

/**
 * Conversas candidatas a encerrar por inatividade: cliente ativo, timeout
 * habilitado (> 0), ainda abertas, NÃO aguardando humano ("novo" é poupado) e
 * sem mensagem há mais que o limite do cliente. Quem falou por último é checado
 * depois (só encerramos quando a bola estava com o cliente).
 *
 * Traz junto o que o reengajamento precisa: se o contato já virou lead (join em
 * leads) e se já levou a cutucada. Um lead ainda não cutucado é reengajado em
 * vez de encerrado.
 */
export async function getInactivityCandidates(): Promise<InactivityCandidate[]> {
  return db
    .select({
      conversationId: conversations.id,
      contactPhone: conversations.contactPhone,
      clientId: clients.id,
      whatsappPhoneId: clients.whatsappPhoneId,
      closingMessage: clients.closingMessage,
      isLead: sql<boolean>`${leads.id} is not null`,
      reengagedAt: conversations.reengagedAt,
      reengageLeadsEnabled: clients.reengageLeadsEnabled,
      reengagementMessage: clients.reengagementMessage,
    })
    .from(conversations)
    .innerJoin(clients, eq(clients.id, conversations.clientId))
    // leftJoin: conversa sem lead continua candidata (só vai encerrar direto).
    .leftJoin(leads, eq(leads.conversationId, conversations.id))
    .where(
      and(
        eq(clients.status, "active"),
        sql`${clients.inactivityMinutes} > 0`,
        sql`${conversations.closedAt} is null`,
        inArray(conversations.status, ["ia", "voce"]),
        sql`${conversations.lastMessageAt} < now() - make_interval(mins => ${clients.inactivityMinutes})`,
      ),
    );
}

/** Upsert simples de lead: 1 por conversa (§5.7). Retorna se criou um novo. */
export async function upsertLead(input: {
  clientId: string;
  conversationId: string;
  contactName?: string | null;
  courseInterest?: string | null;
  channel?: "anuncio" | "organico";
}): Promise<{ created: boolean }> {
  const [existing] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.conversationId, input.conversationId))
    .limit(1);

  if (existing) {
    if (input.courseInterest) {
      await db
        .update(leads)
        .set({ courseInterest: input.courseInterest })
        .where(eq(leads.id, existing.id));
    }
    return { created: false };
  }

  await db.insert(leads).values({
    clientId: input.clientId,
    conversationId: input.conversationId,
    contactName: input.contactName ?? null,
    courseInterest: input.courseInterest ?? null,
    channel: input.channel ?? "organico",
    status: "novo",
  });
  return { created: true };
}

/** Registra consumo pra tela de Faturamento (§6). Custos já vêm em USD, calculados na hora da chamada (ver src/lib/pricing.ts). */
export async function logUsage(input: {
  clientId: string;
  tokensIn: number;
  tokensOut: number;
  audioSeconds: number;
  whatsappMessages: number;
  aiCostUsd: number;
  audioCostUsd: number;
}): Promise<void> {
  await db.insert(usageLog).values({
    ...input,
    aiCostUsd: String(input.aiCostUsd),
    audioCostUsd: String(input.audioCostUsd),
  });
}
