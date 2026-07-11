"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Mic, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assumirConversa, sendReply } from "../actions";
import { initials, timeShort } from "@/lib/format";

export interface ChatMessage {
  id: string;
  from: "them" | "bot" | "you";
  text: string;
  isAudio: boolean;
  createdAt: string | Date;
}

export interface ChatConversation {
  id: string;
  contactName: string | null;
  status: "ia" | "novo" | "voce";
}

export function ChatPanel({
  conversation,
  messages,
}: {
  conversation: ChatConversation;
  messages: ChatMessage[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState("");

  const statusLine =
    conversation.status === "voce"
      ? "Você está atendendo"
      : conversation.status === "novo"
        ? "Encaminhada pra você"
        : "IA respondendo";

  function assumir() {
    start(() => assumirConversa(conversation.id));
  }
  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    start(() => sendReply(conversation.id, text));
  }

  return (
    <div
      className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden"
      style={{ minHeight: 520 }}
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            className="md:hidden"
            onClick={() => router.push("/conversas")}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold">
            {initials(conversation.contactName)}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {conversation.contactName ?? "Contato"}
            </div>
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <Bot size={12} /> {statusLine}
            </div>
          </div>
        </div>
        {conversation.status !== "voce" && (
          <Button
            onClick={assumir}
            disabled={pending}
            size="sm"
            className="bg-sky-50 text-sky-700 hover:bg-sky-100"
          >
            <Users size={13} /> Assumir
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((m) => {
          const mine = m.from === "bot" || m.from === "you";
          const isYou = m.from === "you";
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                  isYou
                    ? "bg-sky-500 text-white"
                    : mine
                      ? "bg-emerald-500 text-white"
                      : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                {m.isAudio && (
                  <div
                    className={`flex items-center gap-1.5 mb-1 text-[11px] ${
                      mine ? "text-emerald-50" : "text-emerald-600"
                    }`}
                  >
                    <Mic size={12} /> áudio transcrito
                  </div>
                )}
                {isYou && (
                  <div className="text-[11px] text-sky-100 mb-0.5">Você</div>
                )}
                {m.text}
                <div
                  className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"}`}
                >
                  {timeShort(new Date(m.createdAt))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={enviar}
        className="p-3 border-t border-slate-100 flex items-center gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva pra assumir a conversa…"
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending || !draft.trim()}
        >
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
}
