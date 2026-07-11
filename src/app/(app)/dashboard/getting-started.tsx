import Link from "next/link";
import { ArrowRight, BookOpen, Phone, Sparkles, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Step {
  icon: typeof Phone;
  title: string;
  desc: string;
  href: string;
  cta: string;
  done: boolean;
}

export function GettingStarted({
  whatsappConnected,
  hasKnowledge,
  aiConfigured,
}: {
  whatsappConnected: boolean;
  hasKnowledge: boolean;
  aiConfigured: boolean;
}) {
  const steps: Step[] = [
    {
      icon: Phone,
      title: "Conecte seu WhatsApp",
      desc: "Ligue seu número oficial para a IA começar a atender automaticamente.",
      href: "/config",
      cta: "Conectar",
      done: whatsappConnected,
    },
    {
      icon: BookOpen,
      title: "Monte a Base de conhecimento",
      desc: "Cadastre produtos, serviços e preços. A IA só responde com base no que você cadastrar aqui.",
      href: "/conhecimento",
      cta: "Adicionar",
      done: hasKnowledge,
    },
    {
      icon: SlidersHorizontal,
      title: "Ajuste a IA",
      desc: "Defina o nome do assistente, o tom da conversa e quando ela deve te chamar.",
      href: "/ajustes",
      cta: "Ajustar",
      done: aiConfigured,
    },
  ];

  // Passos já concluídos somem; o card inteiro desaparece quando termina o setup.
  const pending = steps.filter((s) => !s.done);
  if (pending.length === 0) return null;

  return (
    <Card className="mb-6 border-emerald-100 bg-emerald-50/40">
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Primeiros passos</h3>
        </div>
        <div className="space-y-2">
          {pending.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                href={s.href}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-emerald-200 transition-colors group"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">
                    <span className="text-slate-400">{i + 1}.</span> {s.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                </div>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 shrink-0 group-hover:gap-1.5 transition-all">
                  {s.cta} <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
