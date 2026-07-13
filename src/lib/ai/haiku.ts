import Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@/db/schema";
import { env } from "../env";
import { costOfAnthropicCallUSD } from "../pricing";
import { buildSystemPrompt, buildContactBlock } from "./prompt";
import { normalizeHaikuOutput, type HaikuOutput } from "./types";

// §5 do prompt mestre: Haiku 4.5 é o modelo BASE (barato, rápido) e resolve a
// maioria das mensagens. Quando o caso é complexo, escalamos pro Sonnet 5,
// mais capaz, mas ainda longe do custo do Opus, só nessa mensagem.
const MODEL_FAST = "claude-haiku-4-5";
const MODEL_SMART = process.env.AI_SMART_MODEL || "claude-sonnet-5";
// Desligue o escalonamento com AI_ESCALATION=off (fica só no Haiku).
const ESCALATION_ON = !["off", "0", "false"].includes(
  (process.env.AI_ESCALATION || "on").toLowerCase(),
);
const TEMPERATURE = 0.2; // só o Haiku aceita temperatura; o Sonnet 5 rejeita.
const MAX_TOKENS = 1024;

// Schema pra forçar JSON válido no Sonnet 5 (ele não aceita o prefill "{").
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "reply",
    "handoff",
    "handoff_reason",
    "lead_detected",
    "course_mentioned",
    "confidence",
  ],
  properties: {
    reply: { type: "string" },
    handoff: { type: "boolean" },
    handoff_reason: { type: ["string", "null"] },
    lead_detected: { type: "boolean" },
    course_mentioned: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["alta", "baixa"] },
  },
} as const;

export interface HistoryTurn {
  from: "them" | "bot" | "you";
  text: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface HaikuResult {
  output: HaikuOutput;
  usage: Usage;
  /** Modelo que produziu a resposta final (para logs/depuração). */
  model: string;
  /** true quando precisou escalar pro modelo mais forte. */
  escalated: boolean;
  raw: string;
  /** Custo real (USD) de TODAS as chamadas feitas nessa mensagem (Haiku +
   * Sonnet quando escalou), já com o preço certo de cada modelo/camada. */
  costUsd: number;
}

let _client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey });
  return _client;
}

/** Extrai o primeiro objeto JSON balanceado de uma string. */
function extractJson(s: string): string {
  const start = s.indexOf("{");
  if (start === -1) return s;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

/** Resposta segura quando não dá pra interpretar o JSON do modelo. */
function fallbackOutput(): HaikuOutput {
  return {
    reply:
      "Deixa eu confirmar isso certinho com a equipe pra não te passar nada errado. Já te retorno por aqui, tá?",
    handoff: true,
    handoff_reason: "erro ao interpretar resposta da IA",
    lead_detected: false,
    course_mentioned: null,
    confidence: "baixa",
  };
}

function usageOf(resp: Anthropic.Message): Usage {
  return {
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: resp.usage.cache_creation_input_tokens ?? 0,
  };
}

function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
  };
}

function textOf(resp: Anthropic.Message): string {
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Decide se o caso é "complexo" o bastante pra valer o modelo mais forte. */
function shouldEscalate(parsed: unknown, output: HaikuOutput): boolean {
  if (!ESCALATION_ON) return false;
  // JSON ilegível → o modelo base se atrapalhou; tenta o mais forte.
  if (!parsed) return true;
  // Base incerta, mas SEM ser um handoff de "info não está na base" (aí o
  // Sonnet também não teria a info, não adianta gastar). Escalamos os casos
  // genuinamente ambíguos, onde um modelo melhor dá uma resposta melhor.
  return output.confidence === "baixa" && !output.handoff;
}

/**
 * Roda o Haiku para uma conversa. `history` é o histórico recente (mais antigo
 * primeiro), já incluindo a mensagem atual do cliente como último turno "them".
 * Quando o caso é complexo, escala automaticamente pro modelo mais forte.
 */
export async function runHaiku(
  client: Client,
  history: HistoryTurn[],
  contactName?: string | null,
): Promise<HaikuResult> {
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(client),
      // Caching: a base é grande e estável por cliente, igual pra qualquer
      // contato (§5). O nome do contato NÃO entra aqui — varia por conversa e
      // quebraria o cache (forçaria escrita nova, mais cara, a cada contato
      // diferente). Vai num bloco à parte, pequeno e sem cache.
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: buildContactBlock(contactName),
    },
  ];

  // Mapeia turnos → user/assistant, mesclando consecutivos do mesmo papel.
  const merged: { role: "user" | "assistant"; text: string }[] = [];
  for (const h of history) {
    const role: "user" | "assistant" = h.from === "them" ? "user" : "assistant";
    const last = merged[merged.length - 1];
    if (last && last.role === role) last.text += "\n\n" + h.text;
    else merged.push({ role, text: h.text });
  }
  // A API exige começar com user.
  while (merged.length && merged[0].role === "assistant") merged.shift();

  const baseMessages: Anthropic.MessageParam[] = merged.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  // --- 1ª passada: Haiku (barato). Prefill "{" força a saída a começar JSON.
  const fastResp = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system,
    messages: [...baseMessages, { role: "assistant", content: "{" }],
  });

  const fastRaw = "{" + textOf(fastResp);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(extractJson(fastRaw));
  } catch {
    parsed = null;
  }
  const fastOutput = parsed ? normalizeHaikuOutput(parsed) : fallbackOutput();
  let usage = usageOf(fastResp);
  let costUsd = costOfAnthropicCallUSD(MODEL_FAST, usage);

  // --- 2ª passada (só se preciso): Sonnet 5. Sem temperatura e sem prefill;
  // o formato JSON vem de output_config, e desligamos o thinking p/ economizar.
  if (shouldEscalate(parsed, fastOutput)) {
    try {
      const smartResp = await anthropic().messages.create({
        model: MODEL_SMART,
        max_tokens: MAX_TOKENS,
        thinking: { type: "disabled" },
        system,
        messages: baseMessages,
        output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      });

      const smartRaw = textOf(smartResp);
      let smartParsed: unknown = null;
      try {
        smartParsed = JSON.parse(extractJson(smartRaw));
      } catch {
        smartParsed = null;
      }
      const smartUsage = usageOf(smartResp);
      usage = addUsage(usage, smartUsage);
      costUsd += costOfAnthropicCallUSD(MODEL_SMART, smartUsage);

      if (smartParsed) {
        return {
          output: normalizeHaikuOutput(smartParsed),
          usage,
          model: MODEL_SMART,
          escalated: true,
          raw: smartRaw,
          costUsd,
        };
      }
    } catch (err) {
      // Escalonamento é um "extra": se falhar, seguimos com o Haiku.
      console.error("[runHaiku] escalonamento pro modelo forte falhou:", err);
    }
  }

  return {
    output: fastOutput,
    usage,
    model: MODEL_FAST,
    escalated: false,
    raw: fastRaw,
    costUsd,
  };
}

const IMPROVE_SYSTEM_PROMPT =
  'Você melhora rascunhos de mensagens de atendimento ao cliente em português do Brasil, escritas por um atendente humano no WhatsApp. Corrija ortografia e gramática, deixe o tom natural e educado, sem exagerar na formalidade nem adicionar emoji se não tinha. Mantenha o tamanho parecido com o original e a mesma intenção. Responda APENAS com o texto final, sem aspas, sem comentário, sem explicação.';

export interface ImproveDraftResult {
  text: string;
  costUsd: number;
  usage: Usage;
}

/**
 * "Sugerir melhoria no texto": chamada avulsa e pequena (sem base de
 * conhecimento, sem JSON, sem cache) pra corrigir/polir o rascunho do humano
 * antes de enviar. Custo desprezível: poucas dezenas de tokens por uso —
 * ainda assim entra no usage_log (ver actions.ts) pra não virar custo invisível.
 */
export async function improveDraftText(
  draft: string,
): Promise<ImproveDraftResult> {
  const resp = await anthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 300,
    temperature: 0.3,
    system: IMPROVE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: draft }],
  });
  const text = textOf(resp).trim();
  const usage = usageOf(resp);
  const costUsd = costOfAnthropicCallUSD(MODEL_FAST, usage);
  return { text: text || draft, costUsd, usage };
}
