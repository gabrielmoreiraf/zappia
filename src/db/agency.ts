import { and, count, desc, eq, gte, isNotNull, sum } from "drizzle-orm";
import { db } from "./index";
import {
  clientAccessLog,
  clients,
  conversations,
  leads,
  paymentEvents,
  usageLog,
  type Client,
} from "./schema";
import {
  buildCostBreakdownBRL,
  estimateGatewayFeeBRL,
  type CostBreakdownBRL,
} from "@/lib/pricing";

/* ---------- Clientes (§4.9) ---------- */

export interface ClientOverview {
  id: string;
  name: string;
  note: string;
  conversations: number;
  plan: "start" | "pro";
  health: "ok" | "atencao";
}

export async function getClientsOverview(): Promise<ClientOverview[]> {
  const rows = await db.select().from(clients).orderBy(clients.createdAt);

  const counts = await db
    .select({ clientId: conversations.clientId, c: count() })
    .from(conversations)
    .groupBy(conversations.clientId);
  const countByClient = new Map(counts.map((r) => [r.clientId, r.c]));

  return rows.map((c) => {
    const convos = countByClient.get(c.id) ?? 0;
    const health: "ok" | "atencao" =
      c.status === "active" && convos > 0 ? "ok" : "atencao";
    return {
      id: c.id,
      name: c.name,
      note: c.businessDescription ?? "",
      conversations: convos,
      plan: c.plan,
      health,
    };
  });
}

/* ---------- Taxa real do gateway (Asaas informa o líquido de cada pagamento) ---------- */

/**
 * Última taxa REAL cobrada pela Asaas por cliente (value - netValue do
 * pagamento confirmado mais recente). Cai pra estimativa só quando ainda não
 * existe nenhum pagamento com netValue registrado.
 */
async function getRealGatewayFeesByClient(): Promise<
  Map<string, { feeBRL: number }>
> {
  const rows = await db
    .select({
      clientId: paymentEvents.clientId,
      value: paymentEvents.value,
      netValue: paymentEvents.netValue,
      createdAt: paymentEvents.createdAt,
    })
    .from(paymentEvents)
    .where(isNotNull(paymentEvents.netValue))
    .orderBy(desc(paymentEvents.createdAt));

  const byClient = new Map<string, { feeBRL: number }>();
  for (const r of rows) {
    if (byClient.has(r.clientId)) continue; // já pegou a mais recente
    if (r.value == null || r.netValue == null) continue;
    byClient.set(r.clientId, { feeBRL: Number(r.value) - Number(r.netValue) });
  }
  return byClient;
}

/* ---------- Faturamento (§4.10) ---------- */

export interface BillingRow {
  id: string;
  name: string;
  receita: number;
  custo: number;
}

export interface Billing {
  receita: number;
  custo: number;
  margem: number;
  rows: BillingRow[];
}

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getBilling(): Promise<Billing> {
  const rows = await db.select().from(clients).orderBy(clients.createdAt);

  const [usage, realFees] = await Promise.all([
    db
      .select({
        clientId: usageLog.clientId,
        aiCostUsd: sum(usageLog.aiCostUsd),
        audioCostUsd: sum(usageLog.audioCostUsd),
      })
      .from(usageLog)
      .where(gte(usageLog.createdAt, monthStart()))
      .groupBy(usageLog.clientId),
    getRealGatewayFeesByClient(),
  ]);

  const usageByClient = new Map(
    usage.map((u) => [
      u.clientId,
      {
        aiCostUsd: Number(u.aiCostUsd ?? 0),
        audioCostUsd: Number(u.audioCostUsd ?? 0),
      },
    ]),
  );

  const billingRows: BillingRow[] = rows
    .filter((c) => c.status === "active")
    .map((c) => {
      const u = usageByClient.get(c.id) ?? { aiCostUsd: 0, audioCostUsd: 0 };
      const monthlyFee = Number(c.monthlyFee ?? 0);
      const real = realFees.get(c.id);
      const breakdown = buildCostBreakdownBRL({
        aiCostUsd: u.aiCostUsd,
        audioCostUsd: u.audioCostUsd,
        gatewayFeeBRL:
          real?.feeBRL ??
          estimateGatewayFeeBRL({ paymentMethod: c.paymentMethod, monthlyFee }),
        gatewayIsExact: !!real,
      });
      return {
        id: c.id,
        name: c.name,
        receita: monthlyFee,
        custo: breakdown.total,
      };
    });

  const receita = billingRows.reduce((a, r) => a + r.receita, 0);
  const custo = billingRows.reduce((a, r) => a + r.custo, 0);
  return { receita, custo, margem: receita - custo, rows: billingRows };
}

/* ---------- Detalhe de um cliente (agência) ---------- */

export interface ClientDetail {
  client: Client;
  conversationsCount: number;
  leadsCount: number;
  costBreakdown: CostBreakdownBRL;
  payments: {
    id: string;
    event: string;
    status: string;
    value: string | null;
    billingType: string | null;
    dueDate: Date | null;
    createdAt: Date;
  }[];
  accessLog: {
    id: string;
    adminEmail: string;
    reason: string;
    createdAt: Date;
  }[];
}

export async function getClientDetail(
  clientId: string,
): Promise<ClientDetail | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return null;

  const [[convCount], [leadCount], [usage], payments, accessLog, latestFee] =
    await Promise.all([
      db
        .select({ c: count() })
        .from(conversations)
        .where(eq(conversations.clientId, clientId)),
      db.select({ c: count() }).from(leads).where(eq(leads.clientId, clientId)),
      db
        .select({
          aiCostUsd: sum(usageLog.aiCostUsd),
          audioCostUsd: sum(usageLog.audioCostUsd),
        })
        .from(usageLog)
        .where(
          and(gte(usageLog.createdAt, monthStart()), eq(usageLog.clientId, clientId)),
        ),
      db
        .select()
        .from(paymentEvents)
        .where(eq(paymentEvents.clientId, clientId))
        .orderBy(desc(paymentEvents.createdAt))
        .limit(15),
      db
        .select({
          id: clientAccessLog.id,
          adminEmail: clientAccessLog.adminEmail,
          reason: clientAccessLog.reason,
          createdAt: clientAccessLog.createdAt,
        })
        .from(clientAccessLog)
        .where(eq(clientAccessLog.clientId, clientId))
        .orderBy(desc(clientAccessLog.createdAt))
        .limit(15),
      db
        .select({ value: paymentEvents.value, netValue: paymentEvents.netValue })
        .from(paymentEvents)
        .where(
          and(eq(paymentEvents.clientId, clientId), isNotNull(paymentEvents.netValue)),
        )
        .orderBy(desc(paymentEvents.createdAt))
        .limit(1),
    ]);

  const monthlyFee = Number(client.monthlyFee ?? 0);
  const real = latestFee[0];
  const costBreakdown = buildCostBreakdownBRL({
    aiCostUsd: Number(usage?.aiCostUsd ?? 0),
    audioCostUsd: Number(usage?.audioCostUsd ?? 0),
    gatewayFeeBRL:
      real && real.value != null && real.netValue != null
        ? Number(real.value) - Number(real.netValue)
        : estimateGatewayFeeBRL({ paymentMethod: client.paymentMethod, monthlyFee }),
    gatewayIsExact: !!(real && real.value != null && real.netValue != null),
  });

  return {
    client,
    conversationsCount: convCount?.c ?? 0,
    leadsCount: leadCount?.c ?? 0,
    costBreakdown,
    payments,
    accessLog,
  };
}
