"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  const [viewing, setViewing] = useState<Course | null>(null);

  function openEdit(course: Course, isNew: boolean) {
    setStatus(course.status);
    setEditing({ course, isNew });
  }

  function info(c: Course): string {
    const parts = [c.categoria || "Geral"];
    if (c.status === "confirmado" && c.valor) parts.push(c.valor);
    if (c.descricao) parts.push(c.descricao.split("\n")[0]);
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800">
          O que sua IA já sabe
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEdit({ ...EMPTY }, true)}
        >
          <Plus size={15} /> Adicionar manual
        </Button>
      </div>

      {groups.length === 0 && (
        <Card className="p-6 text-center gap-1">
          <p className="text-sm font-medium text-slate-700">
            Sua base está vazia
          </p>
          <p className="text-sm text-muted-foreground">
            Descreva seu negócio no campo acima e deixe a IA montar, ou clique em
            “Adicionar manual”.
          </p>
        </Card>
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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {c.nome}
                      </span>
                      {c.origem === "ia" && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
                          <Sparkles size={10} /> IA
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {info(c)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-slate-400"
                    onClick={() => setViewing(c)}
                    aria-label="Ver"
                  >
                    <Eye size={15} />
                  </Button>
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
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? "Adicionar item" : "Editar item"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Cada item vira um pedaço da base que a IA usa pra responder. Quanto
              mais você explicar, melhor ela conduz a conversa.
            </p>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="space-y-4">
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
                  className="text-base"
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
              <div className="grid gap-2">
                <Label htmlFor="valor">Preço (opcional)</Label>
                <Input
                  id="valor"
                  name="valor"
                  defaultValue={editing.course.valor ?? ""}
                  placeholder="R$ 39,90"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco se esse item não tiver preço fixo ou se for
                  sempre consultado com a equipe. A IA nunca inventa um valor.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">
                  O que a IA deve saber e como falar sobre isso
                </Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  rows={6}
                  defaultValue={editing.course.descricao ?? ""}
                  placeholder={
                    'Explique com suas palavras, como se fosse treinar um atendente novo. Ex.: "Cimento de uso geral, ideal pra estrutura e alvenaria. Aguenta sol e chuva no estoque. Se perguntarem sobre frete, avisa que calculamos pelo CEP. Não vendemos menos de um saco."'
                  }
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Pode escrever várias frases: detalhes, como apresentar, o que
                  perguntar de volta, restrições. A IA só afirma como fato o que
                  estiver escrito aqui.
                </p>
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

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {viewing.nome}
                  {viewing.origem === "ia" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
                      <Sparkles size={10} /> IA
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    {viewing.categoria || "Geral"}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      viewing.status === "confirmado"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {viewing.status === "confirmado" ? "Confirmado" : "A confirmar"}
                  </span>
                  {viewing.valor && (
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                      {viewing.valor}
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      viewing.ativo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {viewing.ativo ? "Ativo" : "Desativado"}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    O que a IA sabe
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {viewing.descricao || "Nada além do nome e categoria."}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const c = viewing;
                    setViewing(null);
                    openEdit(c, false);
                  }}
                >
                  <Pencil size={14} /> Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
