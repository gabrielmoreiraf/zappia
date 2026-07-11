import Groq, { toFile } from "groq-sdk";
import { env } from "./env";

// §1 do build spec: transcrição via Groq — Whisper Large v3 Turbo.
const MODEL = "whisper-large-v3-turbo";

let _client: Groq | null = null;
function groq(): Groq {
  if (!_client) _client = new Groq({ apiKey: env.groqApiKey });
  return _client;
}

export interface Transcription {
  text: string;
  seconds: number;
}

/**
 * Transcreve um áudio (bytes vindos da mídia da Cloud API). WhatsApp manda
 * .ogg/opus. Retorna o texto e a duração (pra alimentar usage_log, §6).
 */
export async function transcribeAudio(
  bytes: ArrayBuffer | Buffer,
  filename = "audio.ogg",
): Promise<Transcription> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const file = await toFile(buffer, filename);

  const res = await groq().audio.transcriptions.create({
    file,
    model: MODEL,
    language: "pt",
    response_format: "verbose_json",
  });

  // verbose_json inclui `duration`; json simples não.
  const text = (res.text ?? "").trim();
  const seconds =
    typeof (res as { duration?: number }).duration === "number"
      ? Math.round((res as { duration?: number }).duration!)
      : 0;

  return { text, seconds };
}
