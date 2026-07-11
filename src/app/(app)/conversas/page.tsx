import Link from "next/link";
import { Mic, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getConversationsList, getConversationThread } from "@/db/panel";
import { initials, timeShort } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Header, CONV_STATUS } from "../ui";
import { ChatPanel } from "./chat-panel";

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: selectedId } = await searchParams;
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const convos = await getConversationsList(client.id);
  const thread = selectedId
    ? await getConversationThread(client.id, selectedId)
    : null;

  const List = (
    <Card
      className={`p-0 gap-0 overflow-hidden md:w-80 md:shrink-0 ${
        thread ? "hidden md:block" : "block"
      }`}
    >
      <div className="p-3 border-b border-slate-100 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input placeholder="Buscar conversa" className="pl-9 h-9" />
        </div>
      </div>
      {convos.length === 0 ? (
        <p className="p-4 text-sm text-slate-400">Nenhuma conversa ainda.</p>
      ) : (
        convos.map((c) => {
          const st = CONV_STATUS[c.status];
          const on = selectedId === c.id;
          const preview = c.lastMessage?.text ?? "—";
          return (
            <Link
              key={c.id}
              href={`/conversas?c=${c.id}`}
              className={`w-full text-left px-3 py-3 flex gap-3 border-b border-slate-50 ${
                on ? "bg-emerald-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold shrink-0">
                {initials(c.contactName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {c.contactName ?? "Contato"}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {timeShort(new Date(c.lastMessageAt))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                    {c.lastMessage?.isAudio && (
                      <Mic size={12} className="text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">{preview}</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })
      )}
    </Card>
  );

  const Chat = thread ? (
    <div className={`flex-1 ${thread ? "flex" : "hidden md:flex"}`}>
      <ChatPanel
        conversation={{
          id: thread.conversation.id,
          contactName: thread.conversation.contactName,
          status: thread.conversation.status,
        }}
        messages={thread.messages.map((m) => ({
          id: m.id,
          from: m.from,
          text: m.text,
          isAudio: m.isAudio,
          createdAt: m.createdAt,
        }))}
      />
    </div>
  ) : (
    <Card className="hidden md:flex flex-1 items-center justify-center text-sm text-slate-400">
      Selecione uma conversa
    </Card>
  );

  return (
    <div>
      <Header title="Conversas" sub="Tudo que chega no WhatsApp, num lugar só." />
      <div className="flex gap-4">
        {List}
        {Chat}
      </div>
    </div>
  );
}
