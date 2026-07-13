import { getCurrentClient } from "@/lib/current-client";
import { getNotifications } from "@/db/panel";

export const runtime = "nodejs";

/** Fonte de dados do sino de notificações. O topbar faz polling aqui pra refletir eventos reais em tempo real. */
export async function GET() {
  const client = await getCurrentClient();
  if (!client) {
    return Response.json({ items: [], count: 0 });
  }
  const data = await getNotifications(client.id);
  return Response.json(data);
}
