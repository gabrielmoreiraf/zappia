import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { sendPaymentReminder } from "@/lib/email";
import { dateLong } from "@/lib/format";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Cron diário: avisa por e-mail quem tem cobrança chegando nos próximos 5
 * dias, uma vez por ciclo (lastReminderDueDate evita duplicar o aviso a cada
 * execução). Protegido por Bearer CRON_SECRET, agendado no vercel.json.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const list = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.subscriptionStatus, "active"),
        gte(clients.subscriptionDueDate, now),
        lte(clients.subscriptionDueDate, in5days),
        or(
          isNull(clients.lastReminderDueDate),
          ne(clients.lastReminderDueDate, clients.subscriptionDueDate),
        ),
      ),
    );

  let sent = 0;
  for (const c of list) {
    const to = c.notificationEmail || c.ownerEmail;
    if (!to || !c.subscriptionDueDate) continue;
    try {
      await sendPaymentReminder(to, {
        businessName: c.name,
        dueDateLabel: dateLong(c.subscriptionDueDate),
        invoiceUrl: c.lastInvoiceUrl,
      });
      await db
        .update(clients)
        .set({ lastReminderDueDate: c.subscriptionDueDate })
        .where(eq(clients.id, c.id));
      sent++;
    } catch (err) {
      console.error(`[cron/payment-reminder] falhou para ${c.name}:`, err);
    }
  }

  return Response.json({ ok: true, candidates: list.length, sent });
}
