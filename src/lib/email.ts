import { Resend } from "resend";
import { env } from "./env";

let _client: Resend | null = null;
function resend(): Resend {
  if (!_client) _client = new Resend(env.resendApiKey);
  return _client;
}

/** Template HTML da verificação — identidade Zappia (emerald), código destacado. */
function verificationEmailHtml(code: string, name?: string | null): string {
  const hello = name ? `Olá, ${escapeHtml(name)}!` : "Olá!";
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 5px;"><div style="width:44px;height:56px;line-height:56px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;color:#065f46;font-size:26px;font-weight:800;text-align:center;font-family:'Courier New',monospace;">${d}</div></td>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="padding:28px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px;height:36px;background:#10b981;border-radius:10px;text-align:center;vertical-align:middle;color:#fff;font-size:20px;font-weight:800;">Z</td>
            <td style="padding-left:10px;font-size:20px;font-weight:800;color:#0f172a;">Zappia</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 32px 4px;">
          <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">${hello}</h1>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Use o código abaixo para confirmar seu e-mail e ativar sua conta no Zappia. Ele expira em 15 minutos.</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não criou uma conta no Zappia, pode ignorar este e-mail com segurança.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">Zappia · seu atendente com IA no WhatsApp</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  name?: string | null,
): Promise<void> {
  const { error } = await resend().emails.send({
    from: env.emailFrom,
    to,
    subject: `${code} é o seu código de verificação Zappia`,
    html: verificationEmailHtml(code, name),
  });
  if (error) {
    throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
  }
}
