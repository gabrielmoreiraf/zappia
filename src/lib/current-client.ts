import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client } from "@/db/schema";

/**
 * Cliente "logado" do painel.
 *
 * Fase 4 (dev): fixo no Daniel (o client semeado). A Fase 5 (Auth.js) troca
 * isto pela sessão real — e o painel da agência (Fase 6) vai poder "entrar como"
 * qualquer client.
 */
export async function getCurrentClient(): Promise<Client> {
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
