/**
 * Estimativa de custo de operação por cliente (§6 / tela 4.10).
 *
 * ⚠️ Valores aproximados — ajustar conforme faturas reais de Anthropic, Groq e Meta.
 */
const USD_BRL = 5.4; // câmbio aproximado

// Claude Haiku 4.5 — por 1M tokens (estimativa)
const HAIKU_IN_USD_PER_MTOK = 1.0;
const HAIKU_OUT_USD_PER_MTOK = 5.0;

// Groq Whisper Large v3 Turbo — ~US$ 0,04 por hora de áudio
const GROQ_USD_PER_MIN = 0.04 / 60;

// WhatsApp Cloud API — estimativa por mensagem de serviço (Brasil)
const WHATSAPP_USD_PER_MSG = 0.03;

export interface UsageTotals {
  tokensIn: number;
  tokensOut: number;
  audioSeconds: number;
  whatsappMessages: number;
}

export function estimateCostBRL(u: UsageTotals): number {
  const usd =
    (u.tokensIn / 1_000_000) * HAIKU_IN_USD_PER_MTOK +
    (u.tokensOut / 1_000_000) * HAIKU_OUT_USD_PER_MTOK +
    (u.audioSeconds / 60) * GROQ_USD_PER_MIN +
    u.whatsappMessages * WHATSAPP_USD_PER_MSG;
  return usd * USD_BRL;
}
