/**
 * Parser/serializer da base de conhecimento (§3 do prompt mestre).
 *
 * Decisão de modelagem (Fase 2/4): o `knowledge_base` markdown do client é a
 * fonte única de verdade. A tela "Base de cursos" (§4.6) é um editor sobre ele —
 * estas funções fazem o round-trip markdown ⇄ objeto.
 */
export interface Course {
  nome: string;
  status: "confirmado" | "confirmar_com_equipe";
  categoria: string; // Presencial | Técnico | EAD | Informática
  valor?: string;
  cargaHoraria?: string;
  observacao?: string;
  ativo: boolean;
}

function normKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/\s+/g, "_");
}

export function parseKnowledgeBase(md: string | null | undefined): Course[] {
  if (!md || !md.trim()) return [];
  const blocks = md.split(/(?=^### )/m).filter((b) => b.trim());
  const courses: Course[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0]?.replace(/^###\s*/, "").trim();
    if (!header) continue;

    const fields: Record<string, string> = {};
    for (const line of lines.slice(1)) {
      const m = line.match(/^\s*-\s*([^:]+):\s*(.*)$/);
      if (m) fields[normKey(m[1])] = m[2].trim();
    }

    courses.push({
      nome: header,
      status:
        fields.status === "confirmado" ? "confirmado" : "confirmar_com_equipe",
      categoria: fields.categoria || "Presencial",
      valor: fields.valor || undefined,
      cargaHoraria: fields.carga_horaria || undefined,
      observacao: fields.observacao || undefined,
      ativo: fields.ativo ? fields.ativo.toLowerCase() !== "false" : true,
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
      // §3: omitir valor quando status = confirmar_com_equipe.
      if (c.status === "confirmado" && c.valor) lines.push(`- valor: ${c.valor}`);
      lines.push(`- carga_horária: ${c.cargaHoraria || "a confirmar"}`);
      if (c.observacao) lines.push(`- observação: ${c.observacao}`);
      lines.push(`- ativo: ${c.ativo ? "true" : "false"}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/** Agrupa os cursos por categoria, na ordem/cor do protótipo (§4.6). */
const GROUP_ORDER: { match: (cat: string) => boolean; label: string; cor: string }[] =
  [
    { match: (c) => /presencial/i.test(c), label: "Presenciais", cor: "emerald" },
    { match: (c) => /técnico|tecnico/i.test(c), label: "Técnicos", cor: "teal" },
    { match: (c) => /ead/i.test(c), label: "EAD", cor: "sky" },
    { match: (c) => /informática|informatica/i.test(c), label: "Informática", cor: "amber" },
  ];

export interface CourseGroup {
  label: string;
  cor: string;
  itens: Course[];
}

export function groupCourses(courses: Course[]): CourseGroup[] {
  const groups: CourseGroup[] = GROUP_ORDER.map((g) => ({
    label: g.label,
    cor: g.cor,
    itens: [],
  }));
  const outros: CourseGroup = { label: "Outros", cor: "slate", itens: [] };

  for (const c of courses) {
    const idx = GROUP_ORDER.findIndex((g) => g.match(c.categoria));
    if (idx >= 0) groups[idx].itens.push(c);
    else outros.itens.push(c);
  }
  const result = groups.filter((g) => g.itens.length > 0);
  if (outros.itens.length) result.push(outros);
  return result;
}
