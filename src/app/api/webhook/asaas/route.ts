import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, paymentEvents } from "@/db/schema";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface AsaasWebhookBody {
  event: string;
  payment?: {
    id: string;
    customer?: string;
    subscription?: string;
    status: string;
    value?: number;
    netValue?: number;
    dueDate: string;
    billingType: string;
    invoiceUrl: string;
  };
}

/**
 * A Asaas manda dueDate como "YYYY-MM-DD" (data, sem hora). Se virasse
 * `new Date("YYYY-MM-DD")` seria meia-noite UTC, que exibida em
 * America/Sao_Paulo (UTC-3) recua pro dia anterior. Ancora ao meio-dia UTC
 * pra nenhum fuso cruzar a virada do dia.
 */
function parseDateOnly(d: string): Date {
  return new Date(`${d}T12:00:00Z`);
}

const CONFIRMED = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const OVERDUE = new Set(["PAYMENT_OVERDUE"]);
const CANCELED = new Set([
  "PAYMENT_DELETED",
  "SUBSCRIPTION_DELETED",
  // Nome real na API da Asaas (confirmado na tela de eventos do webhook);
  // "SUBSCRIPTION_CANCELED" não existe lá, mas mantemos por segurança caso
  // apareça em alguma versão antiga.
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_CANCELED",
]);

/**
 * POST — eventos de cobrança da Asaas. Autenticado pelo token estático que a
 * gente configura na Asaas ao cadastrar o webhook (header `asaas-access-token`,
 * não é HMAC como o da Meta). Sempre responde 200 rápido pra Asaas não re-tentar
 * em loop; idempotência garantida porque só fazemos "set" de status (o
 * histórico em payment_events pode duplicar linha em reentrega, mas não afeta
 * o estado do cliente).
 *
 * Cobranças avulsas (geradas fora da assinatura, ver clientes/[id]/actions.ts)
 * não têm `subscription` — aí a gente acha o cliente pelo `customer` e só
 * registra o histórico, sem mexer no ciclo/status da assinatura recorrente.
 */
export async function POST(req: Request) {
  const token = req.headers.get("asaas-access-token");
  if (token !== env.asaasWebhookToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const subscriptionId = body.payment?.subscription;
  const customerId = body.payment?.customer;
  if (!subscriptionId && !customerId) {
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  try {
    const [client] = await db
      .select({ id: clients.id, subscriptionStartedAt: clients.subscriptionStartedAt })
      .from(clients)
      .where(
        subscriptionId
          ? eq(clients.asaasSubscriptionId, subscriptionId)
          : eq(clients.asaasCustomerId, customerId!),
      )
      .limit(1);
    if (!client) return new Response("EVENT_RECEIVED", { status: 200 });

    // Histórico: uma linha por evento recebido, pro painel de faturamento.
    await db.insert(paymentEvents).values({
      clientId: client.id,
      asaasPaymentId: body.payment?.id ?? null,
      event: body.event,
      status: body.payment?.status ?? "",
      value: body.payment?.value != null ? String(body.payment.value) : null,
      // netValue = quanto a Asaas repassa depois da taxa dela. Com os dois
      // dá pra saber a taxa REAL do gateway, sem estimar (ver pricing.ts).
      netValue: body.payment?.netValue != null ? String(body.payment.netValue) : null,
      billingType: body.payment?.billingType ?? null,
      dueDate: body.payment?.dueDate ? parseDateOnly(body.payment.dueDate) : null,
    });

    // Só mexe no ciclo/status da assinatura recorrente quando o evento é dela
    // (tem subscriptionId) — cobrança avulsa não deve empurrar a próxima
    // cobrança nem trocar o status da assinatura.
    if (!subscriptionId) return new Response("EVENT_RECEIVED", { status: 200 });

    if (CONFIRMED.has(body.event)) {
      await db
        .update(clients)
        .set({
          subscriptionStatus: "active",
          status: "active",
          subscriptionStartedAt: client.subscriptionStartedAt ?? new Date(),
          lastPaymentAt: new Date(),
          subscriptionDueDate: body.payment?.dueDate
            ? parseDateOnly(body.payment.dueDate)
            : null,
          paymentMethod: body.payment?.billingType ?? null,
          lastInvoiceUrl: body.payment?.invoiceUrl ?? null,
        })
        .where(eq(clients.id, client.id));
    } else if (OVERDUE.has(body.event)) {
      // Fica em carência: continua atendendo, só sinaliza no painel.
      await db
        .update(clients)
        .set({
          subscriptionStatus: "overdue",
          lastInvoiceUrl: body.payment?.invoiceUrl ?? null,
        })
        .where(eq(clients.id, client.id));
    } else if (CANCELED.has(body.event)) {
      await db
        .update(clients)
        .set({ subscriptionStatus: "canceled", status: "paused" })
        .where(eq(clients.id, client.id));
    }
  } catch (err) {
    console.error("[webhook/asaas] falhou:", err);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
