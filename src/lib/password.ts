/**
 * Regras de senha (compartilhadas cliente + servidor):
 * mínimo 8 caracteres, uma maiúscula, uma minúscula, um caractere especial.
 */
export const PASSWORD_RULES: { key: string; label: string; test: (p: string) => boolean }[] =
  [
    { key: "len", label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
    { key: "upper", label: "Uma letra maiúscula", test: (p) => /[A-Z]/.test(p) },
    { key: "lower", label: "Uma letra minúscula", test: (p) => /[a-z]/.test(p) },
    {
      key: "special",
      label: "Um caractere especial",
      test: (p) => /[^A-Za-z0-9]/.test(p),
    },
  ];

export function isPasswordValid(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}
