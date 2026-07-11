"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { ACTIVE_CLIENT_COOKIE } from "@/lib/current-client";

/** Agência "entra como" um cliente: fixa o client ativo e vai pro painel dele. */
export async function enterClient(clientId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_CLIENT_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}

/** Cria um novo client (versão simples; o wizard de WhatsApp vem na fase Meta). */
export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const businessDescription = String(
    formData.get("businessDescription") ?? "",
  ).trim();
  const assistantName =
    String(formData.get("assistantName") ?? "").trim() || "Atendimento";
  const plan = String(formData.get("plan") ?? "start") === "pro" ? "pro" : "start";
  const monthlyFee = String(formData.get("monthlyFee") ?? "0").replace(",", ".");

  await db.insert(clients).values({
    name,
    businessDescription: businessDescription || null,
    assistantName,
    tone: "Amigável",
    welcomeMessage: "Olá! 👋 Como posso te ajudar?",
    handoffTriggers: ["preço", "quero falar com atendente", "reclamação"],
    knowledgeBase: "",
    plan,
    monthlyFee: monthlyFee || "0",
    status: "active",
  });

  revalidatePath("/clientes");
}
