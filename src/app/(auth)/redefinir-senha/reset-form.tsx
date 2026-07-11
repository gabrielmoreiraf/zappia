"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { resetPassword } from "../actions";

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ruleState = useMemo(
    () => PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) })),
    [password],
  );
  const passOk = isPasswordValid(password);
  const matchOk = confirm.length > 0 && password === confirm;
  const canSubmit = code.length === 6 && passOk && matchOk;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    start(async () => {
      const res = await resetPassword(email, code, password, confirm);
      if (res.ok) router.push("/login?reset=1");
      else setError(res.error ?? "Não foi possível redefinir.");
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-bold text-slate-900 text-center">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-5">
          Código enviado para{" "}
          <span className="font-medium text-slate-700">{email || "seu e-mail"}</span>
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="tracking-[0.4em] text-center font-bold"
            />
          </div>

          <PasswordInput
            name="password"
            placeholder="Nova senha"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 py-1">
            {ruleState.map((r) => (
              <li
                key={r.label}
                className={`flex items-center gap-1.5 text-[11px] ${
                  r.ok ? "text-emerald-600" : "text-muted-foreground"
                }`}
              >
                {r.ok ? <Check size={12} /> : <X size={12} />} {r.label}
              </li>
            ))}
          </ul>

          <PasswordInput
            name="confirm"
            placeholder="Confirmar nova senha"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {confirm.length > 0 && !matchOk && (
            <p className="text-[11px] text-red-500">As senhas não coincidem</p>
          )}

          <Button type="submit" disabled={pending || !canSubmit} className="w-full">
            {pending ? "Redefinindo…" : "Redefinir senha"}
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
