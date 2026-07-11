"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initials, timeShort } from "@/lib/format";
import { CONV_STATUS } from "../ui";
import { ChatPanel, type ChatMessage } from "./chat-panel";

type ConvStatus = "ia" | "novo" | "voce";

export interface LiveConvItem {
  id: string;
  contactName: string | null;
  status: ConvStatus;
  lastMessageAt: string | Date;
  lastMessage: { text: string; isAudio: boolean } | null;
}

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
}: {
  initialConvos: LiveConvItem[];
  initialThread: LiveThread | null;
  selectedId: string | null;
  q: string;
}) {
  const [convos, setConvos] = useState(initialConvos);
  const [thread, setThread] = useState(initialThread);

  const refetch = useCallback(async () => {
    try {
      const url = new URL("/api/conversas", window.location.origin);
      if (selectedId) url.searchParams.set("c", selectedId);
      if (q) url.searchParams.set("q", q);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        convos: LiveConvItem[];
        thread: LiveThread | null;
      };
      setConvos(data.convos);
      setThread(data.thread);
    } catch {
      // silencioso — tenta de novo no próximo ciclo
    }
  }, [selectedId, q]);

  useEffect(() => {
    const id = setInterval(refetch, POLL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  const term = q.trim().toLowerCase();

  const List = (
    <Card
      className={`p-0 gap-0 overflow-hidden md:w-80 md:shrink-0 flex flex-col min-h-0 ${
        thread ? "hidden md:flex" : "flex"
      }`}
    >
      <form
        action="/conversas"
        className="p-3 border-b border-slate-100 shrink-0"
      >
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar conversa"
            className="pl-9 h-9"
          />
        </div>
      </form>
      <div className="flex-1 min-h-0 overflow-y-auto">
      {convos.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          {term
            ? "Nenhuma conversa encontrada."
            : "Nenhuma conversa ainda. Elas aparecem aqui automaticamente quando alguém chama seu WhatsApp."}
        </p>
      ) : (
        convos.map((c) => {
          const st = CONV_STATUS[c.status];
          const on = selectedId === c.id;
          const preview = c.lastMessage?.text ?? "—";
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
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}
                  >
                    {st.label}
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
