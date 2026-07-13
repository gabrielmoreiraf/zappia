"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { createCustomer, createOneOffCharge } from "@/lib/asaas";

type Result = { ok: boolean; error?: string; invoiceUrl?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  return user;
}

/** Bloqueia (pausa) ou reativa o cliente — pausado, a IA para de responder. */
export async function toggleClientStatus(clientId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Sem permissão." };

  const [client] = await db
    .select({ status: clients.status })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  const next = client.status === "active" ? "paused" : "active";
  await db.update(clients).set({ status: next }).where(eq(clients.id, clientId));
  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/** Libera N meses de acesso sem cobrar (crédito de boas-vindas, cortesia etc.). */
export async function grantFreeMonths(
  clientId: string,
  months: number,
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Sem permissão." };
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    return { ok: false, error: "Informe um número de meses entre 1 e 24." };
  }

  const [client] = await db
    .select({
      subscriptionDueDate: clients.subscriptionDueDate,
      freeMonthsGranted: clients.freeMonthsGranted,
      freeMonthsRemaining: clients.freeMonthsRemaining,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  const base =
    client.subscriptionDueDate && client.subscriptionDueDate > new Date()
      ? client.subscriptionDueDate
      : new Date();
  const nextDueDate = new Date(base);
  nextDueDate.setMonth(nextDueDate.getMonth() + months);

  await db
    .update(clients)
    .set({
      status: "active",
      subscriptionStatus: "active",
      subscriptionStartedAt: client.subscriptionDueDate ? undefined : new Date(),
      subscriptionDueDate: nextDueDate,
      freeMonthsGranted: client.freeMonthsGranted + months,
      freeMonthsRemaining: client.freeMonthsRemaining + months,
    })
    .where(eq(clients.id, clientId));

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/**
 * Liga/desliga acesso vitalício (sem plano, sem cobrança). Ligando: reativa o
 * cliente, marca assinatura em dia e some com data de próxima cobrança.
 * Desligando: volta a exigir assinatura normal (subscription_status "none").
 */
export async function toggleLifetimeAccess(clientId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Sem permissão." };

  const [client] = await db
    .select({ lifetimeAccess: clients.lifetimeAccess })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  if (client.lifetimeAccess) {
    await db
      .update(clients)
      .set({ lifetimeAccess: false, subscriptionStatus: "none" })
      .where(eq(clients.id, clientId));
  } else {
    await db
      .update(clients)
      .set({
        lifetimeAccess: true,
        status: "active",
        subscriptionStatus: "active",
        subscriptionDueDate: null,
        monthlyFee: null,
        subscriptionStartedAt: sql`coalesce(${clients.subscriptionStartedAt}, now())`,
      })
      .where(eq(clients.id, clientId));
  }

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/** Gera uma cobrança avulsa (fora do ciclo mensal) pra esse cliente na Asaas. */
export async function generateOneOffCharge(
  clientId: string,
  value: number,
  description: string,
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Sem permissão." };
  if (!(value > 0)) return { ok: false, error: "Informe um valor válido." };
  if (!description.trim()) return { ok: false, error: "Descreva a cobrança." };

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  try {
    let asaasCustomerId = client.asaasCustomerId;
    if (!asaasCustomerId) {
      if (!client.cpfCnpj) {
        return {
          ok: false,
          error: "Esse cliente ainda não tem CPF/CNPJ cadastrado (nunca assinou).",
        };
      }
      const customer = await createCustomer({
        name: client.name,
        email: client.ownerEmail,
        cpfCnpj: client.cpfCnpj,
      });
      asaasCustomerId = customer.id;
      await db
        .update(clients)
        .set({ asaasCustomerId })
        .where(eq(clients.id, clientId));
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const payment = await createOneOffCharge({
      customerId: asaasCustomerId,
      value,
      description,
      dueDate: tomorrow.toISOString().slice(0, 10),
    });

    revalidatePath(`/clientes/${clientId}`);
    return { ok: true, invoiceUrl: payment.invoiceUrl };
  } catch (err) {
    console.error("[generateOneOffCharge] falhou:", err);
    return { ok: false, error: "Não foi possível gerar a cobrança." };
  }
}
