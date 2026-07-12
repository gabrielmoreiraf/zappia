import {
  getInactivityCandidates,
  getLastMessageFrom,
  insertMessage,
  touchConversation,
} from "@/db/queries";
import { sendText } from "@/lib/whatsapp";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Encerramento por inatividade. Varre conversas paradas (cliente em silêncio há
 * mais que o limite do cliente), manda a mensagem de despedida e fecha. Conversas
 * "novo" (aguardando humano) são poupadas — ver getInactivityCandidates.
 *
 * Protegido por Bearer CRON_SECRET. A frequência ideal é a cada ~5-15 min; no
 * Vercel Hobby o cron roda 1x/dia, então use um agendador externo (cron-job.org,
 * GitHub Actions) apontando pra esta URL com o header Authorization.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const candidates = await getInactivityCandidates();
  let closed = 0;

  for (const c of candidates) {
    try {
      // Só encerra se a bola estava com o cliente (última mensagem foi NOSSA).
      const lastFrom = await getLastMessageFrom(c.conversationId);
      if (lastFrom !== "bot" && lastFrom !== "you") continue;

      const msg = c.closingMessage?.trim();
      if (msg) {
        await insertMessage({
          conversationId: c.conversationId,
          from: "bot",
          text: msg,
        });
        try {
          if (c.whatsappPhoneId) {
            await sendText(c.whatsappPhoneId, c.contactPhone, msg);
          }
        } catch (err) {
          console.error("[cron/inactivity] envio falhou:", err);
        }
      }

      await touchConversation(c.conversationId, {
        closedAt: new Date(),
        lastMessageAt: new Date(),
      });
      closed++;
    } catch (err) {
      console.error("[cron/inactivity] falha ao encerrar:", err);
    }
  }

  return Response.json({ ok: true, candidates: candidates.length, closed });
}
