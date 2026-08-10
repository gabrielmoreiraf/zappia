"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client, type User } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";
import { PLAN_NAME, PLAN_PRICE } from "@/lib/plan";
import {
  AsaasError,
  createCustomer,
  createSubscription,
  getNextDueDate,
  getOpenSubscriptionPayment,
  getPixQrCode,
  isPaid,
  listSubscriptionPayments,
  parseAsaasDate,
  cancelPixAutomaticAuthorization,
  cancelSubscription as asaasCancelSubscription,
} from "@/lib/asaas";

type Result = { ok: boolean; error?: string };
type PixResult =
  | { ok: true; qrCodeImage: string; copyPaste: string }
  | { ok: false; error: string };

async function ctx(): Promise<{ user: User; client: Client } | null> {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  return capsFor(user).config ? { user, client } : null;
}

/**
 * Data no fuso de São Paulo (UTC-3 fixo: o Brasil não tem mais horário de
 * verão desde 2019). O servidor roda em UTC, então `new Date()` puro viraria o
 * dia às 21h daqui e a Asaas receberia um vencimento um dia à frente.
 */
function saoPauloISODate(offsetDays = 0): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * A Asaas já devolve o motivo em português e pronto pro usuário final
 * ("Cartão de crédito recusado", "CPF inválido"). Quando não vier descrição
 * (rede caiu, 500), usa a mensagem genérica.
 */
function asaasMessage(err: unknown, fallback: string): string {
  return err instanceof AsaasError && err.description ? err.description : fallback;
}

/**
 * Assinatura antiga que ficou pra trás (tentativa que não foi paga, ou troca
 * de forma de pagamento) some da Asaas antes de criar a nova, senão o cliente
 * fica com duas cobranças abertas do mesmo plano.
 */
async function dropStaleSubscription(client: Client): Promise<void> {
  if (!client.asaasSubscriptionId) return;
  if (client.subscriptionStatus === "active") return;
  try {
    await asaasCancelSubscription(client.asaasSubscriptionId);
  } catch (err) {
    // Já cancelada/inexistente: seguir em frente é o comportamento certo.
    console.warn("[billing] não deu pra limpar a assinatura anterior:", err);
  }
}

/** Cria (ou reaproveita) o cliente na Asaas pra esse tenant. */
async function ensureAsaasCustomer(
  client: Client,
  cpfCnpj: string,
): Promise<string> {
  if (client.asaasCustomerId) return client.asaasCustomerId;
  const customer = await createCustomer({
    name: client.name,
    email: client.ownerEmail,
    cpfCnpj,
  });
  return customer.id;
}

/**
 * Assina via Pix recorrente simples: todo ciclo a Asaas gera uma cobrança
 * Pix nova (o cliente escaneia de novo). O Pix Automático de verdade (débito
 * autorizado uma vez, sem escanear todo mês) já está implementado em
 * asaas.ts/webhook/cron, mas fica esperando a Asaas liberar o recurso pra
 * essa conta (retornou 403 "sem permissão", precisa pedir ao gerente de
 * contas) — quando liberar, é só trocar essa função pra usar
 * createPixAutomaticAuthorization de novo.
 */
export async function subscribeWithPix(cpfCnpjRaw: string): Promise<PixResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };
  if (c.client.subscriptionStatus === "active") {
    return { ok: false, error: "Sua assinatura já está ativa." };
  }

  const cpfCnpj = onlyDigits(cpfCnpjRaw);
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return { ok: false, error: "CPF ou CNPJ inválido." };
  }

  try {
    const asaasCustomerId = await ensureAsaasCustomer(c.client, cpfCnpj);
    await dropStaleSubscription(c.client);

    // Vence amanhã: dá o dia de hoje inteiro pro cliente pagar sem a cobrança
    // já nascer atrasada.
    const nextDueDate = saoPauloISODate(1);
    const subscription = await createSubscription({
      customerId: asaasCustomerId,
      value: Number(PLAN_PRICE),
      description: `Assinatura ${PLAN_NAME}`,
      nextDueDate,
      billingType: "PIX",
    });

    const payment = await getOpenSubscriptionPayment(subscription.id);
    if (!payment) {
      return { ok: false, error: "Não foi possível gerar o Pix. Tente de novo." };
    }
    const qr = await getPixQrCode(payment.id);

    await db
      .update(clients)
      .set({
        cpfCnpj,
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
        subscriptionStatus: "pending",
        paymentMethod: "PIX",
        monthlyFee: PLAN_PRICE,
        subscriptionDueDate: parseAsaasDate(payment.dueDate),
        lastInvoiceUrl: payment.invoiceUrl,
        // Ciclo novo: zera o contador de retentativa e o dedupe do lembrete.
        pixRetryAttempt: 0,
        lastReminderDueDate: null,
      })
      .where(eq(clients.id, c.client.id));

    revalidatePath("/config");
    return { ok: true, qrCodeImage: qr.encodedImage, copyPaste: qr.payload };
  } catch (err) {
    console.error("[subscribeWithPix] falhou:", err);
    return {
      ok: false,
      error: asaasMessage(err, "Não foi possível gerar o Pix. Tente de novo."),
    };
  }
}

export interface CardSubscribeInput {
  cpfCnpj: string;
  email: string;
  phone: string;
  postalCode: string;
  addressNumber: string;
  holderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

/**
 * Assina via cartão de crédito recorrente. Os dados do cartão passam por
 * aqui só de passagem (nunca logados, nunca gravados) e seguem direto pra
 * Asaas na mesma request.
 */
export async function subscribeWithCard(
  input: CardSubscribeInput,
): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };
  if (c.client.subscriptionStatus === "active") {
    return { ok: false, error: "Sua assinatura já está ativa." };
  }

  const cpfCnpj = onlyDigits(input.cpfCnpj);
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return { ok: false, error: "CPF ou CNPJ inválido." };
  }
  const postalCode = onlyDigits(input.postalCode);
  if (postalCode.length !== 8) {
    return { ok: false, error: "CEP inválido." };
  }
  const phone = onlyDigits(input.phone);
  if (phone.length < 10) {
    return { ok: false, error: "Telefone inválido." };
  }
  const cardNumber = onlyDigits(input.cardNumber);
  if (cardNumber.length < 13) {
    return { ok: false, error: "Número do cartão inválido." };
  }

  try {
    const asaasCustomerId = await ensureAsaasCustomer(c.client, cpfCnpj);
    await dropStaleSubscription(c.client);

    const h = await headers();
    const remoteIp =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "127.0.0.1";

    // Vence HOJE de propósito: a Asaas só captura o cartão na data de
    // vencimento, então com data futura a cobrança nasceria PENDING e a tela
    // ficaria girando em "confirmando o pagamento" até o dia seguinte.
    const subscription = await createSubscription({
      customerId: asaasCustomerId,
      value: Number(PLAN_PRICE),
      description: `Assinatura ${PLAN_NAME}`,
      nextDueDate: saoPauloISODate(),
      billingType: "CREDIT_CARD",
      creditCard: {
        holderName: input.holderName,
        number: cardNumber,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        ccv: input.cvv,
      },
      creditCardHolderInfo: {
        name: input.holderName,
        email: input.email,
        cpfCnpj,
        postalCode,
        addressNumber: input.addressNumber,
        phone,
      },
      remoteIp,
    });

    // Guarda o link da fatura: se a captura do cartão falhar depois, o cliente
    // ainda tem por onde pagar ("Pagar agora" no card do plano).
    const payment = await getOpenSubscriptionPayment(subscription.id).catch(() => null);

    await db
      .update(clients)
      .set({
        cpfCnpj,
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
        subscriptionStatus: "pending",
        paymentMethod: "CREDIT_CARD",
        monthlyFee: PLAN_PRICE,
        subscriptionDueDate: payment ? parseAsaasDate(payment.dueDate) : null,
        lastInvoiceUrl: payment?.invoiceUrl ?? null,
        pixRetryAttempt: 0,
        lastReminderDueDate: null,
      })
      .where(eq(clients.id, c.client.id));

    revalidatePath("/config");
    return { ok: true };
  } catch (err) {
    console.error("[subscribeWithCard] falhou:", err);
    return {
      ok: false,
      error: asaasMessage(err, "Não foi possível processar o cartão. Confira os dados e tente de novo."),
    };
  }
}

/**
 * Estado mais recente da assinatura, pra polling depois de gerar o Pix ou
 * enviar o cartão. Enquanto está "pending", confere direto na Asaas em vez de
 * só esperar o webhook: se a entrega do webhook atrasar (ou falhar), o cliente
 * ainda vê a confirmação na hora, e o banco fica em dia do mesmo jeito.
 */
export async function getSubscriptionStatus(): Promise<{
  status: string;
} | null> {
  const c = await ctx();
  if (!c) return null;
  if (c.client.subscriptionStatus !== "pending" || !c.client.asaasSubscriptionId) {
    return { status: c.client.subscriptionStatus };
  }

  try {
    const payments = await listSubscriptionPayments(c.client.asaasSubscriptionId);
    const paid = payments.find((p) => isPaid(p.status));
    if (!paid) return { status: c.client.subscriptionStatus };

    const nextDueDate = await getNextDueDate(c.client.asaasSubscriptionId, paid.dueDate);
    await db
      .update(clients)
      .set({
        subscriptionStatus: "active",
        status: "active",
        subscriptionStartedAt: c.client.subscriptionStartedAt ?? new Date(),
        lastPaymentAt: new Date(),
        subscriptionDueDate: nextDueDate,
        paymentMethod: paid.billingType,
        lastInvoiceUrl: paid.invoiceUrl,
        pixRetryAttempt: 0,
      })
      .where(eq(clients.id, c.client.id));
    revalidatePath("/config");
    return { status: "active" };
  } catch (err) {
    console.error("[getSubscriptionStatus] conferência na Asaas falhou:", err);
    return { status: c.client.subscriptionStatus };
  }
}

/** Cancela a assinatura ativa (cartão ou Pix Automático). Pausa a IA junto. */
export async function cancelSubscription(): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };
  if (!c.client.asaasSubscriptionId && !c.client.pixAutomaticAuthorizationId) {
    return { ok: false, error: "Não há assinatura ativa." };
  }

  try {
    if (c.client.pixAutomaticAuthorizationId) {
      await cancelPixAutomaticAuthorization(c.client.pixAutomaticAuthorizationId);
    } else if (c.client.asaasSubscriptionId) {
      await asaasCancelSubscription(c.client.asaasSubscriptionId);
    }
    await db
      .update(clients)
      .set({ subscriptionStatus: "canceled", status: "paused" })
      .where(eq(clients.id, c.client.id));
    revalidatePath("/config");
    return { ok: true };
  } catch (err) {
    console.error("[cancelSubscription] falhou:", err);
    return { ok: false, error: "Não foi possível cancelar agora. Tente de novo." };
  }
}
