import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next carrega .env.local automaticamente; o CLI do drizzle-kit não — então
// carregamos aqui (com fallback pro .env padrão).
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
