"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteCourse, toggleCourse, upsertCourse } from "../actions";
import { groupCourses, type Course } from "@/lib/knowledge-base";

const DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};

const EMPTY: Course = {
  nome: "",
  status: "confirmar_com_equipe",
  categoria: "",
  ativo: true,
};

export function KnowledgeManager({ courses }: { courses: Course[] }) {
  const groups = groupCourses(courses);
  const categorias = useMemo(
    () => Array.from(new Set(courses.map((c) => c.categoria).filter(Boolean))),
    [courses],
  );
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ course: Course; isNew: boolean } | null>(
    null,
  );

  function info(c: Course): string {
    const parts = [c.categoria || "Geral"];
    if (c.status === "confirmado" && c.valor) parts.push(c.valor);
    if (c.observacao) parts.push(c.observacao);
    return parts.join(" · ");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await upsertCourse(fd);
      setEditing(null);
    });
  }

  return (
    <div>
      <button
        onClick={() => setEditing({ course: { ...EMPTY }, isNew: true })}
        className="text-sm font-medium px-3 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-1.5 mb-5"
      >
        <Plus size={16} /> Adicionar item
      </button>

      {groups.length === 0 && (
        <p className="text-sm text-slate-400">
          Nenhum item cadastrado. Clique em “Adicionar item”.
        </p>
      )}

      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${DOT[g.cor]}`} />
              <h3 className="text-sm font-semibold text-slate-700">{g.label}</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {g.itens.map((c, i) => (
                <div
                  key={c.nome}
                  className={`px-4 py-3 flex items-center gap-3 ${
                    i < g.itens.length - 1 ? "border-b border-slate-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {c.nome}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {info(c)}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing({ course: c, isNew: false })}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => start(() => toggleCourse(c.nome))}
                    disabled={pending}
                    aria-label={c.ativo ? "Desativar" : "Ativar"}
                    className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                      c.ativo
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-200 justify-start"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">
                {editing.isNew ? "Adicionar item" : "Editar item"}
              </h3>
              <button onClick={() => setEditing(null)} aria-label="Fechar">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="hidden"
                name="originalNome"
                defaultValue={editing.isNew ? "" : editing.course.nome}
              />
              <Field label="Nome">
                <input
                  name="nome"
                  required
                  defaultValue={editing.course.nome}
                  placeholder="Ex.: Cimento CP-II 50kg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoria">
                  <input
                    name="categoria"
                    list="categorias"
                    defaultValue={editing.course.categoria}
                    placeholder="Ex.: Materiais"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                  <datalist id="categorias">
                    {categorias.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Status">
                  <select
                    name="status"
                    defaultValue={editing.course.status}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                  >
                    <option value="confirmar_com_equipe">A confirmar</option>
                    <option value="confirmado">Confirmado</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço (só se confirmado)">
                  <input
                    name="valor"
                    defaultValue={editing.course.valor ?? ""}
                    placeholder="R$ 39,90"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </Field>
                <Field label="Detalhe">
                  <input
                    name="cargaHoraria"
                    defaultValue={editing.course.cargaHoraria ?? ""}
                    placeholder="Ex.: em estoque"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                  />
                </Field>
              </div>
              <Field label="Observação">
                <input
                  name="observacao"
                  defaultValue={editing.course.observacao ?? ""}
                  placeholder="entrega em 24h"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked={editing.course.ativo}
                  className="w-4 h-4 accent-emerald-500"
                />
                Ativo (a IA responde sobre ele)
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  Salvar
                </button>
                {!editing.isNew && (
                  <button
                    type="button"
                    onClick={() =>
                      start(async () => {
                        await deleteCourse(editing.course.nome);
                        setEditing(null);
                      })
                    }
                    className="px-3 py-2.5 rounded-xl text-red-600 text-sm font-medium flex items-center gap-1.5 ml-auto"
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
