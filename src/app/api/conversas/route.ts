import { getCurrentClient } from "@/lib/current-client";
import { getConversationsList, getConversationThread } from "@/db/panel";

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

  const all = await getConversationsList(client.id);
  const convos = q
    ? all.filter((c) => (c.contactName ?? "").toLowerCase().includes(q))
    : all;

  const thread = selectedId
    ? await getConversationThread(client.id, selectedId)
    : null;

  return Response.json({
    convos: convos.map((c) => ({
      id: c.id,
      contactName: c.contactName,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
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
            createdAt: m.createdAt,
          })),
        }
      : null,
  });
}
