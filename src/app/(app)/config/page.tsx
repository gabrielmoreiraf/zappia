import { CheckCheck, Phone } from "lucide-react";
import { getCurrentClient } from "@/lib/current-client";
import { money } from "@/lib/format";
import { Header } from "../ui";

const TOGGLES = [
  { t: "Avisar quando um lead novo chegar", on: true },
  { t: "Avisar quando a IA encaminhar pra mim", on: true },
  { t: "Resumo diário por e-mail", on: false },
];

export default async function ConfigPage() {
  const client = await getCurrentClient();
  const connected =
    !!client.whatsappPhoneId && !client.whatsappPhoneId.startsWith("PENDENTE");

  return (
    <div>
      <Header title="Configurações" sub="Conexão, notificações e plano." />
      <div className="space-y-4 max-w-xl">
        {/* WhatsApp */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            WhatsApp
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Phone size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                {client.whatsappNumber ?? "Número não definido"}
              </div>
              {connected ? (
                <div className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCheck size={13} /> Conectado · API oficial
                </div>
              ) : (
                <div className="text-xs text-amber-600">
                  Aguardando conexão (Meta)
                </div>
              )}
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                connected
                  ? "text-slate-500 border border-slate-200"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {connected ? "Trocar" : "Conectar"}
            </span>
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Notificações
          </h3>
          <p className="text-xs text-slate-400 mb-2">
            Ativação real na Fase 7 (handoff e avisos).
          </p>
          {TOGGLES.map((tg, i) => (
            <div
              key={tg.t}
              className={`flex items-center justify-between py-2.5 ${
                i < TOGGLES.length - 1 ? "border-b border-slate-50" : ""
              }`}
            >
              <span className="text-sm text-slate-600">{tg.t}</span>
              <div
                className={`w-10 h-6 rounded-full flex items-center px-0.5 ${
                  tg.on ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white" />
              </div>
            </div>
          ))}
        </div>

        {/* Plano */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Plano {client.plan === "pro" ? "Pro" : "Start"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {money(client.monthlyFee)}/mês
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50">
            Gerenciar
          </span>
        </div>
      </div>
    </div>
  );
}
