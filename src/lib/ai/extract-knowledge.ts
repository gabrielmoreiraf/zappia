import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import type { Course } from "../knowledge-base";

// Extração é uma tarefa simples e de alto volume → Haiku (barato).
const MODEL = "claude-haiku-4-5";

let _client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey });
  return _client;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["itens"],
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "categoria", "status", "valor", "observacao"],
        properties: {
          nome: { type: "string" },
          categoria: { type: "string" },
          status: { type: "string", enum: ["confirmado", "confirmar_com_equipe"] },
          valor: { type: ["string", "null"] },
          observacao: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

interface RawItem {
  nome: string;
  categoria: string;
  status: "confirmado" | "confirmar_com_equipe";
  valor: string | null;
  observacao: string | null;
}

/**
 * Recebe um texto livre do dono do negócio e extrai os produtos/serviços/cursos
 * como itens estruturados da base. Não inventa nada: só o que está no texto.
 * Os itens voltam marcados `origem: "ia"` para revisão antes de salvar.
 */
export async function extractCourses(
  businessName: string,
  text: string,
): Promise<Course[]> {
  const t = text.trim();
  if (!t) return [];

  const system = `Você organiza a base de conhecimento de ${businessName}, um negócio que pode ser de qualquer ramo (loja, mercado, clínica, curso, oficina, e-commerce, restaurante, prestador de serviço, etc.). Recebe um texto livre do dono do negócio e extrai os PRODUTOS, SERVIÇOS ou ITENS citados como itens estruturados.

Regras:
- Um item por produto/serviço distinto. NÃO invente nada que não esteja no texto.
- "nome": nome curto e claro do item.
- "categoria": agrupe pelo tipo real do negócio descrito no texto (ex.: "Bebidas", "Consultas", "Cortes de cabelo", "Peças", "Cursos", o que fizer sentido pro ramo). Se não der pra inferir, use "Geral". Use a MESMA categoria para itens do mesmo tipo.
- "valor": só preencha se o texto disser um preço explícito (ex.: "R$ 390"); senão null.
- "status": "confirmado" só quando houver preço/dado concreto no texto; caso contrário "confirmar_com_equipe".
- "observacao": um detalhe curto e útil se houver (ex.: "entrega em 24h", "só sob encomenda", "duração de 1h"); senão null.
- Se o texto não tiver nenhum item claro, devolva { "itens": [] }.`;

  const resp = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.1,
    system: [{ type: "text", text: system }],
    messages: [{ role: "user", content: t }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });

  const out = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let parsed: { itens?: RawItem[] } = {};
  try {
    parsed = JSON.parse(out);
  } catch {
    parsed = {};
  }

  const itens = Array.isArray(parsed.itens) ? parsed.itens : [];
  return itens
    .filter((i) => i && typeof i.nome === "string" && i.nome.trim())
    .map((i) => ({
      nome: i.nome.trim(),
      status: i.status === "confirmado" ? "confirmado" : "confirmar_com_equipe",
      categoria: (i.categoria || "Geral").trim() || "Geral",
      valor: i.valor?.trim() || undefined,
      observacao: i.observacao?.trim() || undefined,
      ativo: true,
      origem: "ia" as const,
    }));
}
