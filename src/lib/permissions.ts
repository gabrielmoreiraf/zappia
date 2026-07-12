import type { User } from "@/db/schema";
import { isAdminEmail } from "./roles";

/**
 * O que cada usuário pode fazer dentro do painel de um cliente.
 * - Dono (owner) / admin da agência: tudo.
 * - Gerente: opera + IA, mas não mexe em marca, plano, conexão nem usuários.
 * - Atendente: só conversas e leads.
 */
export interface Caps {
  /** Marca, cor, plano, conexão, notificações e equipe. */
  manageAccount: boolean;
  /** Base de conhecimento e Ajustes da IA. */
  useAI: boolean;
  leads: boolean;
  conversas: boolean;
}

export function capsFor(
  user: Pick<User, "email" | "role" | "teamRole">,
): Caps {
  if (isAdminEmail(user.email) || user.role === "owner") {
    return { manageAccount: true, useAI: true, leads: true, conversas: true };
  }
  const gerente = user.teamRole === "gerente";
  return {
    manageAccount: false,
    useAI: gerente,
    leads: true,
    conversas: true,
  };
}

export const TEAM_ROLE_LABEL: Record<string, string> = {
  gerente: "Gerente",
  atendente: "Atendente",
};
