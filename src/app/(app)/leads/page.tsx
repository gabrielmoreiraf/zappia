import Link from "next/link";
import { Download, Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getLeads } from "@/db/panel";
import { dayLabel, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "../ui";
import { LeadStatusSelect } from "./lead-status-select";

const FILTERS = [
  { key: "", label: "Todos" },
  { key: "novo", label: "Novos" },
  { key: "contato", label: "Em contato" },
  { key: "matriculado", label: "Matriculados" },
] as const;

const CHANNEL_LABEL: Record<string, string> = {
  anuncio: "Anúncio",
  organico: "Orgânico",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ st?: string }>;
}) {
  const { st } = await searchParams;
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const status =
    st === "novo" || st === "contato" || st === "matriculado" ? st : undefined;
  const rows = await getLeads(client.id, status);

  return (
    <div>
      <Header title="Leads" sub="Contatos capturados pela IA, prontos pra fechar." />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-slate-400 flex items-center gap-1.5 text-sm mr-1">
          <Filter size={14} /> Filtrar:
        </span>
        {FILTERS.map((f) => {
          const on = (status ?? "") === f.key;
          return (
            <Button
              key={f.key}
              asChild
              size="sm"
              variant={on ? "outline" : "ghost"}
              className={on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}
            >
              <Link href={f.key ? `/leads?st=${f.key}` : "/leads"}>{f.label}</Link>
            </Button>
          );
        })}
        <Button asChild size="sm" className="ml-auto">
          <a href="/api/leads/export">
            <Download /> Exportar
          </a>
        </Button>
      </div>

      <Card className="p-0 gap-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            {status
              ? "Nenhum lead nesse filtro."
              : "Nenhum lead ainda. Quando a IA identificar interesse de compra numa conversa, o contato vira um lead aqui."}
          </p>
        ) : (
          rows.map((l, i) => (
            <div
              key={l.id}
              className={`px-4 py-3 flex items-center gap-3 ${
                i < rows.length - 1 ? "border-b border-slate-50" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0">
                {initials(l.contactName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {l.contactName ?? "Contato"}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {l.courseInterest ?? "-"}
                </div>
              </div>
              <div className="text-xs text-slate-400 w-20 hidden sm:block">
                {CHANNEL_LABEL[l.channel]}
              </div>
              <LeadStatusSelect leadId={l.id} status={l.status} />
              <div className="text-xs text-slate-400 w-14 text-right hidden sm:block">
                {dayLabel(new Date(l.createdAt))}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
