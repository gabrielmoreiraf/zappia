import { Clock, MessageSquare, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { getCurrentClient } from "@/lib/current-client";
import { getDashboard } from "@/db/panel";
import { initials, tempoResposta } from "@/lib/format";
import { Header, Metric } from "../ui";

export default async function DashboardPage() {
  const client = await getCurrentClient();
  const d = await getDashboard(client.id);
  const firstName = client.name.split(/[ —-]/)[0];
  const maxV = Math.max(1, ...d.week.map((w) => w.v));

  return (
    <div>
      <Header
        title={`Olá, ${firstName} 👋`}
        sub="Aqui está o resumo do seu atendimento hoje."
      />

      <div className="grid gap-3 mb-6 grid-cols-2 lg:grid-cols-4">
        <Metric label="Conversas hoje" value={String(d.conversasHoje)} icon={MessageSquare} tint="emerald" />
        <Metric label="Leads capturados" value={String(d.leadsHoje)} icon={Users} tint="teal" />
        <Metric label="Tempo de resposta" value={tempoResposta(d.tempoRespostaSeg)} icon={Clock} tint="sky" />
        <Metric label="Resolvido pela IA" value={`${d.pctResolvidoIA}%`} icon={Zap} tint="amber" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Atividade na semana</h3>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp size={13} /> últimos 7 dias
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {d.week.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full bg-emerald-500 rounded-t-md"
                  style={{ height: `${(w.v / maxV) * 100}%`, minHeight: 6 }}
                />
                <span className="text-[10px] text-slate-400">{w.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Leads recentes</h3>
          {d.recentLeads.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum lead ainda.</p>
          ) : (
            <div className="space-y-3">
              {d.recentLeads.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold">
                    {initials(l.contactName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {l.contactName ?? "Contato"}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {l.courseInterest ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-sm text-emerald-800">
          A IA respondeu <b>{d.pctResolvidoIA}%</b> das conversas sozinha hoje.
          {d.handoffsHoje > 0
            ? ` ${d.handoffsHoje} ${d.handoffsHoje === 1 ? "conversa foi encaminhada" : "conversas foram encaminhadas"} pra você.`
            : " Nenhuma conversa precisou de você até agora."}
        </p>
      </div>
    </div>
  );
}
