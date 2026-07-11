import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client } from "@/db/schema";

export const ACTIVE_CLIENT_COOKIE = "active_client";

/**
 * Cliente "ativo" do painel, ou null se a conta ainda não tem nenhum cliente.
 *
 * A agência escolhe qual client está vendo (cookie `active_client`, setado ao
 * "Entrar" na tela de Clientes). Sem seleção, cai no primeiro client existente.
 */
export async function getCurrentClient(): Promise<Client | null> {
  const jar = await cookies();
  const activeId = jar.get(ACTIVE_CLIENT_COOKIE)?.value;
  if (activeId) {
    const [c] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, activeId))
      .limit(1);
    if (c) return c;
  }

  const [first] = await db.select().from(clients).orderBy(clients.createdAt).limit(1);
  return first ?? null;
}
