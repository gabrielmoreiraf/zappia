import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Auth.js (v5): login do sistema (admin/agência) contra a tabela `users`.
 * Só entra quem já verificou o e-mail (emailVerifiedAt não nulo).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!u || !u.emailVerifiedAt) return null;
        if (!bcrypt.compareSync(password, u.passwordHash)) return null;

        return {
          id: u.id,
          email: u.email,
          name: u.name ?? undefined,
          role: u.role,
          isAdmin: u.isAdmin,
        };
      },
    }),
    // Login automático logo após verificar o e-mail no cadastro (fluxo único,
    // sem voltar pro /login). Token de uso único e curta duração, gerado por
    // verifyEmail em (auth)/actions.ts.
    Credentials({
      id: "signup-auto",
      credentials: {
        userId: { label: "userId", type: "text" },
        token: { label: "token", type: "text" },
      },
      authorize: async (creds) => {
        const userId = String(creds?.userId ?? "");
        const token = String(creds?.token ?? "");
        if (!userId || !token) return null;

        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (!u || !u.emailVerifiedAt) return null;
        if (!u.autoLoginToken || !u.autoLoginTokenExpiresAt) return null;
        if (u.autoLoginTokenExpiresAt.getTime() < Date.now()) return null;
        if (!bcrypt.compareSync(token, u.autoLoginToken)) return null;

        // Uso único: limpa o token pra não dar pra reaproveitar.
        await db
          .update(users)
          .set({ autoLoginToken: null, autoLoginTokenExpiresAt: null })
          .where(eq(users.id, userId));

        return {
          id: u.id,
          email: u.email,
          name: u.name ?? undefined,
          role: u.role,
          isAdmin: u.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "owner" | "member") ?? "member";
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      }
      return session;
    },
  },
});
