"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelWhatsappRequest,
  requestWhatsappConnection,
} from "./whatsapp-actions";

/** Glifo oficial do WhatsApp (lucide não traz ícones de marca). */
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function WhatsAppConnectionCard({
  connected,
  number,
  requested,
}: {
  connected: boolean;
  number: string | null;
  requested: boolean;
}) {
  const router = useRouter();
  const [num, setNum] = useState(number ?? "");
  const [pending, start] = useTransition();

  function solicitar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await requestWhatsappConnection(num);
      if (res.ok) {
        toast.success("Pedido enviado! Vamos conectar e te avisar.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível enviar.");
      }
    });
  }

  function trocar() {
    start(async () => {
      const res = await cancelWhatsappRequest();
      if (res.ok) router.refresh();
      else toast.error(res.error ?? "Falha.");
    });
  }

  // 1) Conectado
  if (connected) {
    return (
      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">WhatsApp</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <WhatsappIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                {number ?? "Número não definido"}
              </div>
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCheck size={13} /> Conectado · atendendo pelo Zappia
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2) Solicitado — aguardando a equipe conectar
  if (requested) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-800">
              Estamos conectando seu número
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Recebemos{" "}
              <span className="font-semibold text-slate-700">{number}</span>. Nossa
              equipe cuida da parte técnica com a Meta e te avisa por aqui quando
              estiver pronto — costuma levar até 1 dia útil.
            </p>
            <button
              onClick={trocar}
              disabled={pending}
              className="text-xs text-slate-400 hover:text-slate-600 mt-2"
            >
              Trocar o número
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3) Ainda não pediu — formulário simples
  return (
    <Card className="border-emerald-100">
      <CardContent className="flex flex-col md:flex-row gap-6 py-7">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mx-auto md:mx-0">
          <WhatsappIcon className="w-8 h-8" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-800">
            Conectar seu WhatsApp
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Você não precisa mexer em nada técnico. Passe o número que quer usar no
            atendimento e a gente conecta pra você, com a API oficial da Meta — sem
            risco de banimento.
          </p>

          <form onSubmit={solicitar} className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="grid gap-1.5 flex-1">
              <Label htmlFor="wa-number">Número do WhatsApp (com DDD)</Label>
              <Input
                id="wa-number"
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="+55 11 91234-5678"
                required
              />
            </div>
            <Button type="submit" disabled={pending || !num.trim()}>
              Solicitar conexão
            </Button>
          </form>

          <div className="flex items-start gap-2 mt-3 text-xs text-slate-400">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Use um número dedicado ao atendimento — ao conectar, ele passa a
              responder pelo Zappia e não pelo WhatsApp do celular.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
