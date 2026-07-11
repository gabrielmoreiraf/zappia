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

export interface CourseGroup {
  label: string;
  cor: string;
  itens: Course[];
}

// Cores rotativas — categorias são livres (qualquer segmento), não fixas.
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
