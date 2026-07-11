import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getYesterdaySummary } from "@/db/panel";
import { sendDailySummary } from "@/lib/email";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Cron diário (§6): envia o resumo de ontem para cada client que ativou o
 * "Resumo diário por e-mail". Protegido por Bearer CRON_SECRET (a Vercel Cron
 * manda esse header). Agendado no vercel.json.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const list = await db
    .select()
    .from(clients)
    .where(eq(clients.notifyDailySummary, true));

  let sent = 0;
  for (const c of list) {
    if (c.status !== "active") continue;
    const to = c.notificationEmail || c.ownerEmail;
    if (!to) continue;
    try {
      const s = await getYesterdaySummary(c.id);
      await sendDailySummary(to, { clientName: c.name, ...s });
      sent++;
    } catch (err) {
      console.error(`[cron] resumo falhou para ${c.name}:`, err);
    }
  }

  return Response.json({ ok: true, sent });
}
