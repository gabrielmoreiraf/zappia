import { processInbound, type InboundMessage } from "@/lib/pipeline";
import { verifySignature } from "@/lib/whatsapp";
import { sweepInactive } from "@/lib/inactivity";
import { env } from "@/lib/env";

// Precisa do runtime Node (crypto, Buffer, SDKs).
export const runtime = "nodejs";

/**
 * GET: handshake de verificação do webhook da Meta.
 * A Meta chama com hub.mode/hub.verify_token/hub.challenge.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Tipos mínimos do payload de mensagens da Cloud API. */
interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          audio?: { id?: string };
          image?: { id?: string; mime_type?: string; caption?: string };
          document?: {
            id?: string;
            mime_type?: string;
            caption?: string;
            filename?: string;
          };
          /**
           * Só vem quando o contato chegou por um anúncio "Clique para
           * WhatsApp", e SÓ na primeira mensagem da conversa. É a Meta
           * afirmando a origem — se não capturar aqui, o dado se perde.
           */
          referral?: {
            source_type?: string; // "ad" | "post"
            source_id?: string;
            source_url?: string;
            headline?: string;
            body?: string;
            ctwa_clid?: string;
          };
        }>;
      };
    }>;
  }>;
}

/**
 * POST: recebe eventos. Valida a assinatura, extrai as mensagens e roda o
 * pipeline. Sempre responde 200 rápido (a Meta re-tenta em caso de erro; a
 * idempotência por waMessageId cobre reentregas).
 */
export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: WhatsAppWebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const contactName = value?.contacts?.[0]?.profile?.name;
      if (!phoneNumberId || !value?.messages) continue;

      for (const m of value.messages) {
        const inbound: InboundMessage = {
          phoneNumberId,
          waMessageId: m.id,
          from: m.from,
          contactName,
          type: m.type,
          text: m.text?.body,
          audioId: m.audio?.id,
          mediaId: m.image?.id ?? m.document?.id,
          mediaMimeType: m.image?.mime_type ?? m.document?.mime_type,
          mediaCaption: m.image?.caption ?? m.document?.caption,
          mediaFilename: m.document?.filename,
          referral: m.referral
            ? {
                sourceType: m.referral.source_type,
                sourceId: m.referral.source_id,
                headline: m.referral.headline,
                ctwaClid: m.referral.ctwa_clid,
              }
            : undefined,
        };
        try {
          await processInbound(inbound);
        } catch (err) {
          // Não deixa um erro derrubar o lote; loga e segue.
          console.error("[webhook] processInbound falhou:", err);
        }
      }
    }
  }

  // De carona no tráfego: encerra conversas paradas sem depender de cron
  // (o Hobby não roda cron a cada 15 min). Não deixa falhar a resposta do webhook.
  try {
    await sweepInactive();
  } catch (err) {
    console.error("[webhook] sweepInactive falhou:", err);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
