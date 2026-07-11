"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      const next = [...d];
      let idx = i;
      for (const c of chars) {
        if (idx > 5) break;
        next[idx] = c;
        idx++;
      }
      const focus = Math.min(idx, 5);
      refs.current[focus]?.focus();
      return next;
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
      if (res.ok) {
        router.push("/login?verified=1");
      } else {
        setError(res.error ?? "Não foi possível verificar.");
      }
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
      <h2 className="font-bold text-slate-900">Confirme seu e-mail</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        Enviamos um código de 6 dígitos para
        <br />
        <span className="font-medium text-slate-700">{email || "seu e-mail"}</span>
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
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              maxLength={i === 0 ? 6 : 1}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-slate-200 outline-none focus:border-emerald-400"
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {pending ? "Verificando…" : "Verificar"}
        </button>
      </form>

      <button
        onClick={resend}
        disabled={pending}
        className="text-xs text-emerald-600 font-medium mt-4 disabled:opacity-50"
      >
        Reenviar código
      </button>
    </div>
  );
}
