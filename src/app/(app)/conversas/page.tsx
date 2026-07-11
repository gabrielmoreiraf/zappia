import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getConversationsList, getConversationThread } from "@/db/panel";
import { Header } from "../ui";
import { ConversasLive } from "./conversas-live";

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { c: selectedId, q } = await searchParams;
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const all = await getConversationsList(client.id);
  const term = (q ?? "").trim().toLowerCase();
  const convos = term
    ? all.filter((c) => (c.contactName ?? "").toLowerCase().includes(term))
    : all;
  const thread = selectedId
    ? await getConversationThread(client.id, selectedId)
    : null;

  return (
    <div className="h-full flex flex-col min-h-0">
      <Header title="Conversas" sub="Tudo que chega no WhatsApp, num lugar só." />
      <ConversasLive
        key={`${selectedId ?? ""}|${q ?? ""}`}
        selectedId={selectedId ?? null}
        q={q ?? ""}
        initialConvos={convos.map((c) => ({
          id: c.id,
          contactName: c.contactName,
          status: c.status,
          lastMessageAt: c.lastMessageAt,
          lastMessage: c.lastMessage
            ? { text: c.lastMessage.text, isAudio: c.lastMessage.isAudio }
            : null,
        }))}
        initialThread={
          thread
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
            : null
        }
      />
    </div>
  );
}
