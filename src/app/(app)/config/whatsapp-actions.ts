"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client, type User } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";
import { ADMIN_EMAIL } from "@/lib/roles";
import { sendWhatsappRequestNotification } from "@/lib/email";

type Result = { ok: boolean; error?: string };

async function ctx(): Promise<{ user: User; client: Client } | null> {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  return capsFor(user).config ? { user, client } : null;
}

/**
 * Concierge: o cliente pede pra conectar o número. A gente guarda o número,
 * marca como "aguardando" e avisa o operador por e-mail. Quem faz o setup na
 * Meta é a equipe, não o cliente.
 */
export async function requestWhatsappConnection(
  numberRaw: string,
): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };

  const digits = numberRaw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return {
      ok: false,
      error: "Número inválido. Use DDD + número (com o código do país).",
    };
  }
  const number = "+" + digits;

  await db
    .update(clients)
    .set({ whatsappNumber: number, whatsappRequestedAt: new Date() })
    .where(eq(clients.id, c.client.id));

  try {
    await sendWhatsappRequestNotification(ADMIN_EMAIL, {
      clientName: c.client.name,
      number,
      contactEmail: c.user.email,
    });
  } catch (err) {
    console.error("[requestWhatsappConnection] aviso ao operador falhou:", err);
  }

  revalidatePath("/config");
  return { ok: true };
}

/** Cancela a solicitação (volta pro formulário, mantendo o número pra editar). */
export async function cancelWhatsappRequest(): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };
  await db
    .update(clients)
    .set({ whatsappRequestedAt: null })
    .where(eq(clients.id, c.client.id));
  revalidatePath("/config");
  return { ok: true };
}
