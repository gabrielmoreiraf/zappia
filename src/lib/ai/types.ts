/**
 * Contrato JSON de saída do Haiku (§2 do prompt mestre).
 * O backend faz JSON.parse e roteia com base nesses campos.
 */
export interface HaikuOutput {
  /** Texto que vai pro cliente no WhatsApp. */
  reply: string;
  /** true quando a conversa precisa de humano. */
  handoff: boolean;
  /** Motivo curto do handoff (ex.: "preço não cadastrado"). */
  handoff_reason: string | null;
  /** true na 1ª mensagem em que fica claro que é um lead real. */
  lead_detected: boolean;
  /** Nome do curso/item da base mencionado, se houver. */
  course_mentioned: string | null;
  /** "baixa" quando a resposta se apoia em algo fora da base explícita. */
  confidence: "alta" | "baixa";
}

const CONFIDENCES = ["alta", "baixa"] as const;

/**
 * Valida e normaliza o objeto retornado pelo modelo. Nunca confia cegamente:
 * campos ausentes ou de tipo errado caem para o lado seguro (handoff).
 */
export function normalizeHaikuOutput(raw: unknown): HaikuOutput {
  const o = (raw ?? {}) as Record<string, unknown>;

  const reply = typeof o.reply === "string" ? o.reply.trim() : "";
  const confidence = CONFIDENCES.includes(o.confidence as never)
    ? (o.confidence as "alta" | "baixa")
    : "baixa";

  return {
    reply,
    handoff: o.handoff === true,
    handoff_reason:
      typeof o.handoff_reason === "string" ? o.handoff_reason : null,
    lead_detected: o.lead_detected === true,
    course_mentioned:
      typeof o.course_mentioned === "string" && o.course_mentioned.trim()
        ? o.course_mentioned.trim()
        : null,
    confidence,
  };
}
