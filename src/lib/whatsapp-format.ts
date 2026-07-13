/**
 * Formatação de texto igual o WhatsApp reconhece de verdade: *negrito*,
 * _itálico_, ~riscado~ e ```monoespaçado```. Nada de listas/citação: o
 * WhatsApp não renderiza isso, ficaria só texto com traço na frente.
 */

export interface FormatResult {
  value: string;
  selStart: number;
  selEnd: number;
}

/** Envolve a seleção com o marcador; se já estiver envolvida, desfaz. */
export function toggleWrap(
  value: string,
  start: number,
  end: number,
  marker: string,
): FormatResult {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  const alreadyWrapped = before.endsWith(marker) && after.startsWith(marker);

  if (alreadyWrapped) {
    const newValue =
      before.slice(0, before.length - marker.length) +
      selected +
      after.slice(marker.length);
    return {
      value: newValue,
      selStart: start - marker.length,
      selEnd: end - marker.length,
    };
  }

  const placeholder = selected || "texto";
  const newValue = `${before}${marker}${placeholder}${marker}${after}`;
  const selStart = start + marker.length;
  return { value: newValue, selStart, selEnd: selStart + placeholder.length };
}
