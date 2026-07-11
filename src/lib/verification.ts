import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema";

const TTL_MINUTES = 15;
const MAX_ATTEMPTS = 6;

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Cria (ou renova) o código de verificação de um e-mail. Retorna o código cru. */
export async function createVerificationCode(email: string): Promise<string> {
  const code = generateCode();
  const codeHash = bcrypt.hashSync(code, 10);
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);

  await db
    .insert(emailVerifications)
    .values({ email, codeHash, expiresAt, attempts: 0 })
    .onConflictDoUpdate({
      target: emailVerifications.email,
      set: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
    });

  return code;
}

export type CheckResult =
  | "ok"
  | "invalid"
  | "expired"
  | "too_many"
  | "not_found";

export async function checkVerificationCode(
  email: string,
  code: string,
): Promise<CheckResult> {
  const [row] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.email, email))
    .limit(1);

  if (!row) return "not_found";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  if (row.attempts >= MAX_ATTEMPTS) return "too_many";

  if (!bcrypt.compareSync(code, row.codeHash)) {
    await db
      .update(emailVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(emailVerifications.email, email));
    return "invalid";
  }

  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.email, email));
  return "ok";
}
