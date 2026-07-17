import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "./index";
import {
  clients,
  conversations,
  dismissedNotifications,
  leads,
  messages,
  usageLog,
  type Conversation,
  type Lead,
  type Message,
} from "./schema";

/* ---------- helpers de data ---------- */

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ---------- dashboard (§4.3) ---------- */

export interface DashboardData {
  conversasHoje: number;
  leadsHoje: number;
  tempoRespostaSeg: number | null;
  pctResolvidoIA: number;
  week: { d: string; v: number }[];
  recentLeads: Lead[];
  handoffsHoje: number;
}

export async function getDashboard(clientId: string): Promise<DashboardData> {
  const today = startOfToday();
  const weekStart = daysAgo(6);

  // Conversas ativas hoje
  const [convHoje] = await db
    .select({ c: count() })
    .from(conversations)
    .where(
      and(
        eq(conversations.clientId, clientId),
        gte(conversations.lastMessageAt, today),
      ),
    );

  // Leads hoje
  const [leadHoje] = await db
    .select({ c: count() })
    .from(leads)
    .where(and(eq(leads.clientId, clientId), gte(leads.createdAt, today)));

  // Conversas ativas hoje por status (pra % resolvido e handoffs)
  const activeToday = await db
    .select({ status: conversations.status })
    .from(conversations)
    .where(
      and(
        eq(conversations.clientId, clientId),
        gte(conversations.lastMessageAt, today),
      ),
    );
  const totalToday = activeToday.length;
  const iaToday = activeToday.filter((c) => c.status === "ia").length;
  const handoffsHoje = activeToday.filter((c) => c.status === "novo").length;
  const pctResolvidoIA =
    totalToday > 0 ? Math.round((iaToday / totalToday) * 100) : 0;

  // Tempo de resposta médio hoje (gap them → bot seguinte)
  const convoIds = (
    await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.clientId, clientId))
  ).map((r) => r.id);

  let tempoRespostaSeg: number | null = null;
  if (convoIds.length) {
    const msgsToday = await db
      .select({
        conversationId: messages.conversationId,
        from: messages.from,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, convoIds),
          gte(messages.createdAt, today),
        ),
      )
      .orderBy(messages.createdAt);

    const gaps: number[] = [];
    const lastThem = new Map<string, Date>();
    for (const m of msgsToday) {
      if (m.from === "them") lastThem.set(m.conversationId, m.createdAt);
      else if (m.from === "bot") {
        const t = lastThem.get(m.conversationId);
        if (t) {
          gaps.push((m.createdAt.getTime() - t.getTime()) / 1000);
          lastThem.delete(m.conversationId);
        }
      }
    }
    if (gaps.length) {
      tempoRespostaSeg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    }
  }

  // Atividade da semana (soma de mensagens por dia, via usage_log)
  const logs = await db
    .select({
      createdAt: usageLog.createdAt,
      wa: usageLog.whatsappMessages,
    })
    .from(usageLog)
    .where(
      and(eq(usageLog.clientId, clientId), gte(usageLog.createdAt, weekStart)),
    );

  const buckets = new Map<string, number>();
  for (const l of logs) {
    const key = l.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + l.wa);
  }
  const week: { d: string; v: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    week.push({ d: WEEKDAYS[d.getDay()], v: buckets.get(key) ?? 0 });
  }

  // Leads recentes
  const recentLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.clientId, clientId))
    .orderBy(desc(leads.createdAt))
    .limit(5);

  return {
    conversasHoje: convHoje.c,
    leadsHoje: leadHoje.c,
    tempoRespostaSeg,
    pctResolvidoIA,
    week,
    recentLeads,
    handoffsHoje,
  };
}

/* ---------- notificações (sino do topo) ---------- */

export interface NotificationItem {
  id: string;
  type: "handoff" | "lead" | "fatura";
  title: string;
  sub: string;
  href: string;
  at: Date;
}

const INVOICE_DUE_SOON_DAYS = 5;

/**
 * Só eventos que realmente precisam da atenção do dono: lead novo, conversa
 * aguardando humano, e fatura perto de vencer. Mensagens que a própria IA (ou
 * o humano) já respondeu normalmente NÃO viram notificação — isso não é
 * evento, é o sistema funcionando.
 */
export async function getNotifications(
  clientId: string,
): Promise<{ items: NotificationItem[]; count: number }> {
  const [awaitingHuman, recentLeads, [client]] = await Promise.all([
    db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.clientId, clientId), eq(conversations.status, "novo")),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(10),
    db
      .select()
      .from(leads)
      .where(eq(leads.clientId, clientId))
      .orderBy(desc(leads.createdAt))
      .limit(10),
    db
      .select({
        subscriptionDueDate: clients.subscriptionDueDate,
        subscriptionStatus: clients.subscriptionStatus,
        lifetimeAccess: clients.lifetimeAccess,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1),
  ]);

  const built: NotificationItem[] = [
    ...awaitingHuman.map((c) => ({
      id: `c-${c.id}-${c.lastMessageAt.getTime()}`,
      type: "handoff" as const,
      title: `${c.contactName ?? "Contato"} precisa de você`,
      sub: "Conversa encaminhada pela IA",
      href: `/conversas?c=${c.id}`,
      at: c.lastMessageAt,
    })),
    ...recentLeads.map((l) => ({
      id: `l-${l.id}`,
      type: "lead" as const,
      title: `Novo lead: ${l.contactName ?? "Contato"}`,
      sub: l.courseInterest ?? "Interesse identificado",
      href: "/leads",
      at: l.createdAt,
    })),
  ];

  if (
    client &&
    !client.lifetimeAccess &&
    client.subscriptionStatus === "active" &&
    client.subscriptionDueDate
  ) {
    const daysLeft = Math.ceil(
      (client.subscriptionDueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    if (daysLeft >= 0 && daysLeft <= INVOICE_DUE_SOON_DAYS) {
      built.push({
        // chave por dia: não repete a cada refresh, só quando o dia muda.
        id: `f-${clientId}-${client.subscriptionDueDate.toISOString().slice(0, 10)}`,
        type: "fatura",
        title:
          daysLeft === 0
            ? "Sua fatura vence hoje"
            : `Sua fatura vence em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`,
        sub: "Toque pra ver os detalhes do plano",
        href: "/config",
        at: new Date(),
      });
    }
  }

  built.sort((a, b) => b.at.getTime() - a.at.getTime());

  // Remove as dispensadas.
  const dismissed = new Set(
    (
      await db
        .select({ k: dismissedNotifications.notifKey })
        .from(dismissedNotifications)
        .where(eq(dismissedNotifications.clientId, clientId))
    ).map((r) => r.k),
  );
  const items = built.filter((n) => !dismissed.has(n.id)).slice(0, 12);

  return { items, count: items.length };
}

/* ---------- resumo diário (Fase 7 · e-mail) ---------- */

export interface DailySummary {
  conversas: number;
  leads: number;
  resolvidoPct: number;
  handoffs: number;
}

/** Estatísticas de ONTEM para um cliente (usado no resumo diário por e-mail). */
export async function getYesterdaySummary(
  clientId: string,
): Promise<DailySummary> {
  const start = daysAgo(1);
  const end = startOfToday();

  const active = await db
    .select({ status: conversations.status })
    .from(conversations)
    .where(
      and(
        eq(conversations.clientId, clientId),
        gte(conversations.lastMessageAt, start),
        lt(conversations.lastMessageAt, end),
      ),
    );
  const total = active.length;
  const ia = active.filter((c) => c.status === "ia").length;
  const handoffs = active.filter((c) => c.status === "novo").length;

  const [leadCount] = await db
    .select({ c: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        gte(leads.createdAt, start),
        lt(leads.createdAt, end),
      ),
    );

  return {
    conversas: total,
    leads: leadCount.c,
    resolvidoPct: total > 0 ? Math.round((ia / total) * 100) : 0,
    handoffs,
  };
}

/* ---------- conversas (§4.4) ---------- */

export interface ConversationListItem extends Conversation {
  lastMessage: Message | null;
}

export async function getConversationsList(
  clientId: string,
): Promise<ConversationListItem[]> {
  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.clientId, clientId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(50);

  const ids = convos.map((c) => c.id);
  const lastByConv = new Map<string, Message>();
  if (ids.length) {
    const msgs = await db
      .select()
      .from(messages)
      .where(inArray(messages.conversationId, ids))
      .orderBy(desc(messages.createdAt));
    for (const m of msgs) {
      if (!lastByConv.has(m.conversationId)) lastByConv.set(m.conversationId, m);
    }
  }
  return convos.map((c) => ({ ...c, lastMessage: lastByConv.get(c.id) ?? null }));
}

export interface ConversationStatusCounts {
  total: number;
  ia: number;
  novo: number;
  voce: number;
  foraDoHorario: number;
}

/** Contagem por status (§ filtro de Conversas), sempre do total real, não só da página de 50. */
export async function getConversationStatusCounts(
  clientId: string,
): Promise<ConversationStatusCounts> {
  const [rows, [outOfHours]] = await Promise.all([
    db
      .select({ status: conversations.status, c: count() })
      .from(conversations)
      .where(eq(conversations.clientId, clientId))
      .groupBy(conversations.status),
    db
      .select({ c: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.outOfHoursNotified, true),
        ),
      ),
  ]);

  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.c]));
  const ia = byStatus.ia ?? 0;
  const novo = byStatus.novo ?? 0;
  const voce = byStatus.voce ?? 0;
  return { total: ia + novo + voce, ia, novo, voce, foraDoHorario: outOfHours?.c ?? 0 };
}

export async function getConversationThread(
  clientId: string,
  conversationId: string,
): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clientId, clientId),
      ),
    )
    .limit(1);
  if (!conversation) return null;

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return { conversation, messages: msgs };
}

/* ---------- leads (§4.5) ---------- */

/**
 * Lead + de qual anúncio ele veio. A origem mora na conversa (a Meta manda o
 * referral na 1ª mensagem, ver pipeline), então juntamos aqui pra tela poder
 * dizer "veio da campanha X", e não só "veio de anúncio".
 */
export type LeadWithSource = Lead & { referralHeadline: string | null };

const leadWithSourceColumns = {
  id: leads.id,
  clientId: leads.clientId,
  conversationId: leads.conversationId,
  contactName: leads.contactName,
  courseInterest: leads.courseInterest,
  channel: leads.channel,
  status: leads.status,
  createdAt: leads.createdAt,
  referralHeadline: conversations.referralHeadline,
};

export async function getLeads(
  clientId: string,
  status?: Lead["status"],
): Promise<LeadWithSource[]> {
  const where = status
    ? and(eq(leads.clientId, clientId), eq(leads.status, status))
    : eq(leads.clientId, clientId);
  return db
    .select(leadWithSourceColumns)
    .from(leads)
    .leftJoin(conversations, eq(conversations.id, leads.conversationId))
    .where(where)
    .orderBy(desc(leads.createdAt));
}

/** Só os leads escolhidos (exportação seletiva), sempre restrito ao cliente. */
export async function getLeadsByIds(
  clientId: string,
  ids: string[],
): Promise<LeadWithSource[]> {
  if (ids.length === 0) return [];
  return db
    .select(leadWithSourceColumns)
    .from(leads)
    .leftJoin(conversations, eq(conversations.id, leads.conversationId))
    .where(and(eq(leads.clientId, clientId), inArray(leads.id, ids)))
    .orderBy(desc(leads.createdAt));
}
