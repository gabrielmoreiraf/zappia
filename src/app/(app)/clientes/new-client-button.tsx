"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/plan";
import { createClient } from "../agency-actions";

export function NewClientButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await createClient(fd);
      setOpen(false);
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
            <Label htmlFor="name">Nome do cliente</Label>
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
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-sm text-slate-600">Plano {PLAN_NAME}</span>
            <span className="text-sm font-medium text-slate-700">
              {PLAN_PRICE_LABEL}/mês
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            A conexão do WhatsApp e a base de conhecimento são configuradas depois,
            no painel do cliente.
          </p>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando…" : "Criar cliente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
