import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quickReplies } from "@/db/schema";
import { getCurrentClient } from "@/lib/current-client";
import {
  getConversationsList,
  getConversationStatusCounts,
  getConversationThread,
} from "@/db/panel";
import { Header } from "../ui";
import { ConversasLive } from "./conversas-live";

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string; st?: string }>;
}) {
  const { c: selectedId, q, st } = await searchParams;
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const [all, counts, shortcuts] = await Promise.all([
    getConversationsList(client.id),
    getConversationStatusCounts(client.id),
    db
      .select({
        id: quickReplies.id,
        shortcut: quickReplies.shortcut,
        message: quickReplies.message,
      })
      .from(quickReplies)
      .where(eq(quickReplies.clientId, client.id)),
  ]);
  // A busca por nome é 100% no cliente (ver ConversasLive); aqui só filtra
  // por status, que também dirige o polling.
  let convos = all;
  if (st === "fora") convos = convos.filter((c) => c.outOfHoursNotified);
  else if (st === "ia" || st === "novo" || st === "voce")
    convos = convos.filter((c) => c.status === st);
  const thread = selectedId
    ? await getConversationThread(client.id, selectedId)
    : null;

  return (
    <div className="h-full flex flex-col min-h-0">
      <Header title="Conversas" sub="Tudo que chega no WhatsApp, num lugar só." />
      <ConversasLive
        key={`${selectedId ?? ""}|${q ?? ""}|${st ?? ""}`}
        selectedId={selectedId ?? null}
        q={q ?? ""}
        st={st ?? ""}
        counts={counts}
        quickReplies={shortcuts}
        initialConvos={convos.map((c) => ({
          id: c.id,
          contactName: c.contactName,
          status: c.status,
          lastMessageAt: c.lastMessageAt,
          outOfHoursNotified: c.outOfHoursNotified,
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
                  mediaUrl: m.mediaUrl,
                  mediaType: m.mediaType,
                  mediaFilename: m.mediaFilename,
                  createdAt: m.createdAt,
                })),
              }
            : null
        }
      />
    </div>
  );
}
