"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, conversations, leads, messages } from "@/db/schema";
import { getCurrentClient } from "@/lib/current-client";
import {
  parseKnowledgeBase,
  serializeKnowledgeBase,
  type Course,
} from "@/lib/knowledge-base";
import { extractCourses } from "@/lib/ai/extract-knowledge";
import { runHaiku, improveDraftText, type HistoryTurn } from "@/lib/ai/haiku";
import { sendText } from "@/lib/whatsapp";
import { logUsage } from "@/db/queries";
import { parseBusinessHours, serializeBusinessHours } from "@/lib/business-hours";

/* ---------- Conversas (§4.4) ---------- */

/** "Assumir": desliga a IA daquela conversa (status → "voce"). */
export async function assumirConversa(conversationId: string) {
  const client = await getCurrentClient();
  if (!client) return;
  await db
    .update(conversations)
    .set({ status: "voce", unreadCount: 0 })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clientId, client.id),
      ),
    );
  revalidatePath("/conversas");
}

/** "Devolver pra IA": religa a IA na conversa (status → "ia"). */
export async function devolverParaIA(conversationId: string) {
  const client = await getCurrentClient();
  if (!client) return;
  await db
    .update(conversations)
    .set({ status: "ia" })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clientId, client.id),
      ),
    );
  revalidatePath("/conversas");
}

/** Envio manual do dono. Grava a mensagem e tenta entregar via Cloud API. */
export async function sendReply(conversationId: string, text: string) {
  const body = text.trim();
  if (!body) return;
  const client = await getCurrentClient();
  if (!client) return;

  const [convo] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clientId, client.id),
      ),
    )
    .limit(1);
  if (!convo) return;

  await db.insert(messages).values({
    conversationId,
    from: "you",
    text: body,
  });
  await db
    .update(conversations)
    .set({ status: "voce", lastMessageAt: new Date(), unreadCount: 0 })
    .where(eq(conversations.id, conversationId));

  // Entrega real precisa das credenciais da Meta (Fase 5). Se não houver, a
  // mensagem fica registrada e a entrega acontece quando o número for conectado.
  try {
    if (client.whatsappPhoneId && !client.whatsappPhoneId.startsWith("PENDENTE")) {
      await sendText(client.whatsappPhoneId, convo.contactPhone, body);
    }
  } catch (err) {
    console.error("[sendReply] entrega via WhatsApp falhou:", err);
  }

  revalidatePath("/conversas");
}

/**
 * "Sugerir melhoria no texto": só roda quando o humano clica, nunca
 * automático. Custo real (poucas dezenas de tokens) entra no usage_log pra
 * aparecer certinho no Faturamento, não fica escondido.
 */
export async function suggestReplyImprovement(
  text: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const client = await getCurrentClient();
  if (!client) return { ok: false, error: "Sem permissão." };
  const draft = text.trim();
  if (!draft) return { ok: false, error: "Escreva algo primeiro." };

  try {
    const { text: improved, costUsd, usage } = await improveDraftText(draft);
    await logUsage({
      clientId: client.id,
      tokensIn: usage.inputTokens + usage.cacheReadTokens + usage.cacheCreationTokens,
      tokensOut: usage.outputTokens,
      audioSeconds: 0,
      whatsappMessages: 0,
      aiCostUsd: costUsd,
      audioCostUsd: 0,
    });
    return { ok: true, text: improved };
  } catch (err) {
    console.error("[suggestReplyImprovement] falhou:", err);
    return { ok: false, error: "Não foi possível sugerir agora." };
  }
}

/* ---------- Leads (§4.5) ---------- */

export async function updateLeadStatus(
  leadId: string,
  status: "novo" | "contato" | "matriculado",
) {
  const client = await getCurrentClient();
  if (!client) return;
  await db
    .update(leads)
    .set({ status })
    .where(and(eq(leads.id, leadId), eq(leads.clientId, client.id)));
  revalidatePath("/leads");
}

/* ---------- Ajustes da IA (§4.7) ---------- */

export async function saveAjustes(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) return;
  const assistantName = String(formData.get("assistantName") ?? "").trim();
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim();
  const tone = String(formData.get("tone") ?? "Amigável");
  const triggersRaw = String(formData.get("handoffTriggers") ?? "");
  const handoffTriggers = triggersRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const waitingMessage = String(formData.get("waitingMessage") ?? "").trim();
  const closingMessage = String(formData.get("closingMessage") ?? "").trim();
  const rawMin = Number(formData.get("inactivityMinutes"));
  const inactivityMinutes =
    Number.isFinite(rawMin) && rawMin >= 0 ? Math.floor(rawMin) : 15;

  await db
    .update(clients)
    .set({
      assistantName,
      welcomeMessage,
      tone,
      handoffTriggers,
      ...(waitingMessage ? { waitingMessage } : {}),
      ...(closingMessage ? { closingMessage } : {}),
      inactivityMinutes,
      aiConfigured: true,
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/ajustes");
  revalidatePath("/dashboard");
}

/* ---------- Configurações · notificações (§4.8 / Fase 7) ---------- */

export async function saveNotifications(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) return;
  const notificationEmail =
    String(formData.get("notificationEmail") ?? "").trim() || null;

  await db
    .update(clients)
    .set({
      notificationEmail,
      notifyNewLead: formData.get("notifyNewLead") != null,
      notifyHandoff: formData.get("notifyHandoff") != null,
      notifyDailySummary: formData.get("notifyDailySummary") != null,
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/config");
}

/* ---------- Configurações · horário de atendimento ---------- */

const DEFAULT_OUT_OF_HOURS_MESSAGE =
  "No momento estamos fora do nosso horário de atendimento. Assim que o expediente começar, alguém da nossa equipe vai te responder por aqui. Obrigado pela paciência!";

export async function saveBusinessHours(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) return;

  const businessHoursEnabled = formData.get("businessHoursEnabled") != null;
  const rawHours = String(formData.get("businessHours") ?? "");
  const hours = serializeBusinessHours(parseBusinessHours(rawHours));
  const outOfHoursMessage =
    String(formData.get("outOfHoursMessage") ?? "").trim() ||
    DEFAULT_OUT_OF_HOURS_MESSAGE;

  await db
    .update(clients)
    .set({ businessHoursEnabled, businessHours: hours, outOfHoursMessage })
    .where(eq(clients.id, client.id));

  revalidatePath("/config");
}

/* ---------- Base de conhecimento (§4.6) ---------- */

async function writeCourses(clientId: string, courses: Course[]) {
  await db
    .update(clients)
    .set({ knowledgeBase: serializeKnowledgeBase(courses) })
    .where(eq(clients.id, clientId));
  revalidatePath("/conhecimento");
}

export async function toggleCourse(nome: string) {
  const client = await getCurrentClient();
  if (!client) return;
  const courses = parseKnowledgeBase(client.knowledgeBase);
  const c = courses.find((x) => x.nome === nome);
  if (!c) return;
  c.ativo = !c.ativo;
  await writeCourses(client.id, courses);
}

export async function upsertCourse(formData: FormData) {
  const client = await getCurrentClient();
  if (!client) return;
  const courses = parseKnowledgeBase(client.knowledgeBase);

  const originalNome = String(formData.get("originalNome") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const status =
    String(formData.get("status") ?? "confirmar_com_equipe") === "confirmado"
      ? "confirmado"
      : "confirmar_com_equipe";

  const course: Course = {
    nome,
    status,
    categoria: String(formData.get("categoria") ?? "Geral").trim(),
    valor: String(formData.get("valor") ?? "").trim() || undefined,
    cargaHoraria: String(formData.get("cargaHoraria") ?? "").trim() || undefined,
    observacao: String(formData.get("observacao") ?? "").trim() || undefined,
    ativo: formData.get("ativo") != null,
    // Ao editar/adicionar na mão, o item passa a ser "seu" (some o selo da IA).
    origem: "manual",
  };

  const idx = courses.findIndex(
    (x) => x.nome === (originalNome || nome),
  );
  if (idx >= 0) courses[idx] = course;
  else courses.push(course);

  await writeCourses(client.id, courses);
}

export async function deleteCourse(nome: string) {
  const client = await getCurrentClient();
  if (!client) return;
  const courses = parseKnowledgeBase(client.knowledgeBase).filter(
    (c) => c.nome !== nome,
  );
  await writeCourses(client.id, courses);
}

/* ---------- IA monta pra você (extração de texto livre) ---------- */

/** Passa um texto livre pela IA e devolve os itens propostos (ainda NÃO salva). */
export async function proposeCoursesFromText(text: string): Promise<Course[]> {
  const client = await getCurrentClient();
  if (!client) return [];
  try {
    return await extractCourses(client.name, text);
  } catch (err) {
    console.error("[proposeCoursesFromText] extração falhou:", err);
    return [];
  }
}

/** Mescla os itens escolhidos na base (substitui por nome, sem duplicar). */
export async function addCourses(newCourses: Course[]) {
  const client = await getCurrentClient();
  if (!client || newCourses.length === 0) return;
  const courses = parseKnowledgeBase(client.knowledgeBase);
  for (const nc of newCourses) {
    if (!nc.nome?.trim()) continue;
    const idx = courses.findIndex(
      (c) => c.nome.toLowerCase() === nc.nome.toLowerCase(),
    );
    if (idx >= 0) courses[idx] = nc;
    else courses.push(nc);
  }
  await writeCourses(client.id, courses);
}

/* ---------- Testar a IA (sandbox, não grava conversa) ---------- */

/** Roda a IA com a base atual pro dono testar. Não persiste nada no banco. */
export async function testAssistant(
  history: HistoryTurn[],
): Promise<{ reply: string; handoff: boolean; confidence: "alta" | "baixa" }> {
  const client = await getCurrentClient();
  if (!client) return { reply: "", handoff: false, confidence: "baixa" };
  const { output } = await runHaiku(client, history);
  return {
    reply: output.reply,
    handoff: output.handoff,
    confidence: output.confidence,
  };
}
