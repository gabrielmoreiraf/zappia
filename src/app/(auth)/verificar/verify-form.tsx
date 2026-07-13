"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resendCode, verifyEmail } from "../actions";

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? "" : x)));
      return;
    }
    const chars = clean.split("");
    setDigits((d) => {
      const nextDigits = [...d];
      let idx = i;
      for (const c of chars) {
        if (idx > 5) break;
        nextDigits[idx] = c;
        idx++;
      }
      refs.current[Math.min(idx, 5)]?.focus();
      return nextDigits;
    });
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await verifyEmail(email, code);
      if (!res.ok) {
        setError(res.error ?? "Não foi possível verificar.");
        return;
      }
      // Cadastro é um fluxo só: loga automaticamente e continua (o layout
      // do painel manda pro onboarding sozinho). Só cai no /login se o
      // login automático falhar por algum motivo.
      if (res.userId && res.autoLoginToken) {
        const signInRes = await signIn("signup-auto", {
          userId: res.userId,
          token: res.autoLoginToken,
          redirect: false,
        });
        if (!signInRes?.error) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }
      router.push("/login?verified=1");
    });
  }

  function resend() {
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await resendCode(email);
      setInfo(res.ok ? "Novo código enviado!" : null);
      if (!res.ok) setError(res.error ?? "Falha ao reenviar.");
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <h2 className="font-bold text-slate-900">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          Enviamos um código de 6 dígitos para
          <br />
          <span className="font-medium text-slate-700">
            {email || "seu e-mail"}
          </span>
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {info}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="flex justify-center gap-2 mb-5">
            {digits.map((d, i) => (
              <Input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                maxLength={i === 0 ? 6 : 1}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold"
              />
            ))}
          </div>
          <Button
            type="submit"
            disabled={pending || code.length !== 6}
            className="w-full"
          >
            {pending ? "Verificando…" : "Verificar"}
          </Button>
        </form>

        <Button
          variant="link"
          onClick={resend}
          disabled={pending}
          className="text-emerald-600 mt-3"
        >
          Reenviar código
        </Button>
      </CardContent>
    </Card>
  );
}
