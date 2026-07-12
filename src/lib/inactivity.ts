import {
  getInactivityCandidates,
  getLastMessageFrom,
  insertMessage,
  touchConversation,
} from "@/db/queries";
import { sendText } from "@/lib/whatsapp";

/**
 * Varre conversas paradas (cliente em silêncio há mais que o limite do cliente),
 * manda a mensagem de despedida e fecha. Conversas "novo" (aguardando humano) são
 * poupadas. Ver getInactivityCandidates. Só encerra se a bola estava com o
 * cliente (última mensagem foi NOSSA).
 *
 * É chamada de dois lugares: pelo cron (backstop diário no Hobby) e de carona no
 * webhook a cada mensagem recebida (near-real-time, sem depender de cron).
 */
export async function sweepInactive(): Promise<{
  candidates: number;
  closed: number;
}> {
  const candidates = await getInactivityCandidates();
  let closed = 0;

  for (const c of candidates) {
    try {
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
          console.error("[inactivity] envio falhou:", err);
        }
      }

      await touchConversation(c.conversationId, {
        closedAt: new Date(),
        lastMessageAt: new Date(),
      });
      closed++;
    } catch (err) {
      console.error("[inactivity] falha ao encerrar:", err);
    }
  }

  return { candidates: candidates.length, closed };
}
