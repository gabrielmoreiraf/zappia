"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { PLAN_NAME, PLAN_PRICE } from "@/lib/plan";
import {
  AsaasError,
  cancelPixAutomaticAuthorization,
  cancelSubscription,
  createCustomer,
  createOneOffCharge,
  updateSubscriptionValue,
} from "@/lib/asaas";

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
 * Liga/desliga acesso vitalício (sem plano, sem cobrança). Ligando: cancela a
 * cobrança recorrente na Asaas (senão o cliente continuaria sendo debitado todo
 * mês mesmo com a tela dizendo "sem mensalidade"), reativa o cliente e some com
 * a data de próxima cobrança. Desligando: volta a exigir assinatura normal
 * (subscription_status "none"), e o cliente assina de novo pelo painel.
 */
export async function toggleLifetimeAccess(clientId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Sem permissão." };

  const [client] = await db
    .select({
      lifetimeAccess: clients.lifetimeAccess,
      asaasSubscriptionId: clients.asaasSubscriptionId,
      pixAutomaticAuthorizationId: clients.pixAutomaticAuthorizationId,
    })
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
    try {
      if (client.pixAutomaticAuthorizationId) {
        await cancelPixAutomaticAuthorization(client.pixAutomaticAuthorizationId);
      }
      if (client.asaasSubscriptionId) {
        await cancelSubscription(client.asaasSubscriptionId);
      }
    } catch (err) {
      console.error("[toggleLifetimeAccess] não deu pra cancelar na Asaas:", err);
      return {
        ok: false,
        error:
          "Não foi possível cancelar a cobrança na Asaas. Sem isso o cliente continuaria sendo cobrado, então nada foi alterado.",
      };
    }

    await db
      .update(clients)
      .set({
        lifetimeAccess: true,
        status: "active",
        subscriptionStatus: "active",
        subscriptionDueDate: null,
        monthlyFee: null,
        asaasSubscriptionId: null,
        pixAutomaticAuthorizationId: null,
        pixAutomaticStatus: null,
        pixNextChargeDue: null,
        subscriptionStartedAt: sql`coalesce(${clients.subscriptionStartedAt}, now())`,
      })
      .where(eq(clients.id, clientId));
  }

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}

/**
 * Coloca a assinatura desse cliente no preço atual do plano. Usado quando o
 * preço do Zappia muda: quem já assinava continua no valor antigo até alguém
 * decidir reajustar. O ciclo já emitido não muda (ver updateSubscriptionValue),
 * o valor novo vale a partir da próxima cobrança.
 */
export async function syncSubscriptionPrice(clientId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Sem permissão." };

  const [client] = await db
    .select({
      asaasSubscriptionId: clients.asaasSubscriptionId,
      lifetimeAccess: clients.lifetimeAccess,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return { ok: false, error: "Cliente não encontrado." };
  if (client.lifetimeAccess) {
    return { ok: false, error: "Esse cliente tem acesso vitalício, não é cobrado." };
  }
  if (!client.asaasSubscriptionId) {
    return { ok: false, error: "Esse cliente não tem assinatura ativa na Asaas." };
  }

  try {
    await updateSubscriptionValue(
      client.asaasSubscriptionId,
      Number(PLAN_PRICE),
      `Assinatura ${PLAN_NAME}`,
    );
    await db
      .update(clients)
      .set({ monthlyFee: PLAN_PRICE })
      .where(eq(clients.id, clientId));
    revalidatePath(`/clientes/${clientId}`);
    return { ok: true };
  } catch (err) {
    console.error("[syncSubscriptionPrice] falhou:", err);
    return {
      ok: false,
      error:
        err instanceof AsaasError && err.description
          ? err.description
          : "Não foi possível atualizar o valor na Asaas.",
    };
  }
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
