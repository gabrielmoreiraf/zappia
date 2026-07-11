"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { PasswordInput } from "../password-input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justVerified = params.get("verified") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    start(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("E-mail ou senha incorretos, ou conta não verificada.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-sm text-slate-500 text-center mb-5">
        Entre no painel do seu atendente.
      </p>

      {justVerified && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          E-mail verificado! Faça login pra continuar.
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
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
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-xs text-slate-400 mt-5 text-center">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-emerald-600 font-medium">
          Criar agora
        </Link>
      </p>
    </div>
  );
}
