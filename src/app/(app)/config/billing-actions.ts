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
  createCustomer,
  createSubscription,
  getLatestSubscriptionPayment,
  getPixQrCode,
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

function tomorrowISODate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
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

/** Assina via Pix: devolve o QR Code pra gente renderizar no próprio modal. */
export async function subscribeWithPix(cpfCnpjRaw: string): Promise<PixResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };

  const cpfCnpj = onlyDigits(cpfCnpjRaw);
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return { ok: false, error: "CPF ou CNPJ inválido." };
  }

  try {
    const asaasCustomerId = await ensureAsaasCustomer(c.client, cpfCnpj);

    const subscription = await createSubscription({
      customerId: asaasCustomerId,
      value: Number(PLAN_PRICE),
      description: `Assinatura ${PLAN_NAME}`,
      nextDueDate: tomorrowISODate(),
      billingType: "PIX",
    });

    const payment = await getLatestSubscriptionPayment(subscription.id);
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
        lastInvoiceUrl: payment.invoiceUrl,
      })
      .where(eq(clients.id, c.client.id));

    revalidatePath("/config");
    return { ok: true, qrCodeImage: qr.encodedImage, copyPaste: qr.payload };
  } catch (err) {
    console.error("[subscribeWithPix] falhou:", err);
    return { ok: false, error: "Não foi possível gerar o Pix. Tente de novo." };
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
    const h = await headers();
    const remoteIp =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "127.0.0.1";

    const subscription = await createSubscription({
      customerId: asaasCustomerId,
      value: Number(PLAN_PRICE),
      description: `Assinatura ${PLAN_NAME}`,
      nextDueDate: tomorrowISODate(),
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

    await db
      .update(clients)
      .set({
        cpfCnpj,
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
        subscriptionStatus: "pending",
        paymentMethod: "CREDIT_CARD",
      })
      .where(eq(clients.id, c.client.id));

    revalidatePath("/config");
    return { ok: true };
  } catch (err) {
    console.error("[subscribeWithCard] falhou:", err);
    return {
      ok: false,
      error: "Não foi possível processar o cartão. Confira os dados e tente de novo.",
    };
  }
}

/** Estado mais recente da assinatura, pra polling depois de gerar o Pix. */
export async function getSubscriptionStatus(): Promise<{
  status: string;
} | null> {
  const c = await ctx();
  if (!c) return null;
  return { status: c.client.subscriptionStatus };
}

/** Cancela a assinatura ativa. Pausa o atendimento da IA junto. */
export async function cancelSubscription(): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };
  if (!c.client.asaasSubscriptionId) {
    return { ok: false, error: "Não há assinatura ativa." };
  }

  try {
    await asaasCancelSubscription(c.client.asaasSubscriptionId);
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
