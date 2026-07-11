import crypto from "node:crypto";
import { env } from "./env";

const GRAPH = "https://graph.facebook.com";
const VERSION = "v21.0";

/**
 * Valida a assinatura X-Hub-Signature-256 do webhook (HMAC-SHA256 do corpo cru
 * com o App Secret). Comparação em tempo constante.
 */
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", env.whatsappAppSecret)
      .update(rawBody, "utf8")
      .digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Passo 3 do pipeline: resolve a URL temporária de uma mídia pelo id. */
export async function getMediaUrl(mediaId: string): Promise<string> {
  const r = await fetch(`${GRAPH}/${VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.whatsappToken}` },
  });
  if (!r.ok) throw new Error(`getMediaUrl ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { url: string };
  return j.url;
}

/** Baixa os bytes da mídia (precisa do token no header). */
export async function downloadMedia(url: string): Promise<Buffer> {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${env.whatsappToken}` },
  });
  if (!r.ok) throw new Error(`downloadMedia ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Passo 9 do pipeline: envia a resposta de texto ao cliente final. */
export async function sendText(
  phoneNumberId: string,
  to: string,
  body: string,
): Promise<void> {
  const r = await fetch(`${GRAPH}/${VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!r.ok) throw new Error(`sendText ${r.status}: ${await r.text()}`);
}
