import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth.js (v5) — configuração base.
 *
 * Fase 1: esqueleto com provider de credenciais (e-mail + senha). A verificação
 * real contra as tabelas `agency_users` / `clients` e a distinção de papéis
 * (cliente vs. agência) entram nas Fases 2 e 5 (§3 do build spec).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // Fase 5 implementa a validação real (bcrypt contra o banco).
      authorize: async () => {
        return null;
      },
    }),
  ],
});
