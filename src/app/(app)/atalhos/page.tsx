import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quickReplies } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";
import { Header } from "../ui";
import { AtalhosClient } from "./atalhos-client";

export default async function AtalhosPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).conversas) redirect("/dashboard");

  const items = await db
    .select()
    .from(quickReplies)
    .where(eq(quickReplies.clientId, client.id))
    .orderBy(quickReplies.shortcut);

  return (
    <div>
      <Header
        title="Respostas rápidas"
        sub={'Digite "/" no chat pra puxar uma mensagem pronta, como no WhatsApp Business.'}
      />
      <AtalhosClient
        items={items.map((i) => ({
          id: i.id,
          shortcut: i.shortcut,
          message: i.message,
        }))}
      />
    </div>
  );
}
