"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "../actions";

export function ForgotForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    start(async () => {
      const res = await requestPasswordReset(email);
      if (res.ok) {
        router.push(`/redefinir-senha?email=${encodeURIComponent(email)}`);
      } else {
        setError(res.error ?? "Não foi possível continuar.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-bold text-slate-900 text-center">Esqueci minha senha</h2>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-5">
          Digite seu e-mail e enviamos um código para redefinir.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            name="email"
            type="email"
            required
            placeholder="seu@email.com"
            autoComplete="email"
          />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando…" : "Enviar código"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-5 text-center">
          <Link href="/login" className="text-emerald-600 font-medium">
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
