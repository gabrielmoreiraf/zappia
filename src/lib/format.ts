export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Hora curta (HH:MM) no fuso de São Paulo. */
export function timeShort(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** "Hoje" / "Ontem" / "N dias" / data curta. */
export function dayLabel(d: Date): string {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startToday.getTime() - d.getTime()) / 86_400_000);
  if (d >= startToday) return "Hoje";
  if (diffDays < 1) return "Ontem";
  const days = Math.ceil((startToday.getTime() - d.getTime()) / 86_400_000);
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export function money(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n || 0);
}

export function tempoResposta(seg: number | null): string {
  if (seg == null) return "—";
  if (seg < 60) return `${seg}s`;
  const min = Math.round(seg / 60);
  return `${min}min`;
}
