"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
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
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium px-3 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-1.5 mb-5"
      >
        <Plus size={16} /> Novo cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Novo cliente</h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Nome do cliente">
                <input
                  name="name"
                  required
                  placeholder="Ex.: Gabriel — Depósito"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </Field>
              <Field label="O que o negócio faz">
                <textarea
                  name="businessDescription"
                  rows={2}
                  placeholder="Ex.: Depósito de materiais de construção."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none resize-none"
                />
              </Field>
              <Field label="Nome do assistente">
                <input
                  name="assistantName"
                  placeholder="Atendimento"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plano">
                  <select
                    name="plan"
                    defaultValue="start"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                  >
                    <option value="start">Start</option>
                    <option value="pro">Pro</option>
                  </select>
                </Field>
                <Field label="Mensalidade (R$)">
                  <input
                    name="monthlyFee"
                    inputMode="decimal"
                    placeholder="250"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </Field>
              </div>
              <p className="text-xs text-slate-400">
                A conexão do WhatsApp e a base de cursos são configuradas depois, no
                painel do cliente.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {pending ? "Criando…" : "Criar cliente"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
