"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, users } from "@/db/schema";
import { isAdminEmail } from "@/lib/roles";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Onboarding do usuário-cliente: cria o negócio dele e vincula à conta. */
export async function createOwnBusiness(
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return { ok: false, error: "Sessão expirada." };
  if (isAdminEmail(email)) return { ok: false, error: "Admin não faz onboarding." };

  // Já tem negócio? não recria.
  const [existing] = await db
    .select({ clientId: users.clientId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (existing?.clientId) redirect("/dashboard");

  const businessName = String(formData.get("businessName") ?? "").trim();
  const segment = String(formData.get("segment") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();

  if (!businessName) return { ok: false, error: "Informe o nome do negócio." };
  if (!segment) return { ok: false, error: "Informe a área da empresa." };

  const businessDescription = [
    `Segmento: ${segment}.`,
    about,
  ]
    .filter(Boolean)
    .join("\n\n");

  const [client] = await db
    .insert(clients)
    .values({
      name: businessName,
      ownerEmail: email ?? null,
      businessDescription,
      assistantName: "Atendimento",
      tone: "Amigável",
      welcomeMessage: "Olá! 👋 Como posso te ajudar?",
      handoffTriggers: ["preço", "quero falar com atendente", "reclamação"],
      knowledgeBase: "",
      plan: "start",
      monthlyFee: "0",
      status: "active",
      notificationEmail: email ?? null,
    })
    .returning();

  await db.update(users).set({ clientId: client.id }).where(eq(users.id, userId));

  redirect("/dashboard");
}
