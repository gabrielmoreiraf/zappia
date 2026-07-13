import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { env } from "@/lib/env";
import { PLAN_NAME, PLAN_PRICE } from "@/lib/plan";
import {
  createPixAutomaticCharge,
  listPixAutomaticInstructions,
  retryPixAutomaticInstruction,
} from "@/lib/asaas";

export const runtime = "nodejs";

const MAX_RETRIES = 3;
const RETRY_WINDOW_DAYS = 7; // corridos, a partir do vencimento original
const CHARGE_WINDOW_MIN_BUSINESS_DAYS = 2;
const CHARGE_WINDOW_MAX_BUSINESS_DAYS = 10;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** Conta dias úteis (seg-sex) entre hoje e uma data futura. Não considera feriados. */
function businessDaysUntil(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * Cron diário: Pix Automático não tem cobrança recorrente automática da
 * Asaas (diferente da assinatura de cartão) — a APLICAÇÃO precisa criar a
 * cobrança de cada ciclo dentro da janela de 2 a 10 dias úteis antes do
 * vencimento, e disparar cada retentativa manualmente após uma recusa (ver
 * docs.asaas.com/docs/pix-automatico-implementacao). Protegido por Bearer
 * CRON_SECRET, agendado no vercel.json.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const results = { chargesCreated: 0, retriesTriggered: 0, errors: 0 };

  const active = await db
    .select()
    .from(clients)
    .where(
      and(
        isNotNull(clients.pixAutomaticAuthorizationId),
        eq(clients.pixAutomaticStatus, "ACTIVE"),
      ),
    );

  for (const c of active) {
    try {
      // 1) Assinatura em dia: cria a cobrança do próximo ciclo se já entramos
      // na janela de 2-10 dias úteis antes do vencimento.
      if (
        c.subscriptionStatus === "active" &&
        c.pixNextChargeDue &&
        c.asaasCustomerId &&
        c.pixAutomaticAuthorizationId
      ) {
        const businessDaysOut = businessDaysUntil(now, c.pixNextChargeDue);
        if (
          businessDaysOut <= CHARGE_WINDOW_MAX_BUSINESS_DAYS &&
          businessDaysOut >= CHARGE_WINDOW_MIN_BUSINESS_DAYS
        ) {
          const dueDate = toISODate(c.pixNextChargeDue);
          await createPixAutomaticCharge({
            customerId: c.asaasCustomerId,
            authorizationId: c.pixAutomaticAuthorizationId,
            value: Number(PLAN_PRICE),
            description: `Assinatura ${PLAN_NAME}`,
            dueDate,
          });
          // Avança a próxima data já aqui, pra essa criação não repetir
          // amanhã (idempotência sem precisar guardar "já criei esse ciclo").
          await db
            .update(clients)
            .set({ pixNextChargeDue: addMonths(c.pixNextChargeDue, 1) })
            .where(eq(clients.id, c.id));
          results.chargesCreated++;
        }
      }

      // 2) Assinatura atrasada: dispara retentativa (extradia) se ainda
      // couber dentro da janela de 7 dias corridos e do limite de 3 tentativas.
      if (c.subscriptionStatus === "overdue" && c.subscriptionDueDate) {
        if (c.pixRetryAttempt >= MAX_RETRIES) continue;

        const retryDue = addDays(now, 1);
        const windowEnd = addDays(c.subscriptionDueDate, RETRY_WINDOW_DAYS);
        if (retryDue > windowEnd) continue; // janela expirou, precisa de ação manual

        const refused = await listPixAutomaticInstructions(
          c.pixAutomaticAuthorizationId!,
          "REFUSED",
        );
        const latest = refused[0];
        if (!latest) continue;

        await retryPixAutomaticInstruction(latest.id, toISODate(retryDue));
        await db
          .update(clients)
          .set({ pixRetryAttempt: c.pixRetryAttempt + 1 })
          .where(eq(clients.id, c.id));
        results.retriesTriggered++;
      }
    } catch (err) {
      results.errors++;
      console.error(`[cron/pix-automatico] falhou para ${c.name}:`, err);
    }
  }

  return Response.json({ ok: true, candidates: active.length, ...results });
}
