"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { ACTIVE_CLIENT_COOKIE } from "@/lib/current-client";
import { isAdminEmail } from "@/lib/roles";
import { PLAN_PRICE } from "@/lib/plan";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    throw new Error("Não autorizado.");
  }
}

/** Agência "entra como" um cliente: fixa o client ativo e vai pro painel dele. */
export async function enterClient(clientId: string) {
  await requireAdmin();
  const jar = await cookies();
  jar.set(ACTIVE_CLIENT_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}

/** Sai do contexto do cliente e volta pra visão da agência. */
export async function exitClient() {
  await requireAdmin();
  const jar = await cookies();
  jar.delete(ACTIVE_CLIENT_COOKIE);
  redirect("/clientes");
}

/** Cria um novo client (versão simples; o wizard de WhatsApp vem na fase Meta). */
export async function createClient(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const businessDescription = String(
    formData.get("businessDescription") ?? "",
  ).trim();
  const assistantName =
    String(formData.get("assistantName") ?? "").trim() || "Atendimento";

  await db.insert(clients).values({
    name,
    businessDescription: businessDescription || null,
    assistantName,
    tone: "Amigável",
    welcomeMessage: "Olá! 👋 Como posso te ajudar?",
    handoffTriggers: ["preço", "quero falar com atendente", "reclamação"],
    knowledgeBase: "",
    plan: "pro",
    monthlyFee: PLAN_PRICE,
    status: "active",
  });

  revalidatePath("/clientes");
}
