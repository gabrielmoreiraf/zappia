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

/**
 * Onboarding (Embedded Signup): assina o app para receber webhooks da WABA
 * do cliente. Usa nosso token de sistema, que já tem acesso a ela porque o
 * Embedded Signup a compartilha com o nosso Business Portfolio.
 */
export async function subscribeApp(wabaId: string): Promise<void> {
  const r = await fetch(`${GRAPH}/${VERSION}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.whatsappToken}` },
  });
  if (!r.ok) throw new Error(`subscribeApp ${r.status}: ${await r.text()}`);
}

/** Onboarding: registra o número na Cloud API (obrigatório antes de enviar). */
export async function registerPhoneNumber(
  phoneNumberId: string,
  pin: string,
): Promise<void> {
  const r = await fetch(`${GRAPH}/${VERSION}/${phoneNumberId}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  if (!r.ok) throw new Error(`registerPhoneNumber ${r.status}: ${await r.text()}`);
}

/** Onboarding: número em formato legível (ex.: +55 85 9****-1268) pra exibir no painel. */
export async function getDisplayPhoneNumber(phoneNumberId: string): Promise<string> {
  const r = await fetch(
    `${GRAPH}/${VERSION}/${phoneNumberId}?fields=display_phone_number`,
    { headers: { Authorization: `Bearer ${env.whatsappToken}` } },
  );
  if (!r.ok) throw new Error(`getDisplayPhoneNumber ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { display_phone_number: string };
  return j.display_phone_number;
}

export interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profilePictureUrl?: string;
  websites?: string[];
  vertical?: string;
}

const PROFILE_FIELDS =
  "about,address,description,email,profile_picture_url,websites,vertical";

/** Perfil de negócio do WhatsApp (o que o cliente final vê ao abrir o chat). */
export async function getBusinessProfile(
  phoneNumberId: string,
): Promise<BusinessProfile> {
  const r = await fetch(
    `${GRAPH}/${VERSION}/${phoneNumberId}/whatsapp_business_profile?fields=${PROFILE_FIELDS}`,
    { headers: { Authorization: `Bearer ${env.whatsappToken}` } },
  );
  if (!r.ok) throw new Error(`getBusinessProfile ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { data?: Record<string, unknown>[] };
  const p = j.data?.[0] ?? {};
  return {
    about: p.about as string | undefined,
    address: p.address as string | undefined,
    description: p.description as string | undefined,
    email: p.email as string | undefined,
    profilePictureUrl: p.profile_picture_url as string | undefined,
    websites: p.websites as string[] | undefined,
    vertical: p.vertical as string | undefined,
  };
}

/** Atualiza o perfil de negócio. Não manda profile_picture_handle aqui — ver uploadProfilePicture. */
export async function updateBusinessProfile(
  phoneNumberId: string,
  fields: Partial<Omit<BusinessProfile, "profilePictureUrl" | "vertical">> & {
    profilePictureHandle?: string;
  },
): Promise<void> {
  const body: Record<string, unknown> = { messaging_product: "whatsapp" };
  if (fields.about !== undefined) body.about = fields.about;
  if (fields.address !== undefined) body.address = fields.address;
  if (fields.description !== undefined) body.description = fields.description;
  if (fields.email !== undefined) body.email = fields.email;
  if (fields.websites !== undefined) body.websites = fields.websites;
  if (fields.profilePictureHandle) {
    body.profile_picture_handle = fields.profilePictureHandle;
  }
  const r = await fetch(`${GRAPH}/${VERSION}/${phoneNumberId}/whatsapp_business_profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`updateBusinessProfile ${r.status}: ${await r.text()}`);
}

/**
 * Envia a foto de perfil: 1) abre uma sessão de upload, 2) sobe os bytes,
 * 3) devolve o "handle" pra usar em updateBusinessProfile. Fluxo oficial da
 * Meta (Resumable Upload API), em duas chamadas porque a sessão e o upload
 * são endpoints diferentes.
 */
export async function uploadProfilePicture(
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  if (!appId) throw new Error("NEXT_PUBLIC_META_APP_ID não definido.");

  const sessionRes = await fetch(
    `${GRAPH}/${VERSION}/${appId}/uploads?file_length=${bytes.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${encodeURIComponent(env.whatsappToken)}`,
    { method: "POST" },
  );
  if (!sessionRes.ok) {
    throw new Error(`uploadProfilePicture (sessão) ${sessionRes.status}: ${await sessionRes.text()}`);
  }
  const { id: uploadSessionId } = (await sessionRes.json()) as { id: string };

  const uploadRes = await fetch(`${GRAPH}/${VERSION}/${uploadSessionId}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${env.whatsappToken}`,
      file_offset: "0",
    },
    // Node aceita Buffer como corpo de fetch em runtime; o typing do DOM lib
    // só conhece BodyInit do browser, então precisa desse cast.
    body: bytes as unknown as BodyInit,
  });
  if (!uploadRes.ok) {
    throw new Error(`uploadProfilePicture (bytes) ${uploadRes.status}: ${await uploadRes.text()}`);
  }
  const { h } = (await uploadRes.json()) as { h: string };
  return h;
}

/** Sobe um arquivo (imagem ou documento) pra Meta e devolve o media id, usado
 * em sendImageMessage/sendDocumentMessage. Endpoint de mídia de mensagem
 * comum (diferente do Resumable Upload usado só pra foto de perfil). */
export async function uploadMedia(
  phoneNumberId: string,
  bytes: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  // Buffer não bate exatamente com o BlobPart do lib DOM; mesmo caso do cast
  // em uploadProfilePicture.
  form.append(
    "file",
    new Blob([bytes as unknown as BlobPart], { type: mimeType }),
    filename,
  );

  const r = await fetch(`${GRAPH}/${VERSION}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.whatsappToken}` },
    body: form,
  });
  if (!r.ok) throw new Error(`uploadMedia ${r.status}: ${await r.text()}`);
  const { id } = (await r.json()) as { id: string };
  return id;
}

/** Envia uma imagem já enviada via uploadMedia. */
export async function sendImageMessage(
  phoneNumberId: string,
  to: string,
  mediaId: string,
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
      type: "image",
      image: { id: mediaId },
    }),
  });
  if (!r.ok) throw new Error(`sendImageMessage ${r.status}: ${await r.text()}`);
}

/** Envia um documento (PDF etc.) já enviado via uploadMedia. */
export async function sendDocumentMessage(
  phoneNumberId: string,
  to: string,
  mediaId: string,
  filename: string,
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
      type: "document",
      document: { id: mediaId, filename },
    }),
  });
  if (!r.ok) throw new Error(`sendDocumentMessage ${r.status}: ${await r.text()}`);
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
