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
import { sendText } from "@/lib/whatsapp";

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

  await db
    .update(clients)
    .set({ assistantName, welcomeMessage, tone, handoffTriggers })
    .where(eq(clients.id, client.id));

  revalidatePath("/ajustes");
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

/* ---------- Base de cursos (§4.6) ---------- */

async function writeCourses(clientId: string, courses: Course[]) {
  await db
    .update(clients)
    .set({ knowledgeBase: serializeKnowledgeBase(courses) })
    .where(eq(clients.id, clientId));
  revalidatePath("/cursos");
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
    categoria: String(formData.get("categoria") ?? "Presencial").trim(),
    valor: String(formData.get("valor") ?? "").trim() || undefined,
    cargaHoraria: String(formData.get("cargaHoraria") ?? "").trim() || undefined,
    observacao: String(formData.get("observacao") ?? "").trim() || undefined,
    ativo: formData.get("ativo") != null,
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
