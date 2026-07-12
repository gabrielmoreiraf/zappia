"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { teamInvites, users, type Client, type User } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor, cleanPerms } from "@/lib/permissions";
import { sendTeamInvite } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Result = { ok: boolean; error?: string };

/** Quem tem a permissão "Equipe" gerencia usuários (o dono sempre tem). */
async function teamCtx(): Promise<{ user: User; client: Client } | null> {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  return capsFor(user).team ? { user, client } : null;
}

/** Convida um funcionário por e-mail com as permissões escolhidas. */
export async function inviteMember(formData: FormData): Promise<Result> {
  const ctx = await teamCtx();
  if (!ctx) return { ok: false, error: "Sem permissão." };
  const { client } = ctx;

  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const name = String(formData.get("name") ?? "").trim();
  const permissions = cleanPerms(
    String(formData.get("permissions") ?? "").split(","),
  );

  if (!name) return { ok: false, error: "Informe o nome." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "E-mail inválido." };
  if (permissions.length === 0)
    return { ok: false, error: "Marque ao menos uma permissão." };

  const [existingUser] = await db
    .select({ clientId: users.clientId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser?.clientId === client.id) {
    return { ok: false, error: "Essa pessoa já faz parte da equipe." };
  }
  if (existingUser?.clientId && existingUser.clientId !== client.id) {
    return { ok: false, error: "Esse e-mail já está em uso em outra conta." };
  }

  await db
    .delete(teamInvites)
    .where(
      and(
        eq(teamInvites.clientId, client.id),
        eq(teamInvites.email, email),
        isNull(teamInvites.acceptedAt),
      ),
    );

  const secret = randomBytes(24).toString("base64url");
  const tokenHash = bcrypt.hashSync(secret, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(teamInvites)
    .values({ clientId: client.id, email, name, permissions, tokenHash, expiresAt })
    .returning({ id: teamInvites.id });

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const link = `${proto}://${host}/convite/${invite.id}.${secret}`;

  try {
    await sendTeamInvite(email, name, client.name, link);
  } catch (err) {
    console.error("[inviteMember] envio do convite falhou:", err);
    await db.delete(teamInvites).where(eq(teamInvites.id, invite.id));
    return { ok: false, error: "Não consegui enviar o e-mail do convite." };
  }

  revalidatePath("/equipe");
  return { ok: true };
}

/** Atualiza as permissões de um funcionário já existente. */
export async function updateMemberPermissions(
  userId: string,
  permissions: string[],
): Promise<Result> {
  const ctx = await teamCtx();
  if (!ctx) return { ok: false, error: "Sem permissão." };
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target || target.clientId !== ctx.client.id) {
    return { ok: false, error: "Usuário não encontrado." };
  }
  if (target.role === "owner") {
    return { ok: false, error: "O dono já tem acesso total." };
  }
  await db
    .update(users)
    .set({ permissions: cleanPerms(permissions) })
    .where(eq(users.id, userId));
  revalidatePath("/equipe");
  return { ok: true };
}

export async function cancelInvite(inviteId: string): Promise<Result> {
  const ctx = await teamCtx();
  if (!ctx) return { ok: false, error: "Sem permissão." };
  await db
    .delete(teamInvites)
    .where(
      and(eq(teamInvites.id, inviteId), eq(teamInvites.clientId, ctx.client.id)),
    );
  revalidatePath("/equipe");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<Result> {
  const ctx = await teamCtx();
  if (!ctx) return { ok: false, error: "Sem permissão." };
  if (userId === ctx.user.id) {
    return { ok: false, error: "Você não pode remover a si mesmo." };
  }
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target || target.clientId !== ctx.client.id) {
    return { ok: false, error: "Usuário não encontrado." };
  }
  if (target.role === "owner") {
    return { ok: false, error: "Não dá pra remover o dono." };
  }
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/equipe");
  return { ok: true };
}
