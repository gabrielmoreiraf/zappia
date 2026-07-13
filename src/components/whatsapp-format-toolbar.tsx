"use client";

import type { RefObject } from "react";
import { Bold, Code, Italic, Strikethrough } from "lucide-react";
import { toggleWrap } from "@/lib/whatsapp-format";

const BUTTONS = [
  { key: "bold", icon: Bold, marker: "*", label: "Negrito" },
  { key: "italic", icon: Italic, marker: "_", label: "Itálico" },
  { key: "strike", icon: Strikethrough, marker: "~", label: "Riscado" },
  { key: "code", icon: Code, marker: "```", label: "Monoespaçado" },
] as const;

interface Target {
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
}

/** Barra de formatação igual o WhatsApp reconhece: negrito, itálico, riscado, monoespaçado. */
export function WhatsappFormatToolbar({
  value,
  onChange,
  targetRef,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  targetRef: RefObject<Target | null>;
  className?: string;
}) {
  function apply(marker: string) {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const result = toggleWrap(value, start, end, marker);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {BUTTONS.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={() => apply(b.marker)}
          aria-label={b.label}
          title={b.label}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <b.icon size={14} />
        </button>
      ))}
    </div>
  );
}
