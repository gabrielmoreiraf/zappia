import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, paymentEvents } from "@/db/schema";
import { env } from "@/lib/env";
import { getNextDueDate, parseAsaasDate } from "@/lib/asaas";

export const runtime = "nodejs";

interface AsaasWebhookBody {
  // Id do EVENTO (evt_...), não do pagamento. É o que garante idempotência
  // quando a Asaas re-entrega o mesmo evento.
  id?: string;
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
  // Eventos de Pix Automático (PIX_AUTOMATIC_RECURRING_*) vêm num formato bem
  // mais raso: só os IDs, sem os campos do pagamento/autorização (ver
  // docs.asaas.com/docs/fluxos-de-webhook). "payment" aqui é uma STRING
  // (pay_...), não o objeto do bloco acima.
  pixAutomaticAuthorization?: string;
}

const CONFIRMED = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
// Não entrou (ou saiu depois de entrar): em todos esses o acesso é bloqueado
// até regularizar. Estorno e chargeback contam como não pago.
const UNPAID = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_REVERSED",
]);
const CANCELED = new Set([
  "PAYMENT_DELETED",
  "SUBSCRIPTION_DELETED",
  // Nome real na API da Asaas (confirmado na tela de eventos do webhook);
  // "SUBSCRIPTION_CANCELED" não existe lá, mas mantemos por segurança caso
  // apareça em alguma versão antiga.
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_CANCELED",
]);

// Pix Automático: eventos da AUTORIZAÇÃO (o "mandato" de débito em si, ver
// docs.asaas.com/docs/eventos-para-pix-automático). São distintos dos eventos
// de PAGAMENTO acima — a autorização pode estar ativa mesmo com um ciclo em
// atraso, e pode ser recusada/cancelada mesmo com pagamentos em dia.
const PIX_AUTH_ACTIVATED = "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED";
const PIX_AUTH_CANCELED = new Set([
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED",
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED",
  "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED",
]);
// Uma instrução (cobrança de um ciclo) foi recusada pelo banco do pagador —
// isso é o gatilho de "não descontou, bloqueia o acesso" (ver cron
// api/cron/pix-automatico, que decide se tenta retentativa).
const PIX_INSTRUCTION_REFUSED = "PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED";

const OK = () => new Response("EVENT_RECEIVED", { status: 200 });

/**
 * POST — eventos de cobrança da Asaas. Autenticado pelo token estático que a
 * gente configura na Asaas ao cadastrar o webhook (header `asaas-access-token`,
 * não é HMAC como o da Meta). Sempre responde 200 rápido pra Asaas não re-tentar
 * em loop; re-entrega do mesmo evento é ignorada pelo id (evt_...), que é único
 * em payment_events.
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
  if (!body?.event) return OK();

  if (body.event.startsWith("PIX_AUTOMATIC_RECURRING_")) {
    return handlePixAutomaticEvent(body);
  }

  const subscriptionId = body.payment?.subscription;
  const customerId = body.payment?.customer;
  if (!subscriptionId && !customerId) return OK();

  try {
    const client = await findClient(subscriptionId, customerId);
    if (!client) return OK();

    // Histórico: uma linha por evento recebido, pro painel de faturamento. O
    // id do evento é único, então re-entrega da Asaas não duplica a linha nem
    // reprocessa o estado do cliente.
    const [recorded] = await db
      .insert(paymentEvents)
      .values({
        clientId: client.id,
        asaasEventId: body.id ?? null,
        asaasPaymentId: body.payment?.id ?? null,
        event: body.event,
        status: body.payment?.status ?? "",
        value: body.payment?.value != null ? String(body.payment.value) : null,
        // netValue = quanto a Asaas repassa depois da taxa dela. Com os dois
        // dá pra saber a taxa REAL do gateway, sem estimar (ver pricing.ts).
        netValue: body.payment?.netValue != null ? String(body.payment.netValue) : null,
        billingType: body.payment?.billingType ?? null,
        dueDate: body.payment?.dueDate ? parseAsaasDate(body.payment.dueDate) : null,
      })
      .onConflictDoNothing({ target: paymentEvents.asaasEventId })
      .returning({ id: paymentEvents.id });
    if (!recorded) return OK(); // já processado numa entrega anterior

    // Só mexe no ciclo/status da assinatura recorrente quando o evento é dela
    // (tem subscriptionId) — cobrança avulsa não deve empurrar a próxima
    // cobrança nem trocar o status da assinatura.
    if (!subscriptionId) return OK();

    if (CONFIRMED.has(body.event)) {
      // "Próxima cobrança" é o ciclo SEGUINTE, não o que acabou de ser pago.
      const nextDueDate = body.payment?.dueDate
        ? await getNextDueDate(subscriptionId, body.payment.dueDate)
        : null;
      await db
        .update(clients)
        .set({
          subscriptionStatus: "active",
          status: "active",
          subscriptionStartedAt: client.subscriptionStartedAt ?? new Date(),
          lastPaymentAt: new Date(),
          subscriptionDueDate: nextDueDate,
          // Pix Automático: o cron cria a cobrança do próximo ciclo (a Asaas
          // não cria sozinha nesse modelo), então precisa saber a data.
          pixNextChargeDue: client.pixAutomaticAuthorizationId ? nextDueDate : undefined,
          paymentMethod: body.payment?.billingType ?? null,
          lastInvoiceUrl: body.payment?.invoiceUrl ?? null,
          pixRetryAttempt: 0,
        })
        .where(eq(clients.id, client.id));
    } else if (UNPAID.has(body.event)) {
      // Não descontou: bloqueia o acesso (painel e atendimento) até regularizar.
      await db
        .update(clients)
        .set({
          subscriptionStatus: "overdue",
          status: "paused",
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

  return OK();
}

/**
 * Acha o tenant do evento. Prefere a assinatura, mas cai pro cliente da Asaas
 * quando não bate: cobrança avulsa não tem assinatura, e o Pix Automático
 * agrupa as cobranças numa "assinatura" interna da Asaas que pode não ser a
 * que a gente guardou.
 */
async function findClient(subscriptionId?: string, customerId?: string) {
  const columns = {
    id: clients.id,
    subscriptionStartedAt: clients.subscriptionStartedAt,
    pixAutomaticAuthorizationId: clients.pixAutomaticAuthorizationId,
  };
  if (subscriptionId) {
    const [bySub] = await db
      .select(columns)
      .from(clients)
      .where(eq(clients.asaasSubscriptionId, subscriptionId))
      .limit(1);
    if (bySub) return bySub;
  }
  if (!customerId) return null;
  const [byCustomer] = await db
    .select(columns)
    .from(clients)
    .where(eq(clients.asaasCustomerId, customerId))
    .limit(1);
  return byCustomer ?? null;
}

/**
 * Eventos de Pix Automático: payload raso (só IDs, ver comentário no topo do
 * arquivo). O ciclo de pagamento (PAYMENT_CONFIRMED/OVERDUE) da cobrança
 * mensal já cai no fluxo normal acima, porque a Asaas amarra toda cobrança da
 * autorização numa "assinatura" interna (guardamos o subscriptionId dela em
 * asaasSubscriptionId — ver billing-actions.ts). Aqui só tratamos o que é
 * exclusivo da AUTORIZAÇÃO (mandato) e da recusa pontual de uma instrução.
 */
async function handlePixAutomaticEvent(body: AsaasWebhookBody): Promise<Response> {
  const authorizationId = body.pixAutomaticAuthorization;
  if (!authorizationId) return OK();

  try {
    const [client] = await db
      .select({ id: clients.id, subscriptionStartedAt: clients.subscriptionStartedAt })
      .from(clients)
      .where(eq(clients.pixAutomaticAuthorizationId, authorizationId))
      .limit(1);
    if (!client) return OK();

    if (body.event === PIX_AUTH_ACTIVATED) {
      // Autorizou hoje: o próximo débito é daqui a um mês, e é o cron
      // (api/cron/pix-automatico) que vai criar essa cobrança.
      const nextCharge = new Date();
      nextCharge.setMonth(nextCharge.getMonth() + 1);
      await db
        .update(clients)
        .set({
          pixAutomaticStatus: "ACTIVE",
          subscriptionStatus: "active",
          status: "active",
          subscriptionStartedAt: client.subscriptionStartedAt ?? new Date(),
          lastPaymentAt: new Date(),
          subscriptionDueDate: nextCharge,
          pixNextChargeDue: nextCharge,
          pixRetryAttempt: 0,
        })
        .where(eq(clients.id, client.id));
    } else if (PIX_AUTH_CANCELED.has(body.event)) {
      const status = body.event.endsWith("CANCELLED")
        ? "CANCELLED"
        : body.event.endsWith("EXPIRED")
          ? "EXPIRED"
          : "REFUSED";
      await db
        .update(clients)
        .set({ pixAutomaticStatus: status, subscriptionStatus: "canceled", status: "paused" })
        .where(eq(clients.id, client.id));
    } else if (body.event === PIX_INSTRUCTION_REFUSED) {
      // Não descontou nesse ciclo: bloqueia o acesso até regularizar. O cron
      // (api/cron/pix-automatico) decide se ainda cabe retentativa.
      await db
        .update(clients)
        .set({ subscriptionStatus: "overdue", status: "paused" })
        .where(eq(clients.id, client.id));
    }
  } catch (err) {
    console.error("[webhook/asaas] pix automático falhou:", err);
  }

  return OK();
}
