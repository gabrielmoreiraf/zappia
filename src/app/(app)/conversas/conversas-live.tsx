"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Mic, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initials, timeShort } from "@/lib/format";
import { CONV_STATUS } from "../ui";
import { ChatPanel, type ChatMessage, type QuickReplyItem } from "./chat-panel";

type ConvStatus = "ia" | "novo" | "voce";

export interface ConvStatusCounts {
  total: number;
  ia: number;
  novo: number;
  voce: number;
  foraDoHorario: number;
}

export interface LiveConvItem {
  id: string;
  contactName: string | null;
  status: ConvStatus;
  lastMessageAt: string | Date;
  outOfHoursNotified: boolean;
  lastMessage: { text: string; isAudio: boolean } | null;
}

const FILTERS: {
  key: string;
  label: string;
  countKey: keyof ConvStatusCounts;
  activeCls: string;
  idleCls: string;
}[] = [
  {
    key: "",
    label: "Todas",
    countKey: "total",
    activeCls: "bg-slate-800 text-white",
    idleCls: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  },
  {
    key: "ia",
    label: "IA",
    countKey: "ia",
    activeCls: "bg-emerald-600 text-white",
    idleCls: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    key: "novo",
    label: "Aguardando você",
    countKey: "novo",
    activeCls: "bg-amber-500 text-white",
    idleCls: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    key: "voce",
    label: "Você atendendo",
    countKey: "voce",
    activeCls: "bg-sky-600 text-white",
    idleCls: "bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  {
    key: "fora",
    label: "Fora do horário",
    countKey: "foraDoHorario",
    activeCls: "bg-red-600 text-white",
    idleCls: "bg-red-50 text-red-600 hover:bg-red-100",
  },
];

export interface LiveThread {
  conversation: { id: string; contactName: string | null; status: ConvStatus };
  messages: ChatMessage[];
}

const POLL_MS = 3000;

export function ConversasLive({
  initialConvos,
  initialThread,
  selectedId,
  q,
  st,
  counts: initialCounts,
  quickReplies,
}: {
  initialConvos: LiveConvItem[];
  initialThread: LiveThread | null;
  selectedId: string | null;
  q: string;
  st: string;
  counts: ConvStatusCounts;
  quickReplies: QuickReplyItem[];
}) {
  const [convos, setConvos] = useState(initialConvos);
  const [thread, setThread] = useState(initialThread);
  const [counts, setCounts] = useState(initialCounts);
  // Busca é 100% no cliente sobre a lista já carregada: atualiza a cada
  // tecla e volta a mostrar tudo assim que o campo é apagado, sem depender
  // de round-trip de rede nem de dar Enter.
  const [searchTerm, setSearchTerm] = useState(q);

  const refetch = useCallback(async () => {
    try {
      const url = new URL("/api/conversas", window.location.origin);
      if (selectedId) url.searchParams.set("c", selectedId);
      if (st) url.searchParams.set("st", st);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        convos: LiveConvItem[];
        thread: LiveThread | null;
        counts: ConvStatusCounts;
      };
      setConvos(data.convos);
      setThread(data.thread);
      setCounts(data.counts);
    } catch {
      // silencioso, tenta de novo no próximo ciclo
    }
  }, [selectedId, st]);

  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  const term = searchTerm.trim().toLowerCase();
  const visibleConvos = useMemo(
    () =>
      term
        ? convos.filter((c) => (c.contactName ?? "").toLowerCase().includes(term))
        : convos,
    [convos, term],
  );

  const List = (
    <Card
      className={`p-0 gap-0 overflow-hidden md:w-80 md:shrink-0 flex flex-col min-h-0 ${
        thread ? "hidden md:flex" : "flex"
      }`}
    >
      <div className="p-3 border-b border-slate-100 shrink-0">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversa"
            className="pl-9 h-9"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-slate-100 shrink-0">
        {FILTERS.map((f) => {
          const on = (st || "") === f.key;
          const href = `/conversas?st=${f.key}`;
          return (
            <Link
              key={f.key || "todas"}
              href={href}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                on ? f.activeCls : f.idleCls
              }`}
            >
              {f.label} · {counts[f.countKey]}
            </Link>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
      {visibleConvos.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          {term
            ? "Nenhuma conversa encontrada."
            : "Nenhuma conversa ainda. Elas aparecem aqui automaticamente quando alguém chama seu WhatsApp."}
        </p>
      ) : (
        visibleConvos.map((c) => {
          const statusInfo = CONV_STATUS[c.status];
          const on = selectedId === c.id;
          const preview = c.lastMessage?.text ?? "-";
          return (
            <Link
              key={c.id}
              href={`/conversas?c=${c.id}`}
              className={`w-full text-left px-3 py-3 flex gap-3 border-b border-slate-50 ${
                on ? "bg-emerald-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold shrink-0">
                {initials(c.contactName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {c.contactName ?? "Contato"}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {timeShort(new Date(c.lastMessageAt))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                    {c.lastMessage?.isAudio && (
                      <Mic size={12} className="text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">{preview}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {c.outOfHoursNotified && (
                      <Clock
                        size={12}
                        className="text-amber-500"
                        aria-label="Falou fora do horário"
                      />
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusInfo.cls}`}
                    >
                      {statusInfo.label}
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })
      )}
      </div>
    </Card>
  );

  const Chat = thread ? (
    <div className="flex-1 flex min-h-0">
      <ChatPanel
        conversation={thread.conversation}
        messages={thread.messages}
        quickReplies={quickReplies}
        onChanged={refetch}
      />
    </div>
  ) : (
    <Card className="hidden md:flex flex-1 items-center justify-center text-sm text-slate-400">
      Selecione uma conversa
    </Card>
  );

  return (
    <div className="flex gap-4 flex-1 min-h-0 mt-1">
      {List}
      {Chat}
    </div>
  );
}
