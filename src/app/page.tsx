import { Bot } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-5">
        <Bot size={28} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900">Zappia</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-md">
        Seu atendente com IA no WhatsApp. Responde texto e áudio, 24h por dia,
        treinado no conhecimento do seu negócio — sem inventar informação.
      </p>
      <span className="mt-6 text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
        Fase 1 · projeto configurado
      </span>
    </main>
  );
}
