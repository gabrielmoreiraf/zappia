"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { adminInvites, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { sendAdminInvite } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Result = { ok: boolean; error?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  return user;
}

/** Convida uma pessoa por e-mail pra virar administradora da agência. */
export async function inviteAdmin(formData: FormData): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };

  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { ok: false, error: "Informe o nome." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "E-mail inválido." };

  const [existingUser] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser?.isAdmin) {
    return { ok: false, error: "Essa pessoa já é administradora." };
  }

  await db
    .delete(adminInvites)
    .where(and(eq(adminInvites.email, email), isNull(adminInvites.acceptedAt)));

  const secret = randomBytes(24).toString("base64url");
  const tokenHash = bcrypt.hashSync(secret, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(adminInvites)
    .values({ email, name, tokenHash, expiresAt, invitedByEmail: admin.email })
    .returning({ id: adminInvites.id });

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const link = `${proto}://${host}/convite-admin/${invite.id}.${secret}`;

  try {
    await sendAdminInvite(email, name, link);
  } catch (err) {
    console.error("[inviteAdmin] envio do convite falhou:", err);
    await db.delete(adminInvites).where(eq(adminInvites.id, invite.id));
    return { ok: false, error: "Não consegui enviar o e-mail do convite." };
  }

  revalidatePath("/admins");
  return { ok: true };
}

export async function cancelAdminInvite(inviteId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };
  await db.delete(adminInvites).where(eq(adminInvites.id, inviteId));
  revalidatePath("/admins");
  return { ok: true };
}

/** Tira o acesso de administrador de alguém (não pode ser você, nem o último admin). */
export async function revokeAdmin(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };
  if (userId === admin.id) {
    return { ok: false, error: "Você não pode remover o seu próprio acesso." };
  }

  const [[target], allAdmins] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)),
  ]);
  if (!target?.isAdmin) return { ok: false, error: "Usuário não encontrado." };
  if (allAdmins.length <= 1) {
    return { ok: false, error: "Precisa ter ao menos um administrador." };
  }

  await db.update(users).set({ isAdmin: false }).where(eq(users.id, userId));
  revalidatePath("/admins");
  return { ok: true };
}
