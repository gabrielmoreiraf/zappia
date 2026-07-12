import Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@/db/schema";
import { env } from "../env";
import { buildSystemPrompt } from "./prompt";
import { normalizeHaikuOutput, type HaikuOutput } from "./types";

// §5 do prompt mestre: Haiku 4.5, temperatura baixa, caching na base.
const MODEL = "claude-haiku-4-5";
const TEMPERATURE = 0.2;
const MAX_TOKENS = 1024;

export interface HistoryTurn {
  from: "them" | "bot" | "you";
  text: string;
}

export interface HaikuResult {
  output: HaikuOutput;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
  raw: string;
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
      "Deixa eu confirmar isso certinho com a equipe pra não te passar nada errado — já te retorno por aqui, tá?",
    handoff: true,
    handoff_reason: "erro ao interpretar resposta da IA",
    lead_detected: false,
    course_mentioned: null,
    confidence: "baixa",
  };
}

/**
 * Roda o Haiku para uma conversa. `history` é o histórico recente (mais antigo
 * primeiro), já incluindo a mensagem atual do cliente como último turno "them".
 */
export async function runHaiku(
  client: Client,
  history: HistoryTurn[],
): Promise<HaikuResult> {
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(client),
      // Caching: a base é grande e estável por cliente (§5).
      cache_control: { type: "ephemeral" },
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

  const messages: Anthropic.MessageParam[] = merged.map((m) => ({
    role: m.role,
    content: m.text,
  }));
  // Prefill "{" força a saída a começar como JSON.
  messages.push({ role: "assistant", content: "{" });

  const resp = await anthropic().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system,
    messages,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const raw = "{" + text;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    parsed = null;
  }

  return {
    output: parsed ? normalizeHaikuOutput(parsed) : fallbackOutput(),
    usage: {
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
      cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: resp.usage.cache_creation_input_tokens ?? 0,
    },
    raw,
  };
}
