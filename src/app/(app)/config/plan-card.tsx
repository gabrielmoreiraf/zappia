"use client";

import { Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/plan";

// Mockado: ainda não há gateway de pagamento integrado.
const MOCK_CARD_LAST4 = "4242";
const MOCK_NEXT_BILLING = "12 de agosto de 2026";

export function PlanCard() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Plano {PLAN_NAME}</CardTitle>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            Ativo
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Assinatura e pagamento.</p>
      </CardHeader>
      <CardContent className="space-y-1 flex-1 flex flex-col">
        <div className="flex items-baseline gap-1 py-2.5 border-b border-slate-50">
          <span className="text-2xl font-semibold text-slate-800">
            {PLAN_PRICE_LABEL}
          </span>
          <span className="text-sm text-slate-400">/mês</span>
        </div>

        <div className="flex items-center gap-2.5 py-2.5 border-b border-slate-50">
          <CreditCard size={16} className="text-slate-400 shrink-0" />
          <span className="text-sm text-slate-600 flex-1">
            Cartão terminado em •••• {MOCK_CARD_LAST4}
          </span>
        </div>

        <div className="flex items-center gap-2.5 py-2.5">
          <Calendar size={16} className="text-slate-400 shrink-0" />
          <span className="text-sm text-slate-600 flex-1">
            Próxima cobrança em {MOCK_NEXT_BILLING}
          </span>
        </div>

        <Button
          className="mt-auto w-full"
          onClick={() => toast.info("Gerenciamento de assinatura chega em breve.")}
        >
          Gerenciar assinatura
        </Button>
      </CardContent>
    </Card>
  );
}
