/**
 * Custo de operação por cliente (§6 / tela 4.10).
 *
 * IA e áudio são calculados NA HORA da chamada (haiku.ts / pipeline.ts), com o
 * modelo e o uso exatos daquela requisição, e gravados em USD no usage_log —
 * não são reconstruídos depois a partir de uma fórmula genérica. Isso evita
 * o erro de tratar tokens de cache ou do modelo escalado (Sonnet) como se
 * fossem input normal do Haiku.
 */

// Câmbio aproximado (atualizado 13/07/2026, ~R$5,11). Usado só pra EXIBIR em
// R$ custos que a Anthropic/Groq cobram em USD — não é uma cotação ao vivo,
// então varia um pouco do extrato real do cartão internacional.
export const USD_BRL = 5.11;

interface ModelRates {
  inputPerMTok: number;
  outputPerMTok: number;
}

// Preços oficiais por 1M tokens (Anthropic, confirmado 13/07/2026). Cache:
// leitura = 0,1x o input, escrita com TTL de 5min (o que o Zappia usa) =
// 1,25x o input — multiplicador igual em todos os modelos Claude atuais.
const ANTHROPIC_RATES: Record<string, ModelRates> = {
  "claude-haiku-4-5": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  "claude-sonnet-5": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
};
const CACHE_READ_MULT = 0.1;
const CACHE_WRITE_MULT = 1.25;

export interface AnthropicUsage {
  inputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
}

/** Custo exato (USD) de UMA chamada. Some o retorno de cada chamada feita. */
export function costOfAnthropicCallUSD(
  model: string,
  u: AnthropicUsage,
): number {
  const rates = ANTHROPIC_RATES[model] ?? ANTHROPIC_RATES["claude-haiku-4-5"];
  return (
    (u.inputTokens / 1_000_000) * rates.inputPerMTok +
    (u.cacheReadTokens / 1_000_000) * rates.inputPerMTok * CACHE_READ_MULT +
    (u.cacheCreationTokens / 1_000_000) * rates.inputPerMTok * CACHE_WRITE_MULT +
    (u.outputTokens / 1_000_000) * rates.outputPerMTok
  );
}

// Groq Whisper Large v3 Turbo: US$0,04/hora (confirmado 13/07/2026,
// groq.com/pricing), cobrado com mínimo de 10s por requisição.
const GROQ_USD_PER_HOUR = 0.04;
const GROQ_MIN_BILLABLE_SECONDS = 10;

/** Custo exato (USD) de UMA transcrição, já aplicando o mínimo de 10s. */
export function costOfTranscriptionUSD(seconds: number): number {
  if (seconds <= 0) return 0;
  const billable = Math.max(seconds, GROQ_MIN_BILLABLE_SECONDS);
  return (billable / 3600) * GROQ_USD_PER_HOUR;
}

/**
 * Mensagens do WhatsApp: o Zappia só manda texto livre respondendo o cliente
 * dentro da janela de atendimento (24h) — nunca template de marketing/
 * utility/authentication. Essa categoria ("service") é grátis desde nov/2024
 * (ver conversa sobre a API da Meta). Custo real hoje: R$ 0.
 */
export const WHATSAPP_COST_USD = 0;

export interface BillingInfo {
  paymentMethod: string | null; // "PIX" | "CREDIT_CARD" | "BOLETO" | null
  monthlyFee: number;
}

// Fallback: só usado quando AINDA não temos a taxa real de nenhum pagamento
// desse cliente (a Asaas informa o valor líquido de cada cobrança — ver
// netValue no webhook, gravado em payment_events.fee_value). Assim que existe
// um pagamento confirmado, usamos o valor real, não esta estimativa.
const ASAAS_PIX_FEE_ESTIMATE_BRL = 1.99;
const ASAAS_CARD_FEE_ESTIMATE_PCT = 0.0349;

export function estimateGatewayFeeBRL(b: BillingInfo): number {
  if (b.paymentMethod === "PIX") return ASAAS_PIX_FEE_ESTIMATE_BRL;
  if (b.paymentMethod === "CREDIT_CARD") return b.monthlyFee * ASAAS_CARD_FEE_ESTIMATE_PCT;
  return 0;
}

export interface CostBreakdownBRL {
  ia: number;
  audio: number;
  whatsapp: number;
  gateway: number;
  gatewayIsExact: boolean; // true = veio do netValue real; false = estimativa
  total: number;
}

/** Monta o card "de onde vem o número" a partir dos custos já computados. */
export function buildCostBreakdownBRL(input: {
  aiCostUsd: number;
  audioCostUsd: number;
  gatewayFeeBRL: number;
  gatewayIsExact: boolean;
}): CostBreakdownBRL {
  const ia = input.aiCostUsd * USD_BRL;
  const audio = input.audioCostUsd * USD_BRL;
  const gateway = input.gatewayFeeBRL;
  return {
    ia,
    audio,
    whatsapp: 0,
    gateway,
    gatewayIsExact: input.gatewayIsExact,
    total: ia + audio + gateway,
  };
}
