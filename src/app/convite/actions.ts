"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teamInvites, users } from "@/db/schema";
import { isPasswordValid } from "@/lib/password";

type Result = { ok: boolean; error?: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseToken(token: string): { id: string; secret: string } | null {
  const i = token.indexOf(".");
  if (i <= 0) return null;
  const id = token.slice(0, i);
  const secret = token.slice(i + 1);
  if (!UUID_RE.test(id) || !secret) return null;
  return { id, secret };
}

/** Aceita o convite: cria (ou vincula) o usuário do funcionário e define a senha. */
export async function acceptInvite(
  token: string,
  password: string,
  confirm: string,
): Promise<Result> {
  const parts = parseToken(token);
  if (!parts) return { ok: false, error: "Convite inválido." };
  if (!isPasswordValid(password))
    return { ok: false, error: "A senha não atende às regras." };
  if (password !== confirm)
    return { ok: false, error: "As senhas não coincidem." };

  const [inv] = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.id, parts.id))
    .limit(1);
  if (
    !inv ||
    inv.acceptedAt ||
    inv.expiresAt < new Date() ||
    !bcrypt.compareSync(parts.secret, inv.tokenHash)
  ) {
    return { ok: false, error: "Convite inválido ou expirado." };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, inv.email))
    .limit(1);
  if (existing?.clientId && existing.clientId !== inv.clientId) {
    return { ok: false, error: "Esse e-mail já está em uso em outra conta." };
  }

  if (existing) {
    await db
      .update(users)
      .set({
        name: inv.name,
        passwordHash,
        role: "member",
        permissions: inv.permissions,
        clientId: inv.clientId,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email: inv.email,
      name: inv.name,
      passwordHash,
      role: "member",
      permissions: inv.permissions,
      clientId: inv.clientId,
      emailVerifiedAt: new Date(),
    });
  }

  await db
    .update(teamInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(teamInvites.id, inv.id));
  return { ok: true };
}
