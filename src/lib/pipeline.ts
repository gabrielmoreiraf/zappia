import { runHaiku, type HistoryTurn } from "./ai/haiku";
import type { HaikuOutput } from "./ai/types";
import { isWithinBusinessHours } from "./business-hours";
import { transcribeAudio } from "./groq";
import { costOfTranscriptionUSD } from "./pricing";
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
  saveReferral,
  touchConversation,
  upsertLead,
} from "@/db/queries";

// Enquanto aguarda humano: repete a mensagem de "alta demanda" no máximo a
// cada N minutos (tranquiliza 1x e silencia nos "oi?/eai?" seguidos).
const WAIT_REASSURE_MIN = 15;

// Mídia recebida maior que isso não é guardada (evita inchar o banco); a
// conversa segue normalmente, só sem o anexo pra visualizar no painel.
const MAX_INBOUND_MEDIA_BYTES = 10 * 1024 * 1024;

/** Mensagem recebida, já extraída do payload do webhook. */
export interface InboundMessage {
  phoneNumberId: string; // value.metadata.phone_number_id
  waMessageId: string; // message.id (idempotência)
  from: string; // telefone do contato
  contactName?: string | null;
  type: string; // "text" | "audio" | "image" | "document" | ...
  text?: string;
  audioId?: string;
  mediaId?: string; // id da imagem/documento (Cloud API)
  mediaMimeType?: string;
  mediaCaption?: string;
  mediaFilename?: string; // só documento
  /**
   * Origem do contato, quando a Meta informa que ele veio de um anúncio
   * "Clique para WhatsApp". Só chega na PRIMEIRA mensagem da conversa.
   */
  referral?: {
    sourceType?: string; // "ad" | "post"
    sourceId?: string;
    headline?: string;
    ctwaClid?: string;
  };
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

  // 3. conteúdo (transcreve áudio, baixa imagem/documento, se for o caso)
  let text = msg.text?.trim() ?? "";
  let isAudio = false;
  let audioSeconds = 0;
  let mediaUrl: string | undefined;
  let mediaType: "image" | "document" | undefined;
  let mediaFilename: string | undefined;

  if (msg.type === "audio" && msg.audioId) {
    const url = await getMediaUrl(msg.audioId);
    const bytes = await downloadMedia(url);
    const tr = await transcribeAudio(bytes);
    text = tr.text;
    isAudio = true;
    audioSeconds = tr.seconds;
  } else if ((msg.type === "image" || msg.type === "document") && msg.mediaId) {
    mediaType = msg.type === "image" ? "image" : "document";
    mediaFilename = msg.mediaFilename;
    try {
      const url = await getMediaUrl(msg.mediaId);
      const bytes = await downloadMedia(url);
      if (bytes.length <= MAX_INBOUND_MEDIA_BYTES) {
        const mime =
          msg.mediaMimeType || (mediaType === "image" ? "image/jpeg" : "application/pdf");
        mediaUrl = `data:${mime};base64,${bytes.toString("base64")}`;
      }
    } catch (err) {
      console.error("[pipeline] download de mídia recebida falhou:", err);
    }
    // A IA não enxerga o conteúdo do arquivo; o texto avisa isso pra ela
    // reagir com naturalidade (ver seção IMAGENS E ARQUIVOS do prompt).
    text =
      msg.mediaCaption?.trim() ||
      (mediaType === "image"
        ? "[o cliente enviou uma imagem; você não consegue ver o conteúdo dela]"
        : `[o cliente enviou um arquivo${mediaFilename ? ` (${mediaFilename})` : ""}; você não consegue ver o conteúdo dele]`);
  }
  if (!text) return { status: "unsupported" };

  const convo = await getOrCreateConversation(
    client.id,
    msg.from,
    msg.contactName,
  );

  // Anúncio: a Meta só manda o referral na primeira mensagem, então grava na
  // hora. Não sobrescreve um referral já existente — se o contato voltar por
  // outro anúncio depois, a origem que vale é a que trouxe ele a primeira vez.
  if (msg.referral && !convo.referralSourceType) {
    await saveReferral(convo.id, msg.referral);
    convo.referralSourceType = msg.referral.sourceType ?? null;
    convo.referralHeadline = msg.referral.headline ?? null;
  }

  // grava a mensagem do cliente (waMessageId garante idempotência)
  await insertMessage({
    conversationId: convo.id,
    from: "them",
    text,
    isAudio,
    mediaUrl,
    mediaType,
    mediaFilename,
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

  // Horário de atendimento: fora da janela configurada a IA não responde.
  // Manda o aviso uma única vez por janela fora do horário (não repete a cada
  // mensagem nova) e deixa a conversa "novo" pra aparecer pro dono quando o
  // expediente voltar.
  if (!isWithinBusinessHours(client)) {
    await touchConversation(convo.id, { status: "novo", incUnread: 1 });
    if (!convo.outOfHoursNotified) {
      const outOfHoursMessage = client.outOfHoursMessage?.trim();
      if (outOfHoursMessage) {
        await insertMessage({
          conversationId: convo.id,
          from: "bot",
          text: outOfHoursMessage,
        });
        try {
          await sendText(msg.phoneNumberId, msg.from, outOfHoursMessage);
        } catch (err) {
          console.error("[pipeline] envio do aviso de fora do expediente falhou:", err);
        }
      }
      await touchConversation(convo.id, { outOfHoursNotified: true });
    }
    return { status: "handled_by_human" };
  }
  if (convo.outOfHoursNotified) {
    await touchConversation(convo.id, { outOfHoursNotified: false });
  }

  // Aguardando atendimento humano: a IA NÃO desliga sozinha. Ela só sai de vez
  // quando um humano realmente assume (status "voce"); até lá continua
  // ajudando normalmente (a REGRA DE OURO do prompt já cuida de dizer "vou
  // confirmar com a equipe" quando não sabe). Guarda o timestamp de antes
  // dessa mensagem pra decidir, depois da resposta da IA, se cabe reforçar
  // com a mensagem de "alta demanda".
  const wasAwaitingHuman = convo.status === "novo";
  const lastOutBefore = wasAwaitingHuman ? await getLastOutboundAt(convo.id) : null;

  // 4-5. monta prompt + histórico e chama o Haiku
  const contactName = convo.contactName ?? msg.contactName ?? null;
  const history = await getRecentMessages(convo.id, 12);
  const turns: HistoryTurn[] = history.map((m) => ({
    from: m.from,
    text: m.text,
  }));
  const { output, usage, costUsd } = await runHaiku(client, turns, contactName);

  // 6. grava a resposta do bot
  await insertMessage({
    conversationId: convo.id,
    from: "bot",
    text: output.reply,
    courseMentioned: output.course_mentioned,
    confidence: output.confidence,
  });

  // Só é uma notificação de handoff NOVA na primeira vez; se já estava
  // aguardando humano, é a mesma pendência continuando.
  const newHandoff = !wasAwaitingHuman && output.handoff;
  // "novo" é pegajoso: uma vez aguardando humano, continua aguardando (mesmo
  // que a IA consiga responder essa mensagem) até alguém assumir ou devolver.
  const stillNeedsHuman = wasAwaitingHuman || output.handoff;

  // 8. atualiza a conversa
  await touchConversation(convo.id, {
    status: stillNeedsHuman ? "novo" : "ia",
    incUnread: stillNeedsHuman ? 1 : 0,
  });

  // 7. lead
  // Canal: veio de anúncio se a Meta mandou referral nessa conversa (fato dela,
  // não inferência nossa). Sem referral = orgânico.
  const channel = convo.referralSourceType ? "anuncio" : "organico";
  let leadCreated = false;
  if (output.lead_detected) {
    const r = await upsertLead({
      clientId: client.id,
      conversationId: convo.id,
      contactName,
      courseInterest: output.course_mentioned,
      channel,
    });
    leadCreated = r.created;
  }

  // Notificações por e-mail ao dono (Fase 7). Nunca quebram o pipeline.
  await notifyOwner(client, {
    newLead: leadCreated,
    newHandoff,
    channel,
    contactName: contactName ?? "Contato",
    courseInterest: output.course_mentioned,
    handoffReason: output.handoff_reason,
  });

  // §6. consumo. tokensIn/tokensOut ficam só informativos — o custo real
  // (aiCostUsd) já vem calculado por modelo/camada de cache do runHaiku.
  await logUsage({
    clientId: client.id,
    tokensIn:
      usage.inputTokens + usage.cacheReadTokens + usage.cacheCreationTokens,
    tokensOut: usage.outputTokens,
    audioSeconds,
    whatsappMessages: 1,
    aiCostUsd: costUsd,
    audioCostUsd: costOfTranscriptionUSD(audioSeconds),
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

  // Cliente já estava esperando humano e insistiu de novo sem a IA conseguir
  // resolver: reforça com a mensagem de "alta demanda", mas só de vez em
  // quando (não repete a cada "oi?/eai?" seguido).
  if (wasAwaitingHuman && output.handoff) {
    const waiting = client.waitingMessage?.trim();
    const stale =
      !lastOutBefore ||
      Date.now() - lastOutBefore.getTime() > WAIT_REASSURE_MIN * 60_000;
    if (waiting && stale) {
      await insertMessage({ conversationId: convo.id, from: "bot", text: waiting });
      await touchConversation(convo.id, { lastMessageAt: new Date() });
      try {
        await sendText(msg.phoneNumberId, msg.from, waiting);
      } catch (err) {
        console.error("[pipeline] envio da mensagem de espera falhou:", err);
      }
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
    channel: "anuncio" | "organico";
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
        channel: ev.channel,
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
