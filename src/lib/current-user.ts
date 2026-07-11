import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

/** Usuário logado (linha completa da tabela `users`), ou null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return u ?? null;
}
