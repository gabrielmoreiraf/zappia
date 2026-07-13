"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/plan";
import { inviteClient } from "../agency-actions";

export function NewClientButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [freeFirstMonth, setFreeFirstMonth] = useState(true);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (freeFirstMonth) fd.set("freeFirstMonth", "on");
    start(async () => {
      const res = await inviteClient(fd);
      if (res.ok) {
        toast.success("Convite enviado! O dono cria a senha por e-mail.");
        setOpen(false);
      } else {
        toast.error(res.error ?? "Não foi possível convidar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-5">
          <Plus /> Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do negócio</Label>
            <Input id="name" name="name" required placeholder="Ex.: Depósito São Jorge" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="businessDescription">O que o negócio faz</Label>
            <Textarea
              id="businessDescription"
              name="businessDescription"
              rows={2}
              placeholder="Ex.: Materiais de construção e ferragens."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assistantName">Nome do assistente</Label>
            <Input id="assistantName" name="assistantName" placeholder="Atendimento" />
          </div>

          <p className="text-xs font-medium text-slate-500 pt-1">Dono do negócio</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-2">
              <Label htmlFor="ownerName">Nome</Label>
              <Input id="ownerName" name="ownerName" required placeholder="Ana Lima" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerEmail">E-mail</Label>
              <Input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                required
                placeholder="ana@empresa.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
            <div>
              <div className="text-sm text-slate-700 font-medium">1º mês grátis</div>
              <div className="text-xs text-slate-400">
                Ele já começa "Ativo" sem precisar pagar de cara.
              </div>
            </div>
            <Switch checked={freeFirstMonth} onCheckedChange={setFreeFirstMonth} />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-sm text-slate-600">Plano {PLAN_NAME}</span>
            <span className="text-sm font-medium text-slate-700">
              {PLAN_PRICE_LABEL}/mês
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ele recebe um e-mail pra criar a senha e vira dono desse negócio. A
            conexão do WhatsApp e a base de conhecimento ele configura depois.
          </p>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando…" : "Enviar convite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
