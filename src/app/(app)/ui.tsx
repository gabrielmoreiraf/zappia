import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const TINTS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  teal: "bg-teal-50 text-teal-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
};

export function Metric({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tint: keyof typeof TINTS;
}) {
  return (
    <Card className="p-4 gap-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${TINTS[tint]}`}
      >
        <Icon size={18} />
      </div>
      <div className="font-bold text-slate-900 text-xl sm:text-2xl">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </Card>
  );
}

export const CONV_STATUS: Record<string, { label: string; cls: string }> = {
  ia: { label: "IA", cls: "bg-emerald-100 text-emerald-700" },
  novo: { label: "Novo", cls: "bg-amber-100 text-amber-700" },
  voce: { label: "Você", cls: "bg-sky-100 text-sky-700" },
};

export const LEAD_STATUS: Record<string, { label: string; cls: string }> = {
  novo: { label: "Novo", cls: "bg-amber-100 text-amber-700" },
  contato: { label: "Em contato", cls: "bg-sky-100 text-sky-700" },
  matriculado: { label: "Matriculado", cls: "bg-emerald-100 text-emerald-700" },
};

export function Avatar({ text }: { text: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold shrink-0">
      {text}
    </div>
  );
}
