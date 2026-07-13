"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CreditCard,
  Gift,
  History,
  Infinity as InfinityIcon,
  LogIn,
  QrCode,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dateLong, dateTimeShort, money } from "@/lib/format";
import type { ClientDetail } from "@/db/agency";
import { enterClient } from "../../agency-actions";
import {
  toggleClientStatus,
  toggleLifetimeAccess,
  grantFreeMonths,
  generateOneOffCharge,
} from "./actions";

const PAYMENT_LABEL: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
};

const SUB_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  none: { label: "Sem assinatura", tone: "bg-slate-100 text-slate-500" },
  pending: { label: "Aguardando pagamento", tone: "bg-slate-100 text-slate-600" },
  active: { label: "Em dia", tone: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Atrasado", tone: "bg-amber-50 text-amber-700" },
  canceled: { label: "Cancelado", tone: "bg-red-50 text-red-600" },
};

export function ClientDetailView({ detail }: { detail: ClientDetail }) {
  const { client, costBreakdown, payments, accessLog } = detail;
  const router = useRouter();
  const [pending, start] = useTransition();

  const [enterOpen, setEnterOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [freeOpen, setFreeOpen] = useState(false);
  const [months, setMonths] = useState("1");
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeValue, setChargeValue] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");

  const subInfo = SUB_STATUS_LABEL[client.subscriptionStatus] ?? SUB_STATUS_LABEL.none;

  function submitEnter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      toast.error("Descreva o motivo (mínimo 5 caracteres).");
      return;
    }
    start(async () => {
      try {
        await enterClient(client.id, reason);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
      }
    });
  }

  function bloquear() {
    if (
      !confirm(
        client.status === "active"
          ? "Bloquear esse cliente? A IA para de responder até você reativar."
          : "Reativar esse cliente?",
      )
    )
      return;
    start(async () => {
      const res = await toggleClientStatus(client.id);
      if (res.ok) {
        toast.success(
          client.status === "active" ? "Cliente bloqueado." : "Cliente reativado.",
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao atualizar.");
      }
    });
  }

  function toggleLifetime() {
    const turningOn = !client.lifetimeAccess;
    if (
      !confirm(
        turningOn
          ? "Dar acesso vitalício? Esse cliente para de precisar de assinatura."
          : "Remover o acesso vitalício? O cliente volta a precisar assinar um plano.",
      )
    )
      return;
    start(async () => {
      const res = await toggleLifetimeAccess(client.id);
      if (res.ok) {
        toast.success(
          turningOn ? "Acesso vitalício liberado!" : "Acesso vitalício removido.",
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao atualizar.");
      }
    });
  }

  function submitFree(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(months);
    start(async () => {
      const res = await grantFreeMonths(client.id, n);
      if (res.ok) {
        toast.success(`${n} mês(es) grátis liberado(s).`);
        setFreeOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao liberar.");
      }
    });
  }

  function submitCharge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Number(chargeValue.replace(",", "."));
    start(async () => {
      const res = await generateOneOffCharge(client.id, v, chargeDesc);
      if (res.ok) {
        toast.success("Cobrança gerada!");
        setChargeOpen(false);
        setChargeValue("");
        setChargeDesc("");
        if (res.invoiceUrl) window.open(res.invoiceUrl, "_blank");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao gerar cobrança.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-500">{client.businessDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={client.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
          >
            {client.status === "active" ? "Ativo" : "Bloqueado"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className={client.status === "active" ? "text-red-600 hover:text-red-700" : ""}
            onClick={bloquear}
            disabled={pending}
          >
            <Ban size={14} /> {client.status === "active" ? "Bloquear" : "Reativar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Assinatura e pagamento */}
        {client.lifetimeAccess ? (
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Assinatura e pagamento
                <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                  <InfinityIcon size={12} /> Vitalício
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-white border border-violet-100 px-3.5 py-3">
                <span className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <InfinityIcon size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Acesso vitalício
                  </div>
                  <div className="text-xs text-slate-500">
                    Sem mensalidade, sem cobrança. O atendimento fica sempre ativo.
                  </div>
                </div>
              </div>
              <Row icon={Calendar} label="Cliente desde">
                {dateLong(client.subscriptionStartedAt ?? client.createdAt)}
              </Row>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-violet-700 hover:text-violet-800"
                  onClick={toggleLifetime}
                  disabled={pending}
                >
                  <InfinityIcon size={14} /> Remover acesso vitalício
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Assinatura e pagamento
                <Badge variant="secondary" className={subInfo.tone}>
                  {subInfo.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Row icon={Calendar} label="Cliente desde">
                {dateLong(client.subscriptionStartedAt ?? client.createdAt)}
              </Row>
              <Row icon={Receipt} label="Último pagamento">
                {client.lastPaymentAt ? dateLong(client.lastPaymentAt) : "Nenhum ainda"}
              </Row>
              <Row icon={Calendar} label="Próxima cobrança">
                {client.subscriptionDueDate ? dateLong(client.subscriptionDueDate) : "-"}
              </Row>
              <Row icon={client.paymentMethod === "PIX" ? QrCode : CreditCard} label="Forma de pagamento">
                {client.paymentMethod ? PAYMENT_LABEL[client.paymentMethod] ?? client.paymentMethod : "-"}
              </Row>
              {client.freeMonthsGranted > 0 && (
                <Row icon={Gift} label="Meses grátis">
                  {client.freeMonthsRemaining} restando de {client.freeMonthsGranted} dados
                </Row>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setFreeOpen(true)}>
                  <Gift size={14} /> Liberar meses grátis
                </Button>
                <Button variant="outline" size="sm" onClick={() => setChargeOpen(true)}>
                  <Receipt size={14} /> Gerar cobrança avulsa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-violet-700 hover:text-violet-800"
                  onClick={toggleLifetime}
                  disabled={pending}
                >
                  <InfinityIcon size={14} /> Dar acesso vitalício
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custo estimado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo real (este mês)</CardTitle>
            <p className="text-xs text-muted-foreground">
              IA e áudio calculados na hora de cada chamada (modelo e tokens exatos).
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Row label="Receita (mensalidade)">{money(client.monthlyFee)}</Row>
            <Row label="IA (Claude, por chamada)" tone="red">{money(costBreakdown.ia)}</Row>
            <Row label="Áudio (transcrição Groq)" tone="red">{money(costBreakdown.audio)}</Row>
            <Row
              label={
                (client.paymentMethod === "PIX"
                  ? "Taxa Asaas (Pix)"
                  : client.paymentMethod === "CREDIT_CARD"
                    ? "Taxa Asaas (cartão)"
                    : "Taxa Asaas (gateway)") +
                (costBreakdown.gatewayIsExact ? "" : " · estimativa")
              }
              tone="red"
            >
              {money(costBreakdown.gateway)}
            </Row>
            <p className="text-xs text-slate-400 -mt-1">
              Mensagens de WhatsApp: R$ 0,00. O Zappia só responde dentro da janela
              de atendimento (24h), categoria gratuita da Meta desde nov/2024.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Custo total</span>
              <span className="text-sm font-bold text-red-600">{money(costBreakdown.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-700">Margem</span>
              <span className="text-sm font-bold text-emerald-700">
                {money(Number(client.monthlyFee ?? 0) - costBreakdown.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de pagamentos */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History size={16} className="text-slate-400" /> Histórico de pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            {payments.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-slate-400">Nenhum evento ainda.</p>
            ) : (
              <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {payments.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-slate-700">{p.event}</div>
                      <div className="text-xs text-slate-400">{dateTimeShort(p.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-700">{money(p.value)}</div>
                      <div className="text-xs text-slate-400">
                        {p.billingType ? PAYMENT_LABEL[p.billingType] ?? p.billingType : p.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* LGPD: acesso ao painel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={16} className="text-slate-400" /> Acesso ao painel
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ver as conversas desse cliente envolve dados dos clientes finais dele.
              Cada entrada exige motivo e fica registrada.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button size="sm" onClick={() => setEnterOpen(true)} disabled={pending}>
              <LogIn size={14} /> Entrar como {client.name}
            </Button>

            {accessLog.length > 0 && (
              <div className="pt-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Últimos acessos
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {accessLog.map((a) => (
                    <div key={a.id} className="text-xs bg-slate-50 rounded-lg px-2.5 py-2">
                      <div className="flex items-center justify-between text-slate-600 font-medium">
                        <span>{a.adminEmail}</span>
                        <span className="text-slate-400">{dateTimeShort(a.createdAt)}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">{a.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: entrar com motivo */}
      <Dialog open={enterOpen} onOpenChange={setEnterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar como {client.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Você vai ver as conversas e leads reais desse cliente. Isso fica
            registrado com o motivo abaixo.
          </div>
          <form onSubmit={submitEnter} className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="reason">Motivo do acesso</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: cliente abriu chamado sobre a IA não responder"
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                Entrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: meses grátis */}
      <Dialog open={freeOpen} onOpenChange={setFreeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar meses grátis</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitFree} className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="months">Quantos meses</Label>
              <Input
                id="months"
                type="number"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Adia a próxima cobrança sem criar uma cobrança real. Bom pra
                cortesia ou período de teste.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                Liberar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: cobrança avulsa */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar cobrança avulsa</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCharge} className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                inputMode="decimal"
                value={chargeValue}
                onChange={(e) => setChargeValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
                placeholder="Ex.: taxa de setup"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Gera um link de pagamento (Pix ou cartão) fora do ciclo mensal.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                Gerar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ROW_TONE = {
  default: "text-slate-700",
  red: "text-red-600",
  green: "text-emerald-700",
};

function Row({
  icon: Icon,
  label,
  tone = "default",
  children,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone?: keyof typeof ROW_TONE;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
      <span className="text-slate-500 flex-1">{label}</span>
      <span className={`font-medium ${ROW_TONE[tone]}`}>{children}</span>
    </div>
  );
}
