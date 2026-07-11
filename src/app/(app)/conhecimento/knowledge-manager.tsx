"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  const [status, setStatus] = useState<Course["status"]>("confirmar_com_equipe");

  function openEdit(course: Course, isNew: boolean) {
    setStatus(course.status);
    setEditing({ course, isNew });
  }

  function info(c: Course): string {
    const parts = [c.categoria || "Geral"];
    if (c.status === "confirmado" && c.valor) parts.push(c.valor);
    if (c.observacao) parts.push(c.observacao);
    return parts.join(" · ");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("status", status);
    start(async () => {
      await upsertCourse(fd);
      setEditing(null);
    });
  }

  return (
    <div>
      <Button className="mb-5" onClick={() => openEdit({ ...EMPTY }, true)}>
        <Plus /> Adicionar item
      </Button>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
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
            <Card className="p-0 gap-0 overflow-hidden">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-slate-400"
                    onClick={() => openEdit(c, false)}
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </Button>
                  <Switch
                    checked={c.ativo}
                    disabled={pending}
                    onCheckedChange={() => start(() => toggleCourse(c.nome))}
                    aria-label={c.ativo ? "Desativar" : "Ativar"}
                  />
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? "Adicionar item" : "Editar item"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="hidden"
                name="originalNome"
                defaultValue={editing.isNew ? "" : editing.course.nome}
              />
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  name="nome"
                  required
                  defaultValue={editing.course.nome}
                  placeholder="Ex.: Cimento CP-II 50kg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    name="categoria"
                    list="categorias"
                    defaultValue={editing.course.categoria}
                    placeholder="Ex.: Materiais"
                  />
                  <datalist id="categorias">
                    {categorias.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as Course["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmar_com_equipe">
                        A confirmar
                      </SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="valor">Preço (só se confirmado)</Label>
                  <Input
                    id="valor"
                    name="valor"
                    defaultValue={editing.course.valor ?? ""}
                    placeholder="R$ 39,90"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cargaHoraria">Detalhe</Label>
                  <Input
                    id="cargaHoraria"
                    name="cargaHoraria"
                    defaultValue={editing.course.cargaHoraria ?? ""}
                    placeholder="Ex.: em estoque"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  name="observacao"
                  defaultValue={editing.course.observacao ?? ""}
                  placeholder="entrega em 24h"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Switch name="ativo" defaultChecked={editing.course.ativo} />
                Ativo (a IA responde sobre ele)
              </label>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={pending}>
                  Salvar
                </Button>
                {!editing.isNew && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 ml-auto"
                    onClick={() =>
                      start(async () => {
                        await deleteCourse(editing.course.nome);
                        setEditing(null);
                      })
                    }
                  >
                    <Trash2 size={15} /> Excluir
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
