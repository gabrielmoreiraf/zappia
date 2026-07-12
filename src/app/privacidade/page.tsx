import Link from "next/link";
import { Bot } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade: Zappia",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-5 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </span>
            <span className="font-bold text-lg text-slate-900">Zappia</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 space-y-8 text-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Política de Privacidade
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Última atualização: julho de 2026
          </p>
        </div>

        <p>
          O Zappia é uma plataforma que conecta o WhatsApp Business de uma
          empresa a um atendente com inteligência artificial. Esta política
          explica quais dados coletamos, como usamos e como você pode
          exercer seus direitos.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            1. Quais dados coletamos
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Dados de cadastro da empresa cliente: nome, e-mail, descrição
              do negócio e base de conhecimento cadastrada por ela.
            </li>
            <li>
              Mensagens trocadas entre a empresa e seus contatos pelo
              WhatsApp (texto e áudio, este último transcrito
              automaticamente) para que a IA possa responder.
            </li>
            <li>
              Metadados da conversa: número de telefone do contato, nome de
              perfil do WhatsApp, horários e status de atendimento.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            2. Como usamos esses dados
          </h2>
          <p>
            Usamos os dados exclusivamente para operar o atendimento: gerar
            respostas da IA com base no conhecimento cadastrado pela
            empresa, registrar leads e conversas no painel, e enviar
            notificações configuradas pela própria empresa (novo lead,
            encaminhamento para atendimento humano, resumo diário).
          </p>
          <p>
            Não vendemos dados a terceiros. Não usamos o conteúdo das
            conversas para treinar modelos de IA de terceiros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            3. Compartilhamento com terceiros
          </h2>
          <p>
            Para funcionar, o Zappia processa dados através de provedores
            que atuam como operadores dos dados, seguindo esta política:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Meta (WhatsApp Business Platform): envio e recebimento das mensagens.</li>
            <li>Anthropic (Claude): geração das respostas da IA.</li>
            <li>Groq: transcrição de mensagens de áudio.</li>
            <li>Neon (Postgres): armazenamento do banco de dados.</li>
            <li>Resend: envio de e-mails transacionais (verificação de conta, notificações).</li>
            <li>Vercel: hospedagem da aplicação.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            4. Retenção e exclusão
          </h2>
          <p>
            Mantemos os dados enquanto a conta da empresa estiver ativa. A
            empresa pode solicitar a exclusão de sua conta e dos dados
            associados a qualquer momento pelo e-mail de contato abaixo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            5. Segurança
          </h2>
          <p>
            As comunicações com o WhatsApp usam a API oficial da Meta com
            conexões cifradas. O acesso ao painel exige login com senha, e
            o banco de dados fica hospedado em infraestrutura com controle
            de acesso restrito.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            6. Contato
          </h2>
          <p>
            Dúvidas sobre esta política ou solicitações relacionadas aos
            seus dados podem ser enviadas para{" "}
            <a
              href="mailto:contato@zappia.app"
              className="text-emerald-600 hover:underline"
            >
              contato@zappia.app
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
