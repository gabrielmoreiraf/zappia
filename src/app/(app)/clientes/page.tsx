import { Building2, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getClientsOverview } from "@/db/agency";
import { getCurrentUser } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { Header } from "../ui";
import { NewClientButton } from "./new-client-button";

export default async function ClientesPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/dashboard");
  const rows = await getClientsOverview();

  return (
    <div>
      <Header
        title="Clientes"
        sub="Todos os atendentes que você gerencia (visão da agência)."
      />
      <NewClientButton />

      <Card className="p-0 gap-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Nenhum cliente ainda.</p>
        ) : (
          rows.map((c, i) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className={`w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 ${
                i < rows.length - 1 ? "border-b border-slate-50" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {c.name}
                </div>
                <div className="text-xs text-slate-400 truncate">{c.note}</div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-sm font-semibold text-slate-700">
                  {c.conversations}
                </div>
                <div className="text-[10px] text-slate-400">conversas</div>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  c.health === "ok" ? "bg-emerald-500" : "bg-amber-400"
                }`}
                title={c.health === "ok" ? "Saudável" : "Atenção"}
              />
              <ChevronRight size={16} className="text-slate-300" />
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}
