import { env } from "./env";

function baseUrl(): string {
  return env.asaasEnv === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: env.asaasApiKey,
      ...init?.headers,
    },
  });
  if (!r.ok) throw new Error(`asaas ${path} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string | null;
  cpfCnpj: string;
}

/** Cria (ou já retorna, a Asaas não deduplica sozinha) um cliente na Asaas. */
export async function createCustomer(data: {
  name: string;
  email?: string | null;
  cpfCnpj: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email: data.email || undefined,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
    }),
  });
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: string;
  nextDueDate: string;
  value: number;
}

/** Dados do titular exigidos pela Asaas pra processar cartão de crédito. */
export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string; // "MM"
  expiryYear: string; // "YYYY"
  ccv: string;
}

/**
 * Cria a assinatura recorrente mensal. Checkout é 100% nosso (sem redirecionar
 * pra Asaas): Pix devolve o pagamento pra buscarmos o QR Code; cartão processa
 * direto e o resultado chega pelo webhook.
 */
export async function createSubscription(
  data:
    | {
        customerId: string;
        value: number;
        description: string;
        nextDueDate: string; // YYYY-MM-DD
        billingType: "PIX";
      }
    | {
        customerId: string;
        value: number;
        description: string;
        nextDueDate: string;
        billingType: "CREDIT_CARD";
        creditCard: CreditCardData;
        creditCardHolderInfo: CreditCardHolderInfo;
        remoteIp: string;
      },
): Promise<AsaasSubscription> {
  const body: Record<string, unknown> = {
    customer: data.customerId,
    billingType: data.billingType,
    cycle: "MONTHLY",
    value: data.value,
    nextDueDate: data.nextDueDate,
    description: data.description,
  };
  if (data.billingType === "CREDIT_CARD") {
    body.creditCard = data.creditCard;
    body.creditCardHolderInfo = data.creditCardHolderInfo;
    body.remoteIp = data.remoteIp;
  }
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface AsaasPayment {
  id: string;
  status: string;
  invoiceUrl: string;
  dueDate: string;
  billingType: string;
}

/** Pega o pagamento mais recente da assinatura. */
export async function getLatestSubscriptionPayment(
  subscriptionId: string,
): Promise<AsaasPayment | null> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments?limit=1&order=desc`,
  );
  return res.data[0] ?? null;
}

export interface PixQrCode {
  encodedImage: string; // base64 PNG, sem o prefixo data:
  payload: string; // "copia e cola"
  expirationDate: string;
}

/** QR Code + copia-e-cola do pagamento Pix, pra renderizar no nosso modal. */
export async function getPixQrCode(paymentId: string): Promise<PixQrCode> {
  return asaasFetch<PixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

/** Cobrança avulsa, fora do ciclo da assinatura (ex.: taxa extra, ajuste). */
export async function createOneOffCharge(data: {
  customerId: string;
  value: number;
  description: string;
  dueDate: string; // YYYY-MM-DD
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: data.customerId,
      billingType: "UNDEFINED",
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
    }),
  });
}

/* ------------------------------------------------------------------------
 * Pix Automático (BACEN): débito recorrente com autorização do pagador,
 * separado do modelo de "assinatura" normal (que a Asaas gerencia sozinha).
 * Aqui a APLICAÇÃO é responsável por criar a cobrança de cada ciclo dentro
 * da janela de 2 a 10 dias úteis antes do vencimento, e por disparar cada
 * retentativa manualmente (ver docs.asaas.com/docs/pix-automatico-implementacao
 * e .../pix-automático-processo-de-retentativas-jornada-3-api).
 * ------------------------------------------------------------------------ */

export type PixAutomaticStatus = "CREATED" | "ACTIVE" | "CANCELLED" | "REFUSED" | "EXPIRED";

export interface AsaasPixAutomaticAuthorization {
  id: string;
  status: PixAutomaticStatus;
  customerId: string;
  frequency: string;
  value: number | null;
  payload: string | null; // QR Code (copia-e-cola) do débito autorizado + 1ª cobrança
  encodedImage: string | null; // QR Code em base64
  immediateQrCode: { conciliationIdentifier: string; expirationDate: string } | null;
  // A Asaas cria uma "assinatura" interna pra agrupar as cobranças dessa
  // autorização — os webhooks de pagamento (PAYMENT_CONFIRMED/OVERDUE) vêm com
  // esse mesmo subscription id, então guardamos pra reaproveitar o mesmo
  // tratamento que já existe pra assinatura de cartão (ver webhook/asaas).
  subscriptionId: string | null;
}

/**
 * Cria a autorização com a 1ª cobrança embutida no mesmo QR Code: o pagador
 * escaneia uma vez só e autoriza tanto o pagamento imediato quanto o débito
 * dos próximos ciclos.
 */
export async function createPixAutomaticAuthorization(data: {
  customerId: string;
  value: number;
  description: string;
  startDate: string; // YYYY-MM-DD
}): Promise<AsaasPixAutomaticAuthorization> {
  return asaasFetch<AsaasPixAutomaticAuthorization>("/pix/automatic/authorizations", {
    method: "POST",
    body: JSON.stringify({
      frequency: "MONTHLY",
      contractId: data.customerId, // 1 contrato por cliente (identificador nosso, não é ID da Asaas)
      startDate: data.startDate,
      value: data.value,
      description: data.description,
      customerId: data.customerId,
      paymentCreationMode: "MANUAL",
      retryPolicy: "ALLOW_THREE_IN_SEVEN_DAYS",
      immediateQrCode: {
        expirationSeconds: 3600,
        originalValue: data.value,
        description: data.description,
      },
    }),
  });
}

export async function getPixAutomaticAuthorization(
  id: string,
): Promise<AsaasPixAutomaticAuthorization> {
  return asaasFetch<AsaasPixAutomaticAuthorization>(`/pix/automatic/authorizations/${id}`);
}

export async function cancelPixAutomaticAuthorization(id: string): Promise<void> {
  await asaasFetch(`/pix/automatic/authorizations/${id}`, { method: "DELETE" });
}

/** Cria a cobrança de um ciclo (mensal) referenciando a autorização já ativa. */
export async function createPixAutomaticCharge(data: {
  customerId: string;
  authorizationId: string;
  value: number;
  description: string;
  dueDate: string; // YYYY-MM-DD
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: data.customerId,
      billingType: "PIX",
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      pixAutomaticAuthorizationId: data.authorizationId,
    }),
  });
}

export interface AsaasPixAutomaticPaymentInstruction {
  id: string; // id da instrução (diferente do pay_... do payment)
  paymentId: string;
  dueDate: string;
  status: "AWAITING_REQUEST" | "SCHEDULED" | "DONE" | "CANCELLED" | "REFUSED";
  purpose: "SCHEDULE" | "RETRY_AFTER_DUE_DATE";
  retryAttempt: number;
}

/** Lista as instruções (recurso próprio da Asaas, id diferente do payment) de uma autorização. */
export async function listPixAutomaticInstructions(
  authorizationId: string,
  status?: AsaasPixAutomaticPaymentInstruction["status"],
): Promise<AsaasPixAutomaticPaymentInstruction[]> {
  const qs = new URLSearchParams({ authorizationId, ...(status ? { status } : {}) });
  const res = await asaasFetch<{ data: AsaasPixAutomaticPaymentInstruction[] }>(
    `/pix/automatic/paymentInstructions?${qs.toString()}`,
  );
  return res.data;
}

/**
 * Dispara uma retentativa (dia seguinte a uma recusa). Precisa ser enviada
 * até 23h59 do dia anterior à data pedida; máx. 3 tentativas em 7 dias
 * corridos a partir do vencimento original.
 */
export async function retryPixAutomaticInstruction(
  instructionId: string,
  dueDate: string, // YYYY-MM-DD
): Promise<void> {
  await asaasFetch(`/pix/automatic/paymentInstructions/${instructionId}/retries`, {
    method: "POST",
    body: JSON.stringify({ dueDate }),
  });
}
