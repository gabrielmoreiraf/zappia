import { Fragment } from "react";

// *negrito*, _itálico_, ~riscado~, ```monoespaçado``` (nessa ordem de teste,
// pra "```" não ser lido como três marcadores soltos).
const TOKEN_RE = /(```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

/** Mostra o texto igual o WhatsApp renderiza: negrito, itálico, riscado e monoespaçado. */
export function WhatsappText({ text }: { text: string }) {
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("```") && part.endsWith("```") && part.length >= 6) {
          return (
            <code key={i} className="font-mono text-[0.9em] bg-black/10 rounded px-1">
              {part.slice(3, -3)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
          return <strong key={i}>{part.slice(1, -1)}</strong>;
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length >= 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("~") && part.endsWith("~") && part.length >= 2) {
          return <del key={i}>{part.slice(1, -1)}</del>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
