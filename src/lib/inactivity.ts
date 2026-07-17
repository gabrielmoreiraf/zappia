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
 * Exceção: um contato que já virou LEAD e ainda não foi cutucado ganha uma
 * mensagem de reengajamento em vez da despedida (quando o cliente liga isso nos
 * Ajustes da IA). O relógio reinicia, então ele só encerra se ficar quieto de
 * novo — no máximo UMA cutucada por atendimento (a marca zera ao encerrar).
 *
 * Custo: a cutucada sai ~1 timeout depois do silêncio (padrão 15min), muito
 * dentro da janela de 24h da Meta. Logo é texto livre e não custa nada. Mandar
 * fora da janela exigiria template pago (ver pricing.ts), o que este fluxo
 * deliberadamente NÃO faz.
 *
 * É chamada de dois lugares: pelo cron (backstop diário no Hobby) e de carona no
 * webhook a cada mensagem recebida (near-real-time, sem depender de cron).
 */
export async function sweepInactive(): Promise<{
  candidates: number;
  closed: number;
  reengaged: number;
}> {
  const candidates = await getInactivityCandidates();
  let closed = 0;
  let reengaged = 0;

  for (const c of candidates) {
    try {
      const lastFrom = await getLastMessageFrom(c.conversationId);
      if (lastFrom !== "bot" && lastFrom !== "you") continue;

      const shouldReengage =
        c.reengageLeadsEnabled && c.isLead && !c.reengagedAt;
      const msg = (
        shouldReengage ? c.reengagementMessage : c.closingMessage
      )?.trim();

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

      if (shouldReengage) {
        // Não encerra: marca a cutucada e reinicia o relógio. Se o lead seguir
        // quieto, a próxima varredura cai no ramo de encerramento.
        await touchConversation(c.conversationId, {
          reengagedAt: new Date(),
          lastMessageAt: new Date(),
        });
        reengaged++;
      } else {
        // Zera a marca ao encerrar: a conversa é única por contato e vive pra
        // sempre, então sem isso o contato só seria cutucado uma vez na vida.
        // Assim cada atendimento novo pode ter a sua (mas nunca duas seguidas).
        await touchConversation(c.conversationId, {
          closedAt: new Date(),
          lastMessageAt: new Date(),
          reengagedAt: null,
        });
        closed++;
      }
    } catch (err) {
      console.error("[inactivity] falha ao encerrar:", err);
    }
  }

  return { candidates: candidates.length, closed, reengaged };
}
