import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client } from "@/db/schema";

export const ACTIVE_CLIENT_COOKIE = "active_client";

/**
 * Cliente "ativo" do painel.
 *
 * A agência escolhe qual client está vendo (cookie `active_client`, setado ao
 * "Entrar" na tela de Clientes §4.9). Sem seleção, cai no Daniel (ou no primeiro).
 */
export async function getCurrentClient(): Promise<Client> {
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

  const [daniel] = await db
    .select()
    .from(clients)
    .where(eq(clients.name, "Daniel — Cursos"))
    .limit(1);
  if (daniel) return daniel;

  const [first] = await db.select().from(clients).limit(1);
  if (!first) {
    throw new Error("Nenhum client cadastrado. Rode: npm run db:seed");
  }
  return first;
}
