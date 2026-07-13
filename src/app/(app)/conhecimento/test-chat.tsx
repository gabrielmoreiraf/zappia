"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testAssistant } from "../actions";
import type { HistoryTurn } from "@/lib/ai/haiku";

interface Msg {
  from: "them" | "bot";
  text: string;
}

const SUGESTOES = [
  "Oi, o que vocês oferecem?",
  "Quanto custa?",
  "Vocês têm isso disponível agora?",
];

export function TestChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, pending]);

  function send(textArg?: string) {
    const text = (textArg ?? draft).trim();
    if (!text || pending) return;
    const next: Msg[] = [...msgs, { from: "them", text }];
    setMsgs(next);
    setDraft("");
    start(async () => {
      const history: HistoryTurn[] = next.map((m) => ({ from: m.from, text: m.text }));
      const res = await testAssistant(history);
      setMsgs((cur) => [...cur, { from: "bot", text: res.reply || "(sem resposta)" }]);
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bot size={18} className="text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-800">Teste sua IA</h3>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Pergunte algo e veja como ela responde com o que já sabe
        </span>
        {msgs.length > 0 && (
          <button
            onClick={() => setMsgs([])}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <RotateCcw size={12} /> limpar
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="rounded-xl bg-slate-50 border border-slate-100 p-3 h-56 overflow-y-auto space-y-2"
      >
        {msgs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-slate-400">
              Faça uma pergunta como se fosse um cliente.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "them" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.from === "them"
                  ? "bg-sky-500 text-white rounded-br-sm"
                  : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 text-slate-400 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">
              digitando…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 mt-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma pergunta de teste…"
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={pending || !draft.trim()}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
