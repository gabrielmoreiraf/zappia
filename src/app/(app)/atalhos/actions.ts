"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { quickReplies } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";

type Result = { ok: boolean; error?: string };

async function ctx() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  return capsFor(user).conversas ? { client } : null;
}

function cleanShortcut(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "") // tira "/" se a pessoa digitar com a barra
    .replace(/\s+/g, "-");
}

export async function createQuickReply(formData: FormData): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };

  const shortcut = cleanShortcut(String(formData.get("shortcut") ?? ""));
  const message = String(formData.get("message") ?? "").trim();
  if (!shortcut) return { ok: false, error: "Informe o atalho." };
  if (!message) return { ok: false, error: "Informe a mensagem." };

  const [existing] = await db
    .select({ id: quickReplies.id })
    .from(quickReplies)
    .where(
      and(eq(quickReplies.clientId, c.client.id), eq(quickReplies.shortcut, shortcut)),
    )
    .limit(1);
  if (existing) return { ok: false, error: "Já existe um atalho com esse nome." };

  await db.insert(quickReplies).values({ clientId: c.client.id, shortcut, message });
  revalidatePath("/atalhos");
  return { ok: true };
}

export async function updateQuickReply(
  id: string,
  formData: FormData,
): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };

  const shortcut = cleanShortcut(String(formData.get("shortcut") ?? ""));
  const message = String(formData.get("message") ?? "").trim();
  if (!shortcut) return { ok: false, error: "Informe o atalho." };
  if (!message) return { ok: false, error: "Informe a mensagem." };

  await db
    .update(quickReplies)
    .set({ shortcut, message })
    .where(and(eq(quickReplies.id, id), eq(quickReplies.clientId, c.client.id)));
  revalidatePath("/atalhos");
  return { ok: true };
}

export async function deleteQuickReply(id: string): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };
  await db
    .delete(quickReplies)
    .where(and(eq(quickReplies.id, id), eq(quickReplies.clientId, c.client.id)));
  revalidatePath("/atalhos");
  return { ok: true };
}
