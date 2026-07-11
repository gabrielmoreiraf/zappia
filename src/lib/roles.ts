/**
 * Papéis do Zappia.
 *
 * O admin master (dono do Zappia) é APENAS este e-mail — todo o resto que se
 * cadastra é cliente (dono de um negócio que contratou o Zappia).
 */
export const ADMIN_EMAIL = "gabrielfmoreira4@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}
