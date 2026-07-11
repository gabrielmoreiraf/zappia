import { Resend } from "resend";
import { env } from "./env";

let _client: Resend | null = null;
function resend(): Resend {
  if (!_client) _client = new Resend(env.resendApiKey);
  return _client;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shell HTML com a identidade Zappia (emerald). `content` é o miolo do card. */
function shell(content: string): string {
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
        ${content}
        <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">Zappia · seu atendente com IA no WhatsApp</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await resend().emails.send({
    from: env.emailFrom,
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
  }
}

/* ---------- verificação de cadastro ---------- */

export async function sendVerificationEmail(
  to: string,
  code: string,
  name?: string | null,
): Promise<void> {
  const hello = name ? `Olá, ${escapeHtml(name)}!` : "Olá!";
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 5px;"><div style="width:44px;height:56px;line-height:56px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;color:#065f46;font-size:26px;font-weight:800;text-align:center;font-family:'Courier New',monospace;">${d}</div></td>`,
    )
    .join("");

  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">${hello}</h1>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Use o código abaixo para confirmar seu e-mail e ativar sua conta no Zappia. Ele expira em 15 minutos.</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
    </td></tr>
    <tr><td style="padding:0 32px 28px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não criou uma conta no Zappia, pode ignorar este e-mail.</p>
    </td></tr>`;

  await send(to, `${code} é o seu código de verificação Zappia`, shell(content));
}

/* ---------- notificações (Fase 7) ---------- */

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:#94a3b8;font-size:12px;width:120px;">${label}</td>
    <td style="padding:4px 0;color:#334155;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

export async function sendLeadNotification(
  to: string,
  data: {
    clientName: string;
    contactName: string;
    courseInterest?: string | null;
    channel: string;
  },
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <span style="display:inline-block;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">NOVO LEAD</span>
      <h1 style="margin:10px 0 4px;font-size:19px;color:#0f172a;">${escapeHtml(data.contactName)}</h1>
      <p style="margin:0;color:#475569;font-size:14px;">demonstrou interesse no atendimento de ${escapeHtml(data.clientName)}.</p>
    </td></tr>
    <tr><td style="padding:14px 32px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${infoRow("Interesse", data.courseInterest || "—")}
        ${infoRow("Canal", data.channel === "anuncio" ? "Anúncio" : "Orgânico")}
      </table>
    </td></tr>`;
  await send(to, `Novo lead: ${data.contactName}`, shell(content));
}

export async function sendHandoffNotification(
  to: string,
  data: { clientName: string; contactName: string; reason?: string | null },
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <span style="display:inline-block;background:#fffbeb;color:#92400e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">PRECISA DE VOCÊ</span>
      <h1 style="margin:10px 0 4px;font-size:19px;color:#0f172a;">${escapeHtml(data.contactName)}</h1>
      <p style="margin:0;color:#475569;font-size:14px;">A IA encaminhou esta conversa (${escapeHtml(data.clientName)}).</p>
    </td></tr>
    <tr><td style="padding:14px 32px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${infoRow("Motivo", data.reason || "atendimento humano solicitado")}
      </table>
    </td></tr>`;
  await send(to, `Conversa encaminhada: ${data.contactName}`, shell(content));
}

export async function sendDailySummary(
  to: string,
  data: {
    clientName: string;
    conversas: number;
    leads: number;
    resolvidoPct: number;
    handoffs: number;
  },
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <h1 style="margin:6px 0 4px;font-size:19px;color:#0f172a;">Resumo de ontem</h1>
      <p style="margin:0;color:#475569;font-size:14px;">${escapeHtml(data.clientName)}</p>
    </td></tr>
    <tr><td style="padding:14px 32px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${infoRow("Conversas", String(data.conversas))}
        ${infoRow("Leads novos", String(data.leads))}
        ${infoRow("Resolvido pela IA", `${data.resolvidoPct}%`)}
        ${infoRow("Encaminhadas", String(data.handoffs))}
      </table>
    </td></tr>`;
  await send(to, `Resumo diário — ${data.clientName}`, shell(content));
}
