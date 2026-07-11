import Link from "next/link";
import { Bot } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — Zappia",
};

export default function TermosPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Termos de Uso</h1>
          <p className="text-sm text-slate-400 mt-1">
            Última atualização: julho de 2026
          </p>
        </div>

        <p>
          Estes termos regem o uso da plataforma Zappia por empresas que
          contratam o serviço de atendimento via WhatsApp com inteligência
          artificial. Ao criar uma conta, você concorda com os termos
          abaixo.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            1. O serviço
          </h2>
          <p>
            O Zappia conecta o número de WhatsApp Business de uma empresa à
            API oficial da Meta e opera um atendente com IA treinado no
            conteúdo cadastrado pela própria empresa (base de conhecimento,
            tom de voz, mensagens de boas-vindas).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            2. Responsabilidades da empresa cliente
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Manter as informações cadastradas na base de conhecimento corretas e atualizadas.</li>
            <li>Usar o WhatsApp Business de acordo com as políticas da Meta.</li>
            <li>Não usar a plataforma para enviar spam, conteúdo ilegal ou mensagens não solicitadas em massa.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            3. Plano e cobrança
          </h2>
          <p>
            O Zappia opera hoje com um plano único mensal. Os detalhes de
            valor e forma de pagamento são exibidos no painel, na seção
            Configurações.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            4. Limitação de responsabilidade
          </h2>
          <p>
            O Zappia não se responsabiliza por indisponibilidades causadas
            por terceiros (Meta/WhatsApp, provedores de IA, hospedagem) fora
            do nosso controle direto, nem por respostas da IA baseadas em
            informações incorretas cadastradas pela própria empresa.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            5. Privacidade
          </h2>
          <p>
            O tratamento de dados pessoais é descrito na nossa{" "}
            <Link href="/privacidade" className="text-emerald-600 hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">
            6. Contato
          </h2>
          <p>
            Dúvidas sobre estes termos podem ser enviadas para{" "}
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
