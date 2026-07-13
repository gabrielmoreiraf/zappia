"use server";

import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientAccessLog, clientInvites, clients, users, type User } from "@/db/schema";
import { ACTIVE_CLIENT_COOKIE } from "@/lib/current-client";
import { getCurrentUser } from "@/lib/current-user";
import { sendClientInvite } from "@/lib/email";
import { PLAN_PRICE } from "@/lib/plan";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Result = { ok: boolean; error?: string };

// Consulta o banco em vez de confiar só no JWT: revogar admin precisa valer
// na hora, não só quando o token (que pode durar dias) expirar.
async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    throw new Error("Não autorizado.");
  }
  return user;
}

/**
 * Agência "entra como" um cliente: fixa o client ativo e vai pro painel dele.
 * LGPD: exige um motivo e registra o acesso (quem, quando, por quê) — dados de
 * terceiros (conversas dos clientes finais) só podem ser vistos com propósito
 * declarado e responsabilização.
 */
export async function enterClient(clientId: string, reason: string) {
  const admin = await requireAdmin();
  const cleanReason = reason.trim();
  if (cleanReason.length < 5) {
    throw new Error("Descreva o motivo (mínimo 5 caracteres).");
  }

  await db.insert(clientAccessLog).values({
    adminUserId: admin.id,
    adminEmail: admin.email,
    clientId,
    reason: cleanReason,
  });

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

/**
 * Cria o negócio e convida o dono por e-mail (ele cria a própria senha e já
 * vira owner). Se `freeFirstMonth`, o cliente já nasce com 1 mês de crédito
 * (mostra "Ativo" em Config sem precisar pagar nada).
 */
export async function inviteClient(formData: FormData): Promise<Result> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const businessDescription = String(
    formData.get("businessDescription") ?? "",
  ).trim();
  const assistantName =
    String(formData.get("assistantName") ?? "").trim() || "Atendimento";
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "")
    .toLowerCase()
    .trim();
  const freeFirstMonth = formData.get("freeFirstMonth") === "on";

  if (!name) return { ok: false, error: "Informe o nome do negócio." };
  if (!ownerName) return { ok: false, error: "Informe o nome do dono." };
  if (!EMAIL_RE.test(ownerEmail)) return { ok: false, error: "E-mail inválido." };

  const [existingUser] = await db
    .select({ clientId: users.clientId })
    .from(users)
    .where(eq(users.email, ownerEmail))
    .limit(1);
  if (existingUser?.clientId) {
    return { ok: false, error: "Esse e-mail já é dono de outro negócio." };
  }

  const freeExtra = freeFirstMonth
    ? {
        subscriptionStatus: "active" as const,
        subscriptionStartedAt: new Date(),
        subscriptionDueDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
        freeMonthsGranted: 1,
        freeMonthsRemaining: 1,
      }
    : {};

  const [client] = await db
    .insert(clients)
    .values({
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
      ownerEmail,
      notificationEmail: ownerEmail,
      ...freeExtra,
    })
    .returning({ id: clients.id });

  const secret = randomBytes(24).toString("base64url");
  const tokenHash = bcrypt.hashSync(secret, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(clientInvites)
    .values({
      clientId: client.id,
      email: ownerEmail,
      name: ownerName,
      tokenHash,
      expiresAt,
      invitedByEmail: admin.email,
    })
    .returning({ id: clientInvites.id });

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const link = `${proto}://${host}/convite-cliente/${invite.id}.${secret}`;

  try {
    await sendClientInvite(ownerEmail, ownerName, name, link, freeFirstMonth);
  } catch (err) {
    console.error("[inviteClient] envio do convite falhou:", err);
    await db.delete(clientInvites).where(eq(clientInvites.id, invite.id));
    await db.delete(clients).where(eq(clients.id, client.id));
    return { ok: false, error: "Não consegui enviar o e-mail do convite." };
  }

  revalidatePath("/clientes");
  return { ok: true };
}
