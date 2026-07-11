"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isPasswordValid } from "@/lib/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Atualiza nome, e-mail e plano da conta. */
export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, error: "Sessão expirada." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const plan = String(formData.get("plan") ?? "free") === "pro" ? "pro" : "free";

  if (!name) return { ok: false, error: "Informe seu nome." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "E-mail inválido." };

  // e-mail único (ignorando o próprio usuário)
  const [dup] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, id)))
    .limit(1);
  if (dup) return { ok: false, error: "Esse e-mail já está em uso." };

  await db.update(users).set({ name, email, plan }).where(eq(users.id, id));
  revalidatePath("/perfil");
  return { ok: true };
}

/** Troca a senha (valida a atual e aplica as regras na nova). */
export async function changePassword(
  formData: FormData,
): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, error: "Sessão expirada." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) return { ok: false, error: "Usuário não encontrado." };
  if (!bcrypt.compareSync(current, u.passwordHash))
    return { ok: false, error: "Senha atual incorreta." };
  if (!isPasswordValid(next))
    return { ok: false, error: "A nova senha não atende às regras." };
  if (next !== confirm)
    return { ok: false, error: "As senhas não coincidem." };

  await db
    .update(users)
    .set({ passwordHash: bcrypt.hashSync(next, 10) })
    .where(eq(users.id, id));
  return { ok: true };
}

/**
 * Salva a foto de perfil. A imagem já vem redimensionada e como data URL do
 * navegador — guardamos direto (funciona em qualquer ambiente, sem storage externo).
 */
export async function saveAvatar(dataUrl: string): Promise<ActionResult> {
  const id = await currentUserId();
  if (!id) return { ok: false, error: "Sessão expirada." };

  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(dataUrl)) {
    return { ok: false, error: "Imagem inválida." };
  }
  // Depois do resize a imagem é pequena; ~300KB de margem.
  if (dataUrl.length > 400_000) {
    return { ok: false, error: "Imagem muito grande. Tente outra." };
  }

  await db.update(users).set({ image: dataUrl }).where(eq(users.id, id));
  revalidatePath("/perfil");
  return { ok: true };
}
