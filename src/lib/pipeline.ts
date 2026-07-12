import { runHaiku, type HistoryTurn } from "./ai/haiku";
import type { HaikuOutput } from "./ai/types";
import { transcribeAudio } from "./groq";
import { sendHandoffNotification, sendLeadNotification } from "./email";
import { downloadMedia, getMediaUrl, sendText } from "./whatsapp";
import type { Client } from "@/db/schema";
import {
  getClientByPhoneId,
  getLastOutboundAt,
  getOrCreateConversation,
  getRecentMessages,
  insertMessage,
  logUsage,
  messageExistsByWaId,
  touchConversation,
  upsertLead,
} from "@/db/queries";

// Enquanto aguarda humano: repete a mensagem de "alta demanda" no máximo a
// cada N minutos (tranquiliza 1x e silencia nos "oi?/eai?" seguidos).
const WAIT_REASSURE_MIN = 15;

/** Mensagem recebida, já extraída do payload do webhook. */
export interface InboundMessage {
  phoneNumberId: string; // value.metadata.phone_number_id
  waMessageId: string; // message.id (idempotência)
  from: string; // telefone do contato
  contactName?: string | null;
  type: string; // "text" | "audio" | ...
  text?: string;
  audioId?: string;
}

export interface PipelineResult {
  status: "ignored" | "duplicate" | "handled_by_human" | "unsupported" | "ok";
  output?: HaikuOutput;
}

/**
 * Núcleo do produto (§5): recebe uma mensagem, transcreve áudio se preciso,
 * chama o Haiku, grava tudo e responde no WhatsApp. Idempotente por waMessageId.
 */
export async function processInbound(
  msg: InboundMessage,
): Promise<PipelineResult> {
  // 2. identifica o cliente pelo número de destino
  const client = await getClientByPhoneId(msg.phoneNumberId);
  if (!client || client.status !== "active") return { status: "ignored" };

  // idempotência
  if (await messageExistsByWaId(msg.waMessageId)) return { status: "duplicate" };

  // 3. conteúdo (transcreve áudio se for o caso)
  let text = msg.text?.trim() ?? "";
  let isAudio = false;
  let audioSeconds = 0;
  if (msg.type === "audio" && msg.audioId) {
    const url = await getMediaUrl(msg.audioId);
    const bytes = await downloadMedia(url);
    const tr = await transcribeAudio(bytes);
    text = tr.text;
    isAudio = true;
    audioSeconds = tr.seconds;
  }
  if (!text) return { status: "unsupported" };

  const convo = await getOrCreateConversation(
    client.id,
    msg.from,
    msg.contactName,
  );

  // grava a mensagem do cliente (waMessageId garante idempotência)
  await insertMessage({
    conversationId: convo.id,
    from: "them",
    text,
    isAudio,
    waMessageId: msg.waMessageId,
  });

  // Conversa encerrada por inatividade: o cliente voltou a falar → reabre e a
  // IA retoma o atendimento normalmente.
  if (convo.closedAt) {
    await touchConversation(convo.id, { status: "ia", closedAt: null });
    convo.status = "ia";
    convo.closedAt = null;
  }

  // Se um humano assumiu a conversa, a IA não responde.
  if (convo.status === "voce") {
    await touchConversation(convo.id, { incUnread: 1 });
    return { status: "handled_by_human" };
  }

  // Aguardando atendimento humano: a IA NÃO improvisa. Manda a mensagem de
  // "alta demanda" (tranquiliza), mas só se faz um tempo desde a última resposta
  // nossa, assim não repete a cada "oi?/eai?".
  if (convo.status === "novo") {
    await touchConversation(convo.id, { incUnread: 1 });
    const waiting = client.waitingMessage?.trim();
    const lastOut = await getLastOutboundAt(convo.id);
    const stale =
      !lastOut || Date.now() - lastOut.getTime() > WAIT_REASSURE_MIN * 60_000;
    if (waiting && stale) {
      await insertMessage({ conversationId: convo.id, from: "bot", text: waiting });
      await touchConversation(convo.id, { lastMessageAt: new Date() });
      try {
        await sendText(msg.phoneNumberId, msg.from, waiting);
      } catch (err) {
        console.error("[pipeline] envio da mensagem de espera falhou:", err);
      }
    }
    return { status: "handled_by_human" };
  }

  // 4-5. monta prompt + histórico e chama o Haiku
  const history = await getRecentMessages(convo.id, 12);
  const turns: HistoryTurn[] = history.map((m) => ({
    from: m.from,
    text: m.text,
  }));
  const { output, usage } = await runHaiku(client, turns);

  // 6. grava a resposta do bot
  await insertMessage({
    conversationId: convo.id,
    from: "bot",
    text: output.reply,
    courseMentioned: output.course_mentioned,
    confidence: output.confidence,
  });

  // Aqui a conversa está sempre em "ia" (as "novo"/"voce" já retornaram acima),
  // então qualquer handoff da IA é uma transição nova → notifica o dono.
  const newHandoff = output.handoff;
  const contactName = convo.contactName ?? msg.contactName ?? null;

  // 8. atualiza a conversa (handoff muda status p/ "novo")
  await touchConversation(convo.id, {
    status: output.handoff ? "novo" : "ia",
    incUnread: output.handoff ? 1 : 0,
  });

  // 7. lead
  let leadCreated = false;
  if (output.lead_detected) {
    const r = await upsertLead({
      clientId: client.id,
      conversationId: convo.id,
      contactName,
      courseInterest: output.course_mentioned,
    });
    leadCreated = r.created;
  }

  // Notificações por e-mail ao dono (Fase 7). Nunca quebram o pipeline.
  await notifyOwner(client, {
    newLead: leadCreated,
    newHandoff,
    contactName: contactName ?? "Contato",
    courseInterest: output.course_mentioned,
    handoffReason: output.handoff_reason,
  });

  // §6. consumo
  await logUsage({
    clientId: client.id,
    tokensIn:
      usage.inputTokens + usage.cacheReadTokens + usage.cacheCreationTokens,
    tokensOut: usage.outputTokens,
    audioSeconds,
    whatsappMessages: 1,
  });

  // 9. envia a resposta ao cliente final (não quebra o fluxo se a Meta não estiver
  // conectada, a mensagem já está gravada).
  if (output.reply) {
    try {
      await sendText(msg.phoneNumberId, msg.from, output.reply);
    } catch (err) {
      console.error("[pipeline] envio via WhatsApp falhou:", err);
    }
  }

  return { status: "ok", output };
}

/** Dispara os avisos por e-mail conforme as preferências do cliente (§4.8). */
async function notifyOwner(
  client: Client,
  ev: {
    newLead: boolean;
    newHandoff: boolean;
    contactName: string;
    courseInterest: string | null;
    handoffReason: string | null;
  },
): Promise<void> {
  const to = client.notificationEmail || client.ownerEmail;
  if (!to) return;

  try {
    if (ev.newLead && client.notifyNewLead) {
      await sendLeadNotification(to, {
        clientName: client.name,
        contactName: ev.contactName,
        courseInterest: ev.courseInterest,
        channel: "organico",
      });
    }
    if (ev.newHandoff && client.notifyHandoff) {
      await sendHandoffNotification(to, {
        clientName: client.name,
        contactName: ev.contactName,
        reason: ev.handoffReason,
      });
    }
  } catch (err) {
    console.error("[pipeline] notificação por e-mail falhou:", err);
  }
}
