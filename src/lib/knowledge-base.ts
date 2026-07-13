/**
 * Parser/serializer da base de conhecimento (§3 do prompt mestre).
 *
 * Decisão de modelagem (Fase 2/4): o `knowledge_base` markdown do client é a
 * fonte única de verdade. A tela "Base de conhecimento" (§4.6) é um editor
 * sobre ele. Estas funções fazem o round-trip markdown ⇄ objeto.
 *
 * Genérico pra qualquer ramo (mercado, clínica, loja, curso, depósito etc.):
 * "categoria" é livre, definida pelo próprio cliente, nunca fixa.
 */
export interface Course {
  nome: string;
  status: "confirmado" | "confirmar_com_equipe";
  categoria: string; // livre: definida pelo cliente, qualquer ramo
  valor?: string;
  /** Texto livre (pode ter várias linhas): o que a IA deve saber e como deve
   * falar sobre esse item. Mais rico que uma observação curta. */
  descricao?: string;
  ativo: boolean;
  /** Como o item entrou na base: "ia" (montado pela IA) ou manual/undefined. */
  origem?: "ia" | "manual";
}

function normKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/\s+/g, "_");
}

const FIELD_LINE_RE = /^\s*-\s*([^:]+):\s*(.*)$/;
// Campos que aceitam corpo em várias linhas quando o valor depois de ":" vem vazio.
const MULTILINE_KEYS = new Set(["descricao", "observacao", "detalhe", "carga_horaria"]);

export function parseKnowledgeBase(md: string | null | undefined): Course[] {
  if (!md || !md.trim()) return [];
  const blocks = md.split(/(?=^### )/m).filter((b) => b.trim());
  const courses: Course[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0]?.replace(/^###\s*/, "").trim();
    if (!header) continue;

    const fields: Record<string, string> = {};
    let i = 1;
    while (i < lines.length) {
      const m = lines[i].match(FIELD_LINE_RE);
      if (!m) {
        i++;
        continue;
      }
      const key = normKey(m[1]);
      let value = m[2].trim();
      // Sem valor na mesma linha e é um campo de texto livre: o corpo vem nas
      // linhas seguintes, até a próxima "- chave:" ou o fim do bloco.
      if (!value && MULTILINE_KEYS.has(key)) {
        const body: string[] = [];
        i++;
        while (i < lines.length && !FIELD_LINE_RE.test(lines[i])) {
          body.push(lines[i]);
          i++;
        }
        fields[key] = body.join("\n").trim();
        continue;
      }
      fields[key] = value;
      i++;
    }

    // Compat com formato antigo: "detalhe"/"carga_horaria"/"observacao" viram
    // parte da descrição única, ignorando o placeholder morto "a confirmar".
    const legacyBits = [fields.detalhe, fields.carga_horaria, fields.observacao]
      .filter((v) => v && v !== "a confirmar");
    const descricao = fields.descricao || legacyBits.join("\n") || undefined;

    courses.push({
      nome: header,
      status:
        fields.status === "confirmado" ? "confirmado" : "confirmar_com_equipe",
      categoria: fields.categoria || "Geral",
      valor: fields.valor || undefined,
      descricao,
      ativo: fields.ativo ? fields.ativo.toLowerCase() !== "false" : true,
      origem: fields.origem === "ia" ? "ia" : undefined,
    });
  }
  return courses;
}

export function serializeKnowledgeBase(courses: Course[]): string {
  return courses
    .map((c) => {
      const lines = [`### ${c.nome}`];
      lines.push(`- status: ${c.status}`);
      lines.push(`- categoria: ${c.categoria}`);
      // Preço é opcional e independe do status: o dono pode anotar um valor
      // mesmo em itens "a confirmar" (a IA já sabe que só afirma preço como
      // fato quando o status for "confirmado").
      if (c.valor) lines.push(`- valor: ${c.valor}`);
      if (c.origem === "ia") lines.push(`- origem: ia`);
      lines.push(`- ativo: ${c.ativo ? "true" : "false"}`);
      // Descrição por último: corpo livre, pode ter várias linhas.
      if (c.descricao?.trim()) {
        lines.push(`- descrição:`);
        lines.push(c.descricao.trim());
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export interface CourseGroup {
  label: string;
  cor: string;
  itens: Course[];
}

// Cores rotativas: categorias são livres (qualquer segmento), não fixas.
const GROUP_COLORS = ["emerald", "teal", "sky", "amber", "violet", "slate"];

/** Agrupa os itens pela categoria informada pelo cliente, na ordem de aparição. */
export function groupCourses(courses: Course[]): CourseGroup[] {
  const map = new Map<string, Course[]>();
  for (const c of courses) {
    const key = c.categoria?.trim() || "Geral";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  let i = 0;
  return Array.from(map.entries()).map(([label, itens]) => ({
    label,
    cor: GROUP_COLORS[i++ % GROUP_COLORS.length],
    itens,
  }));
}
