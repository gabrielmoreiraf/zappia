import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NoClient() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        <Building2 size={26} />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Nenhum cliente ainda</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">
        Crie seu primeiro cliente para começar a acompanhar conversas, leads e a IA.
      </p>
      <Button asChild className="mt-5">
        <Link href="/clientes">Criar primeiro cliente</Link>
      </Button>
    </div>
  );
}
