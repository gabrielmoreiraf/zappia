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
    return required("ASAAS_API_KEY");
  },
  get asaasEnv() {
    return process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
  },
  get asaasWebhookToken() {
    return required("ASAAS_WEBHOOK_TOKEN");
  },
};
