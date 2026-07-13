"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { addCourses, proposeCoursesFromText } from "../actions";
import type { Course } from "@/lib/knowledge-base";

function meta(c: Course): string {
  const parts = [c.categoria || "Geral"];
  if (c.status === "confirmado" && c.valor) parts.push(c.valor);
  if (c.descricao) parts.push(c.descricao.split("\n")[0]);
  return parts.join(" · ");
}

export function SmartAdd() {
  const [text, setText] = useState("");
  const [proposed, setProposed] = useState<Course[] | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();

  function organizar() {
    const t = text.trim();
    if (!t) return;
    startAnalyze(async () => {
      const items = await proposeCoursesFromText(t);
      if (items.length === 0) {
        toast.error("Não achei itens nesse texto. Tente descrever os produtos ou serviços.");
        return;
      }
      setProposed(items);
    });
  }

  function salvar() {
    if (!proposed || proposed.length === 0) return;
    startSave(async () => {
      await addCourses(proposed);
      toast.success(
        `${proposed.length} ${proposed.length === 1 ? "item adicionado" : "itens adicionados"} à base.`,
      );
      setProposed(null);
      setText("");
    });
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={18} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-emerald-800">
          Deixe a IA montar a base pra você
        </h3>
      </div>
      <p className="text-[13px] text-slate-500 mb-3">
        Cole tudo o que você sabe do negócio, ou descreva com suas palavras. A IA
        separa em itens e você só confere.
      </p>
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: Vendo bolo de pote por R$ 12, sabor chocolate e morango. Também faço encomenda de bolo de aniversário sob consulta. Entrega em até 24h na região."
        className="bg-white"
      />
      <div className="mt-3">
        <Button
          onClick={organizar}
          disabled={analyzing || !text.trim()}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Wand2 size={15} />
          {analyzing ? "Organizando…" : "Organizar com IA"}
        </Button>
      </div>

      <Dialog open={!!proposed} onOpenChange={(o) => !o && setProposed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confira antes de adicionar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            A IA montou estes itens a partir do seu texto. Remova o que não quiser
            e depois adicione à base.
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {proposed?.map((c, i) => (
              <div
                key={`${c.nome}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {c.nome}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{meta(c)}</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProposed((p) => p?.filter((_, j) => j !== i) ?? null)
                  }
                  className="text-slate-400 hover:text-red-600"
                  aria-label="Remover"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {proposed?.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">
                Você removeu todos os itens.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProposed(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={saving || !proposed || proposed.length === 0}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving
                ? "Adicionando…"
                : `Adicionar ${proposed?.length ?? 0} ${
                    (proposed?.length ?? 0) === 1 ? "item" : "itens"
                  }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
