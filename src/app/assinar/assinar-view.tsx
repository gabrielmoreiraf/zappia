"use client";

import { useRouter } from "next/navigation";
import { Bot, Check, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscribeForm } from "@/components/subscribe-form";
import { PLAN_NAME, PLAN_PRICE_LABEL, PLAN_FEATURES } from "@/lib/plan";

export function AssinarView({
  clientName,
  cpfCnpj,
}: {
  clientName: string;
  cpfCnpj: string | null;
}) {
  const router = useRouter();

  function handleActivated() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4">
            <Bot size={28} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Zappia</span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Falta só o pagamento, {clientName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            Assine o plano {PLAN_NAME} pra liberar o painel e ativar o atendimento
            com IA no seu WhatsApp.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-baseline gap-1 pb-3 mb-3 border-b border-slate-50">
              <span className="text-2xl font-semibold text-slate-800">
                {PLAN_PRICE_LABEL}
              </span>
              <span className="text-sm text-slate-400">/mês</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>

            <SubscribeForm defaultCpfCnpj={cpfCnpj} onActivated={handleActivated} />
          </CardContent>
        </Card>

        <div className="flex justify-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-600"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={14} /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
