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

/* ---------- redefinição de senha ---------- */

export async function sendPasswordResetEmail(
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
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Recebemos um pedido para redefinir sua senha. Use o código abaixo (expira em 15 minutos).</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
    </td></tr>
    <tr><td style="padding:0 32px 28px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
    </td></tr>`;

  await send(to, `${code}: redefinir sua senha Zappia`, shell(content));
}

/* ---------- concierge: solicitação de conexão do WhatsApp ---------- */

export async function sendWhatsappRequestNotification(
  to: string,
  info: { clientName: string; number: string; contactEmail: string },
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Nova solicitação de conexão</h1>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Um cliente pediu pra conectar o WhatsApp dele. Faça o setup na Meta e marque o número como conectado.</p>
    </td></tr>
    <tr><td style="padding:16px 32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Cliente", info.clientName)}
        ${infoRow("Número", info.number)}
        ${infoRow("Contato", info.contactEmail)}
      </table>
    </td></tr>`;
  await send(to, `Conexão WhatsApp solicitada: ${info.clientName}`, shell(content));
}

/* ---------- convite de equipe ---------- */

export async function sendTeamInvite(
  to: string,
  name: string,
  businessName: string,
  link: string,
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Olá, ${escapeHtml(name)}!</h1>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Você foi convidado para ajudar no atendimento de <strong>${escapeHtml(businessName)}</strong> pelo Zappia. Clique no botão abaixo para criar sua senha e começar. O convite expira em 7 dias.</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px;">
      <a href="${link}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 30px;border-radius:12px;">Criar minha senha</a>
    </td></tr>
    <tr><td style="padding:0 32px 28px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não esperava este convite, é só ignorar este e-mail.</p>
    </td></tr>`;
  await send(
    to,
    `Convite para acessar ${businessName} no Zappia`,
    shell(content),
  );
}

/* ---------- convite de administrador da agência ---------- */

export async function sendAdminInvite(
  to: string,
  name: string,
  link: string,
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Olá, ${escapeHtml(name)}!</h1>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Você foi convidado como administrador da agência no Zappia, com acesso a todos os clientes e ao faturamento. Clique no botão abaixo para criar sua senha e começar. O convite expira em 7 dias.</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px;">
      <a href="${link}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 30px;border-radius:12px;">Criar minha senha</a>
    </td></tr>
    <tr><td style="padding:0 32px 28px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não esperava este convite, é só ignorar este e-mail.</p>
    </td></tr>`;
  await send(to, "Convite de administrador no Zappia", shell(content));
}

/* ---------- convite de cliente (dono de um novo negócio) ---------- */

export async function sendClientInvite(
  to: string,
  name: string,
  businessName: string,
  link: string,
  freeFirstMonth: boolean,
): Promise<void> {
  const bonus = freeFirstMonth
    ? `<p style="margin:12px 0 0;color:#065f46;font-size:13px;background:#ecfdf5;border-radius:10px;padding:10px 14px;">🎁 Seu primeiro mês é por nossa conta.</p>`
    : "";
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a;">Olá, ${escapeHtml(name)}!</h1>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Sua conta em <strong>${escapeHtml(businessName)}</strong> está pronta no Zappia. Clique no botão abaixo para criar sua senha e começar a atender com IA. O convite expira em 7 dias.</p>
      ${bonus}
    </td></tr>
    <tr><td align="center" style="padding:24px 32px;">
      <a href="${link}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 30px;border-radius:12px;">Criar minha senha</a>
    </td></tr>
    <tr><td style="padding:0 32px 28px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">Se você não esperava este convite, é só ignorar este e-mail.</p>
    </td></tr>`;
  await send(to, `Sua conta ${businessName} está pronta no Zappia`, shell(content));
}

/* ---------- lembrete de pagamento (5 dias antes) ---------- */

export async function sendPaymentReminder(
  to: string,
  data: { businessName: string; dueDateLabel: string; invoiceUrl: string | null },
): Promise<void> {
  const content = `
    <tr><td style="padding:16px 32px 4px;">
      <span style="display:inline-block;background:#fffbeb;color:#92400e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">PAGAMENTO CHEGANDO</span>
      <h1 style="margin:10px 0 4px;font-size:19px;color:#0f172a;">Sua próxima cobrança é em ${escapeHtml(data.dueDateLabel)}</h1>
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Pra <strong>${escapeHtml(data.businessName)}</strong> continuar atendendo sem interrupção, deixe o pagamento em dia.</p>
    </td></tr>
    ${
      data.invoiceUrl
        ? `<tr><td align="center" style="padding:20px 32px 28px;">
      <a href="${data.invoiceUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 30px;border-radius:12px;">Ver fatura</a>
    </td></tr>`
        : `<tr><td style="padding:0 32px 28px;"><p style="margin:0;color:#94a3b8;font-size:12px;">Acesse o painel do Zappia em Configurações para ver os detalhes.</p></td></tr>`
    }`;
  await send(to, `Pagamento Zappia chegando: ${data.dueDateLabel}`, shell(content));
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
        ${infoRow("Interesse", data.courseInterest || "-")}
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
  await send(to, `Resumo diário: ${data.clientName}`, shell(content));
}
