import Link from "next/link";
import { Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getLeads } from "@/db/panel";
import { Button } from "@/components/ui/button";
import { Header } from "../ui";
import { LeadsList } from "./leads-list";

const FILTERS = [
  { key: "", label: "Todos" },
  { key: "novo", label: "Novos" },
  { key: "contato", label: "Em contato" },
  { key: "matriculado", label: "Convertidos" },
] as const;

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
    <div className="h-full flex flex-col min-h-0">
      <Header title="Leads" sub="Contatos capturados pela IA, prontos pra fechar." />

      <div className="flex items-center gap-2 mb-4 flex-wrap shrink-0">
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
      </div>

      <LeadsList
        rows={rows}
        status={status}
        emptyMessage={
          status
            ? "Nenhum lead nesse filtro."
            : "Nenhum lead ainda. Quando a IA identificar interesse de compra numa conversa, o contato vira um lead aqui."
        }
      />
    </div>
  );
}
