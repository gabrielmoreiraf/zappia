import type { User } from "@/db/schema";
import { isAdminEmail } from "./roles";

/**
 * Permissões granulares que o dono liga/desliga por funcionário.
 * O dono (role owner) e o admin da agência têm tudo, sempre.
 */
export const PERMISSIONS = [
  { key: "conversas", label: "Conversas", desc: "Ver e responder as conversas do WhatsApp" },
  { key: "leads", label: "Leads", desc: "Ver os leads capturados pela IA" },
  { key: "ai", label: "Base de conhecimento e Ajustes da IA", desc: "Treinar a IA e mudar o comportamento dela" },
  { key: "branding", label: "Personalização", desc: "Logo, nome e cor do sistema" },
  { key: "config", label: "Configurações", desc: "Conexão do WhatsApp, plano e notificações" },
  { key: "team", label: "Equipe", desc: "Convidar e remover funcionários" },
] as const;

export type PermKey = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMS: PermKey[] = PERMISSIONS.map((p) => p.key);
export const PERM_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.key, p.label]),
);

export interface Caps {
  conversas: boolean;
  leads: boolean;
  ai: boolean;
  branding: boolean;
  config: boolean;
  team: boolean;
}

export function capsFor(
  user: Pick<User, "email" | "role" | "permissions">,
): Caps {
  if (isAdminEmail(user.email) || user.role === "owner") {
    return {
      conversas: true,
      leads: true,
      ai: true,
      branding: true,
      config: true,
      team: true,
    };
  }
  const p = new Set(user.permissions ?? []);
  return {
    conversas: p.has("conversas"),
    leads: p.has("leads"),
    ai: p.has("ai"),
    branding: p.has("branding"),
    config: p.has("config"),
    team: p.has("team"),
  };
}

/** Filtra uma lista qualquer para só as chaves de permissão válidas. */
export function cleanPerms(input: unknown): PermKey[] {
  const arr = Array.isArray(input) ? input : [];
  return ALL_PERMS.filter((k) => arr.includes(k));
}
