import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client } from "@/db/schema";

export const ACTIVE_CLIENT_COOKIE = "active_client";

/**
 * Cliente "ativo" do painel, ou null quando a agência não entrou em nenhum.
 *
 * O painel do cliente só aparece quando a agência "entra" num cliente (cookie
 * `active_client`, setado na tela de Clientes). Sem isso, fica na visão da agência.
 */
export async function getCurrentClient(): Promise<Client | null> {
  const jar = await cookies();
  const activeId = jar.get(ACTIVE_CLIENT_COOKIE)?.value;
  if (!activeId) return null;

  const [c] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, activeId))
    .limit(1);
  return c ?? null;
}
