/**
 * Zappia — seed de desenvolvimento.
 *
 * Sem dados mock de negócio: cria apenas o usuário admin para conseguir logar.
 * Os clientes são criados de verdade pelo painel da agência.
 *
 * ⚠️ Dev only. Precisa de DATABASE_URL no .env.local. Rode: npm run db:seed
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";

async function main() {
  const { db } = await import("./index");
  const s = await import("./schema");

  console.log("→ garantindo usuário admin…");
  await db
    .insert(s.users)
    .values({
      email: "owner@zappia.app",
      name: "Owner Zappia",
      passwordHash: bcrypt.hashSync("Zappia@123", 10),
      role: "owner",
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing({ target: s.users.email });

  console.log("\n✓ Seed concluído (sem mocks de negócio).");
  console.log("  Admin (login): owner@zappia.app / Zappia@123");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed falhou:", err);
    process.exit(1);
  });
