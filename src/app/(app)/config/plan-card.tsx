"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  Infinity as InfinityIcon,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubscribeForm } from "@/components/subscribe-form";
import { PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/plan";
import { dateLong } from "@/lib/format";
import { cancelSubscription } from "./billing-actions";

type SubscriptionStatus = "none" | "pending" | "active" | "overdue" | "canceled";

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
};

export function PlanCard({
  subscriptionStatus,
  subscriptionDueDate,
  paymentMethod,
  lastInvoiceUrl,
  cpfCnpj,
  lifetimeAccess,
}: {
  subscriptionStatus: SubscriptionStatus;
  subscriptionDueDate: Date | null;
  paymentMethod: string | null;
  lastInvoiceUrl: string | null;
  cpfCnpj: string | null;
  lifetimeAccess?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function cancel() {
    if (!confirm("Cancelar a assinatura? A IA para de atender até você assinar de novo.")) return;
    start(async () => {
      const res = await cancelSubscription();
      if (res.ok) {
        toast.success("Assinatura cancelada.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao cancelar.");
      }
    });
  }

  if (lifetimeAccess) {
    return (
      <Card className="h-full flex flex-col border-violet-200 bg-gradient-to-br from-violet-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Plano {PLAN_NAME}</CardTitle>
            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
              <InfinityIcon size={12} /> Vitalício
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Assinatura e pagamento.</p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
            <span className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <InfinityIcon size={26} />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Acesso vitalício
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Você tem acesso vitalício ao Zappia: sem mensalidade, sem cobrança,
                pra sempre.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Plano {PLAN_NAME}</CardTitle>
          <StatusBadge status={subscriptionStatus} />
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

        {subscriptionStatus === "active" && (
          <>
            <div className="flex items-center gap-2.5 py-2.5 border-b border-slate-50">
              {paymentMethod === "PIX" ? (
                <QrCode size={16} className="text-slate-400 shrink-0" />
              ) : (
                <CreditCard size={16} className="text-slate-400 shrink-0" />
              )}
              <span className="text-sm text-slate-600 flex-1">
                {paymentMethod ? PAYMENT_LABEL[paymentMethod] ?? paymentMethod : "Pagamento"}
              </span>
            </div>
            <div className="flex items-center gap-2.5 py-2.5">
              <Calendar size={16} className="text-slate-400 shrink-0" />
              <span className="text-sm text-slate-600 flex-1">
                Próxima cobrança em {dateLong(subscriptionDueDate)}
              </span>
            </div>
          </>
        )}

        {subscriptionStatus === "overdue" && (
          <div className="flex items-start gap-2.5 py-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 my-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Pagamento atrasado desde {dateLong(subscriptionDueDate)}. O atendimento
              com IA está pausado até a cobrança ser confirmada.
            </span>
          </div>
        )}

        {subscriptionStatus === "pending" && (
          <div className="flex items-start gap-2.5 py-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 my-2">
            <span>Pagamento em processamento. Ativa assim que confirmar.</span>
          </div>
        )}

        {(subscriptionStatus === "none" || subscriptionStatus === "canceled") && (
          <div className="py-3 text-sm text-slate-500">
            Assine pra ativar o atendimento com IA.
          </div>
        )}

        <div className="mt-auto pt-2">
          {subscriptionStatus === "active" ? (
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700"
              onClick={cancel}
              disabled={pending}
            >
              Cancelar assinatura
            </Button>
          ) : subscriptionStatus === "overdue" && lastInvoiceUrl ? (
            <Button asChild className="w-full">
              <a href={lastInvoiceUrl} target="_blank" rel="noreferrer">
                Pagar agora
              </a>
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setOpen(true)} disabled={pending}>
              Assinar agora
            </Button>
          )}
        </div>
      </CardContent>

      <SubscribeDialog open={open} onOpenChange={setOpen} defaultCpfCnpj={cpfCnpj} />
    </Card>
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  if (status === "active") {
    return (
      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
        Ativo
      </Badge>
    );
  }
  if (status === "overdue") {
    return (
      <Badge variant="secondary" className="bg-amber-50 text-amber-700">
        Atrasado
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="bg-slate-100 text-slate-600">
        Aguardando pagamento
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-slate-100 text-slate-500">
      Sem assinatura
    </Badge>
  );
}

function SubscribeDialog({
  open,
  onOpenChange,
  defaultCpfCnpj,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCpfCnpj: string | null;
}) {
  const router = useRouter();

  function handleActivated() {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assinar o plano {PLAN_NAME}</DialogTitle>
          <p className="text-sm text-slate-500">{PLAN_PRICE_LABEL}/mês</p>
        </DialogHeader>
        <SubscribeForm defaultCpfCnpj={defaultCpfCnpj} onActivated={handleActivated} />
      </DialogContent>
    </Dialog>
  );
}
