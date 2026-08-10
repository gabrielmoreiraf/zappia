/**
 * Acesso tipado às variáveis de ambiente. Lança erro claro quando uma variável
 * exigida em runtime está faltando (só no momento do uso, não no import).
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Preencha no .env.local.`,
    );
  }
  return v;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get groqApiKey() {
    return required("GROQ_API_KEY");
  },
  get whatsappToken() {
    return required("WHATSAPP_TOKEN");
  },
  get whatsappPhoneId() {
    return required("WHATSAPP_PHONE_ID");
  },
  get whatsappVerifyToken() {
    return required("WHATSAPP_VERIFY_TOKEN");
  },
  get whatsappAppSecret() {
    return required("WHATSAPP_APP_SECRET");
  },
  get resendApiKey() {
    return required("RESEND_API_KEY");
  },
  get emailFrom() {
    // Sem domínio verificado ainda → remetente de teste do Resend.
    return process.env.EMAIL_FROM || "Zappia <onboarding@resend.dev>";
  },
  get cronSecret() {
    return required("CRON_SECRET");
  },
  get asaasApiKey() {
    // A chave da Asaas começa com "$" ($aact_...), e colar ela num terminal ou
    // num painel que interpreta shell deixa um "\" na frente. Nesse formato a
    // Asaas devolve 401 em TODA chamada, o que parece erro do nosso código.
    // Aspas e espaço na ponta também nunca fazem parte da chave.
    return required("ASAAS_API_KEY")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^\\\$/, "$");
  },
  get asaasEnv() {
    return process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
  },
  get asaasWebhookToken() {
    return required("ASAAS_WEBHOOK_TOKEN");
  },
};
