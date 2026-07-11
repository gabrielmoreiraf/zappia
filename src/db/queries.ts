import { and, desc, eq, sql } from "drizzle-orm";
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

/** Identifica o cliente pelo número de destino (whatsapp_phone_id) — §5.2. */
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

/** Conversa por (cliente, contato) — cria se não existir. */
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

/** Atualiza status/last_message_at e (opcional) incrementa unread. */
export async function touchConversation(
  conversationId: string,
  opts: {
    status?: Conversation["status"];
    lastMessageAt?: Date;
    incUnread?: number;
  },
): Promise<void> {
  const set: Record<string, unknown> = {
    lastMessageAt: opts.lastMessageAt ?? new Date(),
  };
  if (opts.status) set.status = opts.status;
  if (opts.incUnread && opts.incUnread > 0) {
    set.unreadCount = sql`${conversations.unreadCount} + ${opts.incUnread}`;
  }
  await db
    .update(conversations)
    .set(set)
    .where(eq(conversations.id, conversationId));
}

/** Upsert simples de lead: 1 por conversa (§5.7). */
export async function upsertLead(input: {
  clientId: string;
  conversationId: string;
  contactName?: string | null;
  courseInterest?: string | null;
  channel?: "anuncio" | "organico";
}): Promise<void> {
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
    return;
  }

  await db.insert(leads).values({
    clientId: input.clientId,
    conversationId: input.conversationId,
    contactName: input.contactName ?? null,
    courseInterest: input.courseInterest ?? null,
    channel: input.channel ?? "organico",
    status: "novo",
  });
}

/** Registra consumo pra tela de Faturamento (§6). */
export async function logUsage(input: {
  clientId: string;
  tokensIn: number;
  tokensOut: number;
  audioSeconds: number;
  whatsappMessages: number;
}): Promise<void> {
  await db.insert(usageLog).values(input);
}
