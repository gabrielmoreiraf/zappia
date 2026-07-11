"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { PasswordInput } from "../password-input";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { signUp } from "../actions";

export function SignupForm() {
  const router = useRouter();
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
  const canSubmit = passOk && matchOk;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await signUp(fd);
      if (res.ok) {
        const email = String(fd.get("email") ?? "");
        router.push(`/verificar?email=${encodeURIComponent(email)}`);
      } else {
        setError(res.error ?? "Não foi possível criar a conta.");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm text-slate-500 text-center mb-5">
        Crie sua conta no Zappia.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="name"
          required
          placeholder="Seu nome"
          autoComplete="name"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="seu@email.com"
          autoComplete="email"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400"
        />
        <PasswordInput
          name="password"
          placeholder="Senha"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />

        {/* checklist das regras */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 py-1">
          {ruleState.map((r) => (
            <li
              key={r.label}
              className={`flex items-center gap-1.5 text-[11px] ${
                r.ok ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {r.ok ? <Check size={12} /> : <X size={12} />} {r.label}
            </li>
          ))}
        </ul>

        <PasswordInput
          name="confirm"
          placeholder="Confirmar senha"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {confirm.length > 0 && (
          <p
            className={`text-[11px] flex items-center gap-1.5 ${
              matchOk ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {matchOk ? <Check size={12} /> : <X size={12} />}
            {matchOk ? "As senhas coincidem" : "As senhas não coincidem"}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {pending ? "Criando…" : "Criar conta"}
        </button>
      </form>

      <p className="text-xs text-slate-400 mt-5 text-center">
        Já tem conta?{" "}
        <Link href="/login" className="text-emerald-600 font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}
