"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2 } from "lucide-react";

type Bubble = { from: "them" | "bot"; text: string };

const SCRIPT: Bubble[] = [
  { from: "them", text: "Oi! Vocês têm horário pra amanhã de manhã?" },
  {
    from: "bot",
    text: "Oi! 😊 Temos sim, o horário das 10h está livre. Quer que eu reserve pra você?",
  },
  { from: "them", text: "Quero sim! Quanto custa a consulta?" },
  {
    from: "bot",
    text: "Deixa eu confirmar certinho com a equipe pra não te passar nada errado. Já te retorno! 🙌",
  },
];

const TYPING_MS = 1100;
const READ_MS = 2200;
const LOOP_PAUSE_MS = 2600;

export function HeroChatDemo() {
  const [shown, setShown] = useState(0); // quantas bolhas já apareceram
  const [typing, setTyping] = useState<"them" | "bot" | null>("them");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function step(i: number) {
      if (cancelled) return;
      if (i >= SCRIPT.length) {
        timer = setTimeout(() => {
          if (cancelled) return;
          setShown(0);
          setTyping(SCRIPT[0].from);
          step(0);
        }, LOOP_PAUSE_MS);
        return;
      }
      setTyping(SCRIPT[i].from);
      timer = setTimeout(() => {
        if (cancelled) return;
        setTyping(null);
        setShown(i + 1);
        timer = setTimeout(() => step(i + 1), READ_MS);
      }, TYPING_MS);
    }

    step(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const leadCaptured = shown >= SCRIPT.length;

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* blobs decorativos */}
      <div className="absolute -top-10 -right-8 w-40 h-40 bg-emerald-200/50 rounded-full blur-3xl animate-blob" />
      <div
        className="absolute -bottom-8 -left-10 w-40 h-40 bg-sky-200/40 rounded-full blur-3xl animate-blob"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-white">
          <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Bot size={16} className="text-white" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">
              Atendimento
            </div>
            <div className="text-[11px] text-emerald-600">online</div>
          </div>
        </div>

        <div className="min-h-80 flex flex-col justify-end gap-2 p-4 bg-[#e5ddd5]">
          {SCRIPT.slice(0, shown).map((m, i) => (
            <div
              key={i}
              className={`flex animate-bubble-in ${m.from === "bot" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                  m.from === "bot"
                    ? "bg-emerald-500 text-white rounded-tr-none"
                    : "bg-white text-slate-700 rounded-tl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {typing && (
            <div
              className={`flex animate-bubble-in ${typing === "bot" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2.5 shadow-sm flex items-center gap-1 ${
                  typing === "bot" ? "bg-emerald-500" : "bg-white"
                }`}
              >
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className={`w-1.5 h-1.5 rounded-full animate-dot-bounce ${
                      typing === "bot" ? "bg-white" : "bg-slate-400"
                    }`}
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {leadCaptured && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white border border-emerald-200 shadow-lg rounded-full px-3.5 py-2 text-xs font-semibold text-emerald-700 animate-bubble-in">
          <CheckCircle2 size={14} className="text-emerald-500" /> Lead capturado
          automaticamente
        </div>
      )}
    </div>
  );
}
