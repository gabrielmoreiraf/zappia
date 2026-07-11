import { count, eq, gte, sum } from "drizzle-orm";
import { db } from "./index";
import { clients, conversations, usageLog } from "./schema";
import { estimateCostBRL } from "@/lib/pricing";

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

  const usage = await db
    .select({
      clientId: usageLog.clientId,
      tokensIn: sum(usageLog.tokensIn),
      tokensOut: sum(usageLog.tokensOut),
      audioSeconds: sum(usageLog.audioSeconds),
      whatsappMessages: sum(usageLog.whatsappMessages),
    })
    .from(usageLog)
    .where(gte(usageLog.createdAt, monthStart()))
    .groupBy(usageLog.clientId);

  const usageByClient = new Map(
    usage.map((u) => [
      u.clientId,
      {
        tokensIn: Number(u.tokensIn ?? 0),
        tokensOut: Number(u.tokensOut ?? 0),
        audioSeconds: Number(u.audioSeconds ?? 0),
        whatsappMessages: Number(u.whatsappMessages ?? 0),
      },
    ]),
  );

  const billingRows: BillingRow[] = rows
    .filter((c) => c.status === "active")
    .map((c) => {
      const u = usageByClient.get(c.id) ?? {
        tokensIn: 0,
        tokensOut: 0,
        audioSeconds: 0,
        whatsappMessages: 0,
      };
      return {
        id: c.id,
        name: c.name,
        receita: Number(c.monthlyFee ?? 0),
        custo: estimateCostBRL(u),
      };
    });

  const receita = billingRows.reduce((a, r) => a + r.receita, 0);
  const custo = billingRows.reduce((a, r) => a + r.custo, 0);
  return { receita, custo, margem: receita - custo, rows: billingRows };
}
