import { getCurrentClient } from "@/lib/current-client";
import {
  getConversationsList,
  getConversationStatusCounts,
  getConversationThread,
} from "@/db/panel";

export const runtime = "nodejs";

/**
 * Fonte de dados do painel de Conversas ao vivo. O client-side faz polling
 * aqui para atualizar a lista e a thread aberta sem recarregar a página.
 */
export async function GET(req: Request) {
  const client = await getCurrentClient();
  if (!client) {
    return Response.json({ error: "Nenhum cliente ativo" }, { status: 400 });
  }

  const url = new URL(req.url);
  const selectedId = url.searchParams.get("c");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const st = url.searchParams.get("st") ?? "";

  const [all, counts] = await Promise.all([
    getConversationsList(client.id),
    getConversationStatusCounts(client.id),
  ]);
  let convos = q
    ? all.filter((c) => (c.contactName ?? "").toLowerCase().includes(q))
    : all;
  if (st === "fora") convos = convos.filter((c) => c.outOfHoursNotified);
  else if (st === "ia" || st === "novo" || st === "voce")
    convos = convos.filter((c) => c.status === st);

  const thread = selectedId
    ? await getConversationThread(client.id, selectedId)
    : null;

  return Response.json({
    counts,
    convos: convos.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      outOfHoursNotified: c.outOfHoursNotified,
      lastMessage: c.lastMessage
        ? { text: c.lastMessage.text, isAudio: c.lastMessage.isAudio }
        : null,
    })),
    thread: thread
      ? {
          conversation: {
            id: thread.conversation.id,
            contactName: thread.conversation.contactName,
            status: thread.conversation.status,
          },
          messages: thread.messages.map((m) => ({
            id: m.id,
            from: m.from,
            text: m.text,
            isAudio: m.isAudio,
            mediaUrl: m.mediaUrl,
            mediaType: m.mediaType,
            mediaFilename: m.mediaFilename,
            createdAt: m.createdAt,
          })),
        }
      : null,
  });
}
