"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { acceptInvite } from "../actions";

export function AcceptForm({
  token,
  name,
  businessName,
  roleLabel,
}: {
  token: string;
  name: string;
  businessName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const passOk = isPasswordValid(next);
  const matchOk = confirm.length > 0 && next === confirm;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passOk || !matchOk) return;
    start(async () => {
      const res = await acceptInvite(token, next, confirm);
      if (res.ok) {
        toast.success("Conta criada! Agora é só entrar.");
        router.push("/login");
      } else {
        toast.error(res.error ?? "Não foi possível concluir.");
      }
    });
  }

  return (
    <div>
      <h1 className="text-lg font-bold text-slate-900 mb-1">Olá, {name}!</h1>
      <p className="text-sm text-slate-500 mb-5">
        Você foi convidado para o atendimento de{" "}
        <span className="font-semibold text-slate-700">{businessName}</span>
        {roleLabel ? ` como ${roleLabel}` : ""}. Crie uma senha pra entrar.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Nova senha</Label>
          <PasswordInput
            name="next"
            placeholder="Sua senha"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(next);
              return (
                <li
                  key={r.key}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    ok ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {ok ? <Check size={12} /> : <X size={12} />} {r.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="grid gap-2">
          <Label>Confirmar senha</Label>
          <PasswordInput
            name="confirm"
            placeholder="Repita a senha"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {confirm.length > 0 && !matchOk && (
            <p className="text-[11px] text-red-500">As senhas não coincidem</p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={pending || !passOk || !matchOk}
        >
          Criar senha e entrar
        </Button>
      </form>
    </div>
  );
}
