import { env } from "./env";

function baseUrl(): string {
  return env.asaasEnv === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

/**
 * Erro vindo da Asaas já traduzido. `description` é a mensagem que a própria
 * Asaas escreve em português (ex.: "Cartão de crédito recusado"), pronta pra
 * mostrar pro cliente; `code` e `status` ficam pro log.
 */
export class AsaasError extends Error {
  readonly code: string | null;
  readonly status: number;
  readonly description: string | null;

  constructor(opts: {
    path: string;
    status: number;
    code: string | null;
    description: string | null;
    raw: string;
  }) {
    super(`asaas ${opts.path} ${opts.status}: ${opts.description ?? opts.raw}`);
    this.name = "AsaasError";
    this.code = opts.code;
    this.status = opts.status;
    this.description = opts.description;
  }
}

interface AsaasErrorBody {
  errors?: { code?: string; description?: string }[];
}

// A Asaas cobra em segundos reais: se a rede travar, é melhor devolver erro
// tratado pro cliente do que deixar a request pendurada até o timeout da
// Vercel (que devolveria uma tela de erro genérica).
const TIMEOUT_MS = 20_000;

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${baseUrl()}${path}`, {
      ...init,
      // Nunca reaproveitar resposta em cache: são dados de cobrança ao vivo.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        access_token: env.asaasApiKey,
        ...init?.headers,
      },
    });
  } catch (err) {
    throw new AsaasError({
      path,
      status: 0,
      code: null,
      description: null,
      raw: err instanceof Error ? err.message : String(err),
    });
  }

  const raw = await r.text();
  if (!r.ok) {
    let code: string | null = null;
    let description: string | null = null;
    try {
      const body = JSON.parse(raw) as AsaasErrorBody;
      const first = body.errors?.[0];
      code = first?.code ?? null;
      description = first?.description ?? null;
    } catch {
      // corpo não-JSON (ex.: HTML de erro do gateway): fica só o raw no log
    }
    throw new AsaasError({ path, status: r.status, code, description, raw });
  }

  // DELETE pode voltar corpo vazio.
  if (!raw) return undefined as T;
  return JSON.parse(raw) as T;
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

/** Estado atual da assinatura. `nextDueDate` já vem avançado após cada pagamento. */
export async function getSubscription(
  subscriptionId: string,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
}

/**
 * Reajusta o valor de uma assinatura que já existe (ex.: mudança de preço do
 * plano). `updatePendingPayments: false` de propósito: a cobrança já emitida
 * do ciclo atual continua no valor antigo, e o valor novo vale a partir do
 * próximo ciclo — ninguém recebe uma fatura reajustada em cima da hora.
 */
export async function updateSubscriptionValue(
  subscriptionId: string,
  value: number,
  description: string,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ value, description, updatePendingPayments: false }),
  });
}

export interface AsaasPayment {
  id: string;
  status: string;
  invoiceUrl: string;
  dueDate: string;
  billingType: string;
}

/**
 * Cobrança que o cliente tem pra pagar agora nessa assinatura: a primeira em
 * aberto (PENDING/OVERDUE). Só cai no pagamento mais recente se não houver
 * nenhuma em aberto. Não dá pra confiar em `order=desc` da listagem, por isso
 * a escolha é feita aqui.
 */
export async function getOpenSubscriptionPayment(
  subscriptionId: string,
): Promise<AsaasPayment | null> {
  const list = await listSubscriptionPayments(subscriptionId);
  const open = list.filter((p) => p.status === "PENDING" || p.status === "OVERDUE");
  const byDueDateAsc = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return byDueDateAsc[0] ?? list[0] ?? null;
}

export async function listSubscriptionPayments(
  subscriptionId: string,
): Promise<AsaasPayment[]> {
  const res = await asaasFetch<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments?limit=10`,
  );
  return res.data ?? [];
}

// Status em que a Asaas considera o dinheiro garantido (CONFIRMED = capturado
// no cartão, RECEIVED = caiu na conta).
const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

export function isPaid(status: string): boolean {
  return PAID_STATUSES.has(status);
}

/**
 * A Asaas manda data sem hora ("YYYY-MM-DD"). Se virasse `new Date("...")`
 * seria meia-noite UTC, que exibida em America/Sao_Paulo (UTC-3) recua pro dia
 * anterior. Ancora ao meio-dia UTC pra nenhum fuso cruzar a virada do dia.
 */
export function parseAsaasDate(d: string): Date {
  return new Date(`${d}T12:00:00Z`);
}

/**
 * Vencimento do PRÓXIMO ciclo (o que as telas chamam de "próxima cobrança").
 * A Asaas já avança `nextDueDate` da assinatura assim que confirma um
 * pagamento; se a consulta falhar, cai no vencimento pago + 1 mês. Sem isso a
 * tela mostraria como "próxima" a cobrança que o cliente acabou de pagar.
 */
export async function getNextDueDate(
  subscriptionId: string,
  paidDueDate: string,
): Promise<Date> {
  try {
    const sub = await getSubscription(subscriptionId);
    if (sub.nextDueDate && sub.nextDueDate > paidDueDate) {
      return parseAsaasDate(sub.nextDueDate);
    }
  } catch (err) {
    console.warn("[asaas] não deu pra ler o próximo vencimento:", err);
  }
  const d = parseAsaasDate(paidDueDate);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
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
