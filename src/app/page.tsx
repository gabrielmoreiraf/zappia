import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Check,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLAN_FEATURES, PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/plan";

const FEATURES = [
  {
    icon: Mic,
    title: "Texto e áudio",
    desc: "Entende mensagens escritas e áudios (transcritos automaticamente) e responde com naturalidade.",
  },
  {
    icon: ShieldCheck,
    title: "Treinada no seu negócio",
    desc: "Só responde com base no que você cadastra. Nunca inventa preço, data ou informação.",
  },
  {
    icon: Users,
    title: "Captura leads sozinha",
    desc: "Identifica interesse de compra e organiza os contatos prontos pra você fechar.",
  },
  {
    icon: Bell,
    title: "Chama você na hora certa",
    desc: "Quando precisa de humano, encaminha a conversa e te avisa por e-mail.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Conecte seu WhatsApp",
    desc: "Número oficial pela API da Meta — sem risco de banimento.",
  },
  {
    n: "2",
    title: "Ensine seu negócio",
    desc: "Cadastre produtos, serviços e informações na base de conhecimento.",
  },
  {
    n: "3",
    title: "A IA atende 24/7",
    desc: "Ela responde, captura leads e você acompanha tudo no painel.",
  },
];

const WITHOUT = [
  "Atendimento lento e cliente esperando",
  "Leads perdidos fora do horário",
  "Equipe sobrecarregada no WhatsApp",
  "Respostas erradas ou inventadas",
];
const WITH = [
  "Responde na hora, 24 horas por dia",
  "Todo lead capturado e organizado",
  "Equipe focada no que importa",
  "Nunca inventa informação",
];

const FAQ = [
  {
    q: "Preciso saber programar?",
    a: "Não. Você conecta o WhatsApp, cadastra as informações do seu negócio e a IA começa a atender.",
  },
  {
    q: "A IA pode inventar informação?",
    a: "Não. É a nossa regra de ouro: a IA só afirma o que estiver cadastrado na sua base. Se não souber, ela avisa e chama você.",
  },
  {
    q: "Funciona com mensagens de áudio?",
    a: "Sim. Os áudios são transcritos automaticamente e respondidos como uma mensagem normal.",
  },
  {
    q: "Tem risco de banir meu WhatsApp?",
    a: "Não. Usamos a API oficial da Meta (WhatsApp Cloud API), sem risco de bloqueio.",
  },
  {
    q: "Serve pro meu segmento?",
    a: "Sim. A Zappia funciona pra qualquer negócio — clínicas, lojas, cursos, serviços, depósitos e mais.",
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
        <Bot size={18} className="text-white" />
      </div>
      <span className="font-bold text-lg text-slate-900">Zappia</span>
    </div>
  );
}

export default async function LandingPage() {
  const session = await auth();
  const loggedIn = !!session?.user;

  return (
    <div className="bg-white text-slate-900">
      {/* NAV */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#recursos" className="hover:text-slate-900">Recursos</a>
            <a href="#como-funciona" className="hover:text-slate-900">Como funciona</a>
            <a href="#precos" className="hover:text-slate-900">Preços</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Button asChild>
                <Link href="/dashboard">Ir pro painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link href="/cadastro">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            <ShieldCheck size={13} /> API oficial da Meta · sem risco de banimento
          </span>
          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Seu WhatsApp atendendo sozinho,
            <br className="hidden md:block" /> com{" "}
            <span className="text-emerald-600">Inteligência Artificial</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            A Zappia responde texto e áudio, treinada no conhecimento do seu
            negócio, captura leads e só chama você quando realmente precisa. Sem
            programar.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button asChild size="lg">
              <Link href={loggedIn ? "/dashboard" : "/cadastro"}>
                Começar grátis <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Funciona pra qualquer segmento — clínicas, lojas, cursos, serviços e mais.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold">Tudo o que você precisa pra escalar</h2>
          <p className="mt-3 text-slate-600">
            Um atendente que não dorme, não esquece e não inventa informação.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-6 gap-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="bg-slate-50 border-y border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold">Como funciona</h2>
            <p className="mt-3 text-slate-600">Do zero ao atendimento automático em 3 passos.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold text-lg text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">A diferença que a Zappia faz</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6 gap-3 border-slate-200">
            <h3 className="font-semibold text-slate-500">Sem a Zappia</h3>
            <ul className="space-y-2.5">
              {WITHOUT.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-slate-600">
                  <X size={16} className="text-red-400 mt-0.5 shrink-0" /> {w}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6 gap-3 border-emerald-200 bg-emerald-50/40">
            <h3 className="font-semibold text-emerald-700">Com a Zappia</h3>
            <ul className="space-y-2.5">
              {WITH.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> {w}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" className="bg-slate-50 border-y border-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold">Preço simples, sem surpresa</h2>
            <p className="mt-3 text-slate-600">
              Um único plano com tudo incluído. Cancele quando quiser.
            </p>
          </div>
          <Card className="p-8 gap-0 max-w-md mx-auto border-emerald-500 border-2 shadow-md">
            <h3 className="font-bold text-lg">Plano {PLAN_NAME}</h3>
            <div className="mt-3 mb-5">
              <span className="text-4xl font-extrabold">{PLAN_PRICE_LABEL}</span>
              <span className="text-sm text-slate-500">/mês</span>
            </div>
            <ul className="space-y-2.5 mb-7">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="w-full">
              <Link href="/cadastro">Começar agora</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Perguntas frequentes</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl bg-emerald-500 px-6 py-14 text-center text-white">
          <Sparkles size={28} className="mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl font-bold">
            Pronto pra seu WhatsApp trabalhar sozinho?
          </h2>
          <p className="mt-3 text-emerald-50 max-w-lg mx-auto">
            Crie sua conta em minutos e deixe a IA atender enquanto você foca no que
            importa.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-7 bg-white text-emerald-700 hover:bg-emerald-50">
            <Link href={loggedIn ? "/dashboard" : "/cadastro"}>
              Começar grátis <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-slate-400">
            Zappia · seu atendente de WhatsApp com IA · © 2026
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap size={13} className="text-emerald-500" /> API oficial da Meta
          </div>
        </div>
      </footer>
    </div>
  );
}
