"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dayLabel, initials } from "@/lib/format";
import type { Lead } from "@/db/schema";
import { LeadStatusSelect } from "./lead-status-select";

const CHANNEL_LABEL: Record<string, string> = {
  anuncio: "Anúncio",
  organico: "Orgânico",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function LeadsList({
  rows,
  status,
  emptyMessage,
}: {
  rows: Lead[];
  status?: string;
  emptyMessage: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  // Muda de filtro (menos linhas) → volta pra página 1 pra não ficar numa
  // página vazia.
  useEffect(() => setPage(0), [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => rows.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [rows, currentPage, pageSize],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  // "Selecionar todos" cobre todos os leads do filtro atual, não só a página
  // visível — assim dá pra exportar um lote grande sem clicar página por página.
  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }
  function changePageSize(v: string) {
    setPageSize(Number(v));
    setPage(0);
  }

  const exportHref = useMemo(() => {
    if (selected.size > 0) {
      return `/api/leads/export?ids=${Array.from(selected).join(",")}`;
    }
    return status ? `/api/leads/export?st=${status}` : "/api/leads/export";
  }, [selected, status]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const rangeStart = rows.length === 0 ? 0 : currentPage * pageSize + 1;
  const rangeEnd = Math.min(rows.length, (currentPage + 1) * pageSize);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-2 h-8 shrink-0">
        {rows.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-slate-300 accent-emerald-600"
            />
            {selected.size > 0
              ? `${selected.size} selecionado${selected.size === 1 ? "" : "s"}`
              : "Selecionar todos"}
          </label>
        )}
        <Button asChild size="sm" className="ml-auto">
          <a href={exportHref}>
            <Download /> Exportar{selected.size > 0 ? ` (${selected.size})` : ""}
          </a>
        </Button>
      </div>

      <Card className="p-0 gap-0 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            pageRows.map((l, i) => (
              <div
                key={l.id}
                className={`px-4 py-3 flex items-center gap-3 ${
                  i < pageRows.length - 1 ? "border-b border-slate-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                  className="rounded border-slate-300 accent-emerald-600 shrink-0"
                  aria-label={`Selecionar ${l.contactName ?? "contato"}`}
                />
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(l.contactName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {l.contactName ?? "Contato"}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {l.courseInterest ?? "-"}
                  </div>
                </div>
                <div className="text-xs text-slate-400 w-20 hidden sm:block">
                  {CHANNEL_LABEL[l.channel]}
                </div>
                <LeadStatusSelect leadId={l.id} status={l.status} />
                <div className="text-xs text-slate-400 w-14 text-right hidden sm:block">
                  {dayLabel(new Date(l.createdAt))}
                </div>
              </div>
            ))
          )}
        </div>

        {rows.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Ver por página</span>
              <Select value={String(pageSize)} onValueChange={changePageSize}>
                <SelectTrigger className="h-7 w-[4.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span>
                {rangeStart}–{rangeEnd} de {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={currentPage === 0}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="px-1">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
