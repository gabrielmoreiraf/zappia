import { runHaiku, type HistoryTurn } from "./ai/haiku";
import type { HaikuOutput } from "./ai/types";
import { transcribeAudio } from "./groq";
import { downloadMedia, getMediaUrl, sendText } from "./whatsapp";
import {
  getClientByPhoneId,
  getOrCreateConversation,
  getRecentMessages,
  insertMessage,
  logUsage,
  messageExistsByWaId,
  touchConversation,
  upsertLead,
} from "@/db/queries";

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

  // Se um humano assumiu a conversa, a IA não responde.
  if (convo.status === "voce") {
    await touchConversation(convo.id, { incUnread: 1 });
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

  // 8. atualiza a conversa (handoff muda status p/ "novo")
  await touchConversation(convo.id, {
    status: output.handoff ? "novo" : "ia",
    incUnread: output.handoff ? 1 : 0,
  });

  // 7. lead
  if (output.lead_detected) {
    await upsertLead({
      clientId: client.id,
      conversationId: convo.id,
      contactName: convo.contactName ?? msg.contactName ?? null,
      courseInterest: output.course_mentioned,
    });
  }

  // §6. consumo
  await logUsage({
    clientId: client.id,
    tokensIn:
      usage.inputTokens + usage.cacheReadTokens + usage.cacheCreationTokens,
    tokensOut: usage.outputTokens,
    audioSeconds,
    whatsappMessages: 1,
  });

  // 9. envia a resposta ao cliente final
  if (output.reply) {
    await sendText(msg.phoneNumberId, msg.from, output.reply);
  }

  // handoff → notificação ao dono é a Fase 7; aqui o status já mudou.
  return { status: "ok", output };
}
