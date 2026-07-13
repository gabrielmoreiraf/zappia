import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getBilling } from "@/db/agency";
import { getCurrentUser } from "@/lib/current-user";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Header } from "../ui";

export default async function FaturamentoPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/dashboard");
  const b = await getBilling();

  const cards = [
    { label: "Receita mensal", value: money(b.receita), tint: "text-emerald-600" },
    { label: "Custo de operação", value: money(b.custo), tint: "text-sky-600" },
    { label: "Margem", value: money(b.margem), tint: "text-teal-600" },
  ];

  return (
    <div>
      <Header title="Faturamento" sub="Receita, custo e margem da operação." />

      <div className="grid gap-3 mb-5 grid-cols-1 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 gap-0">
            <div className="text-xs text-slate-500 mb-1">{c.label}</div>
            <div className={`text-2xl font-bold ${c.tint}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 gap-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex text-xs font-semibold text-slate-400">
          <span className="flex-1">Cliente</span>
          <span className="w-24 text-right">Receita</span>
          <span className="w-28 text-right">Custo estimado</span>
        </div>
        {b.rows.map((r, i) => (
          <Link
            key={r.id}
            href={`/clientes/${r.id}`}
            className={`px-4 py-3 flex items-center text-sm hover:bg-slate-50 ${
              i < b.rows.length - 1 ? "border-b border-slate-50" : ""
            }`}
          >
            <span className="flex-1 font-medium text-slate-700 truncate">
              {r.name}
            </span>
            <span className="w-24 text-right text-emerald-600 font-semibold">
              {money(r.receita)}
            </span>
            <span className="w-28 text-right text-red-600 font-medium">
              {money(r.custo)}
            </span>
            <ChevronRight size={15} className="text-slate-300 ml-2 shrink-0" />
          </Link>
        ))}
      </Card>

      <p className="text-xs text-slate-400 mt-3">
        Custo = IA (Claude) + áudio (Groq), calculados por chamada, mais a taxa
        da Asaas (real quando já existe pagamento confirmado, senão estimada).
        Mensagens de WhatsApp não entram: são grátis dentro da janela de
        atendimento. Veja o detalhe clicando num cliente.
      </p>
    </div>
  );
}
