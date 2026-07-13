/** Horário de atendimento por dia da semana (fuso horário fixo: America/Sao_Paulo). */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DayHours {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export type BusinessHours = Record<DayKey, DayHours>;

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { enabled: true, start: "08:00", end: "18:00" },
  tue: { enabled: true, start: "08:00", end: "18:00" },
  wed: { enabled: true, start: "08:00", end: "18:00" },
  thu: { enabled: true, start: "08:00", end: "18:00" },
  fri: { enabled: true, start: "08:00", end: "18:00" },
  sat: { enabled: false, start: "08:00", end: "12:00" },
  sun: { enabled: false, start: "08:00", end: "12:00" },
};

export function parseBusinessHours(raw: string | null | undefined): BusinessHours {
  if (!raw) return DEFAULT_BUSINESS_HOURS;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<DayKey, Partial<DayHours>>>;
    const result = {} as BusinessHours;
    for (const day of DAY_KEYS) {
      const d = parsed[day];
      result[day] = {
        enabled:
          typeof d?.enabled === "boolean" ? d.enabled : DEFAULT_BUSINESS_HOURS[day].enabled,
        start: typeof d?.start === "string" ? d.start : DEFAULT_BUSINESS_HOURS[day].start,
        end: typeof d?.end === "string" ? d.end : DEFAULT_BUSINESS_HOURS[day].end,
      };
    }
    return result;
  } catch {
    return DEFAULT_BUSINESS_HOURS;
  }
}

export function serializeBusinessHours(hours: BusinessHours): string {
  return JSON.stringify(hours);
}

const WEEKDAY_MAP: Record<string, DayKey> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/**
 * true se `now` cai dentro da janela configurada do cliente. Cliente sem
 * horário ativado (ou sem configuração válida) é considerado sempre aberto,
 * pra não quebrar quem nunca mexeu nisso.
 */
export function isWithinBusinessHours(
  client: { businessHoursEnabled: boolean; businessHours: string | null },
  now: Date = new Date(),
): boolean {
  if (!client.businessHoursEnabled) return true;

  const hours = parseBusinessHours(client.businessHours);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  const dayKey = WEEKDAY_MAP[weekday];
  const today = dayKey ? hours[dayKey] : undefined;
  if (!today || !today.enabled) return false;

  const nowMinutes = hour * 60 + minute;
  const [startH, startM] = today.start.split(":").map(Number);
  const [endH, endM] = today.end.split(":").map(Number);
  return nowMinutes >= startH * 60 + startM && nowMinutes < endH * 60 + endM;
}
