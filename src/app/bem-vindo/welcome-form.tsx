"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOwnBusiness } from "./actions";

export function WelcomeForm({ firstName }: { firstName: string }) {
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createOwnBusiness(fd);
      if (res && !res.ok) toast.error(res.error ?? "Não foi possível continuar.");
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-slate-900">
            Bem-vindo{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vamos configurar o atendente de IA do seu negócio.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="businessName">Nome do seu negócio</Label>
            <Input
              id="businessName"
              name="businessName"
              required
              placeholder="Ex.: Clínica Bem Estar"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="segment">Qual a área da sua empresa?</Label>
            <Input
              id="segment"
              name="segment"
              required
              placeholder="Ex.: Clínica, Depósito, Loja de roupas…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="about">
              O que seu negócio faz e o que a IA precisa saber pra atender?
            </Label>
            <Textarea
              id="about"
              name="about"
              rows={4}
              placeholder="Ex.: Atendemos consultas de clínica geral e exames. Horário de seg a sex, 8h às 18h. A IA deve tirar dúvidas e encaminhar agendamentos pra equipe."
            />
            <p className="text-xs text-muted-foreground">
              Depois você adiciona produtos, serviços e preços na Base de conhecimento.
            </p>
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando…" : "Começar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
