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
import { isAdminEmail } from "@/lib/roles";
import { sendTeamInvite } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Result = { ok: boolean; error?: string };

async function ownerCtx(): Promise<{ user: User; client: Client } | null> {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  const canManage = isAdminEmail(user.email) || user.role === "owner";
  return canManage ? { user, client } : null;
}

/** Convida um funcionário por e-mail (link pra ele criar a própria senha). */
export async function inviteMember(formData: FormData): Promise<Result> {
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: "Sem permissão." };
  const { client } = ctx;

  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const name = String(formData.get("name") ?? "").trim();
  const teamRole =
    String(formData.get("teamRole") ?? "atendente") === "gerente"
      ? "gerente"
      : "atendente";

  if (!name) return { ok: false, error: "Informe o nome." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "E-mail inválido." };

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

  // Substitui um convite pendente anterior para o mesmo e-mail.
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
    .values({ clientId: client.id, email, name, teamRole, tokenHash, expiresAt })
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

export async function cancelInvite(inviteId: string): Promise<Result> {
  const ctx = await ownerCtx();
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
  const ctx = await ownerCtx();
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
