import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients, users, type Client } from "@/db/schema";
import { isAdminEmail } from "./roles";

export const ACTIVE_CLIENT_COOKIE = "active_client";

/**
 * Cliente "ativo" do painel.
 *
 * - Admin (dono do Zappia): escolhe qual cliente está vendo (cookie, "entrar
 *   como"). Null quando não entrou em nenhum.
 * - Usuário-cliente: sempre o próprio negócio (users.clientId). Null antes do
 *   onboarding (aí vai pro /bem-vindo).
 */
export async function getCurrentClient(): Promise<Client | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  if (isAdminEmail(session?.user?.email)) {
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

  const [u] = await db
    .select({ clientId: users.clientId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u?.clientId) return null;
  const [c] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, u.clientId))
    .limit(1);
  return c ?? null;
}
