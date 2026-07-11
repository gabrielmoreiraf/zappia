import { useState } from "react";
import {
  LayoutDashboard, MessageSquare, Users, BookOpen, SlidersHorizontal,
  Settings, Building2, Wallet, Bot, Mic, Send, CheckCheck, Plus,
  TrendingUp, Clock, Zap, Search, Bell, Smartphone, Monitor, Sparkles,
  ArrowLeft, Phone, QrCode, ChevronRight, Power, Filter, MoreVertical, Check,
} from "lucide-react";

const FONT = { fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" };

const metrics = [
  { label: "Conversas hoje", value: "47", icon: MessageSquare, tint: "emerald" },
  { label: "Leads capturados", value: "12", icon: Users, tint: "teal" },
  { label: "Tempo de resposta", value: "8s", icon: Clock, tint: "sky" },
  { label: "Resolvido pela IA", value: "86%", icon: Zap, tint: "amber" },
];

const week = [
  { d: "Seg", v: 60 }, { d: "Ter", v: 72 }, { d: "Qua", v: 48 },
  { d: "Qui", v: 84 }, { d: "Sex", v: 95 }, { d: "Sáb", v: 40 }, { d: "Dom", v: 28 },
];

const convos = [
  {
    id: 1, name: "Marcos Vinícius", initials: "MV", time: "14:59", status: "ia", unread: 0,
    preview: "Queria saber o valor da graduação EAD…",
    thread: [
      { from: "them", audio: true, text: "Oi, boa tarde! Vi o anúncio de vocês, queria saber quanto custa a graduação em pedagogia a distância." },
      { from: "bot", text: "Boa tarde, Marcos! 😊 Que bom seu interesse. A graduação em Pedagogia EAD é pelo Polo UNIFATECIE — te passo o valor e o link de matrícula. Você já tem alguma graduação anterior?" },
      { from: "them", text: "Não, seria a primeira." },
      { from: "bot", text: "Perfeito! Nesse caso entra como primeira graduação. Posso te enviar o link pra você garantir a vaga? As turmas estão com vagas limitadas." },
    ],
  },
  {
    id: 2, name: "Juliana Alves", initials: "JA", time: "14:41", status: "novo", unread: 2,
    preview: "Áudio · 0:12", audioPreview: true,
    thread: [
      { from: "them", audio: true, text: "Oi! O curso de instrumentação cirúrgica é presencial? Tem turma esse mês?" },
      { from: "bot", text: "Oi, Juliana! Sim, Instrumentação Cirúrgica é presencial. Deixa eu confirmar a próxima turma com a equipe e já te retorno o valor certinho. 🙌" },
    ],
  },
  {
    id: 3, name: "Pedro Henrique", initials: "PH", time: "13:20", status: "voce", unread: 0,
    preview: "Beleza, vou pensar e te falo!",
    thread: [
      { from: "them", text: "Qual a diferença entre o técnico em enfermagem semi e o presencial?" },
      { from: "bot", text: "Ótima pergunta! O Técnico em Enfermagem é semi-presencial, em parceria com o Instituto Phillium — teoria online e práticas presenciais." },
      { from: "you", text: "Oi Pedro, aqui é o Daniel. Posso te ligar pra explicar melhor as datas?" },
      { from: "them", text: "Beleza, vou pensar e te falo!" },
    ],
  },
  {
    id: 4, name: "Camila Souza", initials: "CS", time: "12:05", status: "ia", unread: 0,
    preview: "Obrigada! Já me matriculei 🎉",
    thread: [
      { from: "them", text: "Consegui, obrigada! Já me matriculei 🎉" },
      { from: "bot", text: "Que notícia boa, Camila! 🎉 Seja muito bem-vinda. Qualquer dúvida na plataforma é só chamar aqui." },
    ],
  },
];

const statusMap = {
  ia: { label: "IA", cls: "bg-emerald-100 text-emerald-700" },
  novo: { label: "Novo", cls: "bg-amber-100 text-amber-700" },
  voce: { label: "Você", cls: "bg-sky-100 text-sky-700" },
};

const leads = [
  { n: "Marcos Vinícius", c: "Pedagogia EAD", canal: "Anúncio", st: "novo", data: "Hoje" },
  { n: "Juliana Alves", c: "Instrumentação Cirúrgica", canal: "Anúncio", st: "contato", data: "Hoje" },
  { n: "Camila Souza", c: "Técnico em Enfermagem", canal: "Orgânico", st: "matriculado", data: "Ontem" },
  { n: "Rafael Lima", c: "Excel Avançado", canal: "Anúncio", st: "contato", data: "Ontem" },
  { n: "Beatriz Rocha", c: "Cuidador de Idosos", canal: "Orgânico", st: "novo", data: "2 dias" },
];

const leadStatus = {
  novo: "bg-amber-100 text-amber-700",
  contato: "bg-sky-100 text-sky-700",
  matriculado: "bg-emerald-100 text-emerald-700",
};

const courseGroups = [
  {
    grupo: "Presenciais", cor: "emerald",
    itens: [
      { nome: "Instrumentação Cirúrgica", info: "Presencial · vaga limitada", ativo: true },
      { nome: "Injetáveis", info: "Presencial", ativo: true },
      { nome: "Cuidador de Idosos", info: "Presencial", ativo: true },
    ],
  },
  {
    grupo: "Técnicos (semi-presencial)", cor: "teal",
    itens: [
      { nome: "Técnico em Enfermagem", info: "Parceria Instituto Phillium", ativo: true },
      { nome: "Técnico em Saúde Bucal", info: "Semi-presencial", ativo: false },
    ],
  },
  {
    grupo: "EAD", cor: "sky",
    itens: [
      { nome: "Graduação e Pós (+400 cursos)", info: "Polo UNIFATECIE · encaminhar", ativo: true },
      { nome: "Conclusão do Ensino Médio", info: "EAD", ativo: true },
    ],
  },
];

const clients = [
  { n: "Daniel — Cursos", nota: "Graduação EAD, presenciais", conv: 47, plano: "Pro", saude: "ok" },
  { n: "Gabriel — Depósito", nota: "Materiais de construção", conv: 31, plano: "Pro", saude: "ok" },
  { n: "Clínica Vida", nota: "Agendamentos", conv: 12, plano: "Start", saude: "atencao" },
];

function Metric({ m, mobile }) {
  const Icon = m.icon;
  const tints = {
    emerald: "bg-emerald-50 text-emerald-600",
    teal: "bg-teal-50 text-teal-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tints[m.tint]}`}>
        <Icon size={18} />
      </div>
      <div className={`font-bold text-slate-900 ${mobile ? "text-xl" : "text-2xl"}`}>{m.value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
    </div>
  );
}

function Header({ title, sub }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Zappia() {
  const [screen, setScreen] = useState("dashboard");
  const [device, setDevice] = useState("desktop");
  const [openConv, setOpenConv] = useState(convos[0]);
  const mobile = device === "mobile";

  const nav = [
    { g: "Operação", items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "inbox", label: "Conversas", icon: MessageSquare },
      { id: "leads", label: "Leads", icon: Users },
    ]},
    { g: "IA", items: [
      { id: "cursos", label: "Base de cursos", icon: BookOpen },
      { id: "ajustes", label: "Ajustes da IA", icon: SlidersHorizontal },
    ]},
    { g: "Conta", items: [
      { id: "config", label: "Configurações", icon: Settings },
    ]},
    { g: "Agência", items: [
      { id: "clientes", label: "Clientes", icon: Building2 },
      { id: "faturamento", label: "Faturamento", icon: Wallet },
    ]},
    { g: "Entrada", items: [
      { id: "login", label: "Login", icon: Power },
      { id: "connect", label: "Conectar WhatsApp", icon: QrCode },
    ]},
  ];

  const mobileTabs = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "inbox", label: "Conversas", icon: MessageSquare },
    { id: "leads", label: "Leads", icon: Users },
    { id: "cursos", label: "Cursos", icon: BookOpen },
    { id: "config", label: "Ajustes", icon: Settings },
  ];

  function Screen() {
    switch (screen) {
      case "login": return <Login onEnter={() => setScreen("dashboard")} />;
      case "connect": return <Connect />;
      case "dashboard": return <Dashboard mobile={mobile} />;
      case "inbox": return <Inbox mobile={mobile} openConv={openConv} setOpenConv={setOpenConv} />;
      case "leads": return <Leads mobile={mobile} />;
      case "cursos": return <Cursos />;
      case "ajustes": return <Ajustes />;
      case "config": return <Config />;
      case "clientes": return <Clientes />;
      case "faturamento": return <Faturamento mobile={mobile} />;
      default: return <Dashboard mobile={mobile} />;
    }
  }

  const Logo = ({ dark }) => (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
        <Bot size={18} className="text-white" />
      </div>
      <span className={`font-bold text-lg ${dark ? "text-white" : "text-slate-900"}`}>Zappia</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6" style={FONT}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* device toggle */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-4">
        <Logo />
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200">
          {[["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]].map(([id, Ic, lbl]) => (
            <button key={id} onClick={() => setDevice(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${device === id ? "bg-emerald-500 text-white" : "text-slate-500"}`}>
              <Ic size={15} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      {mobile ? (
        <div className="mx-auto rounded-[2rem] border-4 border-slate-900 bg-slate-50 overflow-hidden flex flex-col shadow-xl"
          style={{ width: 372, height: 760 }}>
          {screen === "login" || screen === "connect" ? (
            <div className="flex-1 overflow-y-auto"><Screen /></div>
          ) : (
            <>
              <div className="bg-white px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <Logo />
                <div className="flex items-center gap-3 text-slate-400">
                  <Search size={18} /><Bell size={18} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4"><Screen /></div>
              <div className="bg-white border-t border-slate-200 flex justify-around px-1 py-1.5">
                {mobileTabs.map((t) => {
                  const Ic = t.icon; const on = screen === t.id;
                  return (
                    <button key={t.id} onClick={() => setScreen(t.id)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${on ? "text-emerald-600" : "text-slate-400"}`}>
                      <Ic size={20} /><span className="text-[10px] font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex" style={{ minHeight: 620 }}>
          {/* sidebar */}
          <aside className="w-60 bg-white border-r border-slate-200 p-3 flex flex-col">
            <div className="px-2 py-2 mb-2"><Logo /></div>
            <nav className="flex-1 space-y-4 overflow-y-auto">
              {nav.map((sec) => (
                <div key={sec.g}>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">{sec.g}</div>
                  {sec.items.map((it) => {
                    const Ic = it.icon; const on = screen === it.id;
                    return (
                      <button key={it.id} onClick={() => setScreen(it.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 ${on ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}>
                        <Ic size={17} /> {it.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">D</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">Daniel — Cursos</div>
                <div className="text-xs text-slate-400">Plano Pro</div>
              </div>
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 620 }}><Screen /></main>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mt-4">
        Protótipo Zappia · {mobile ? "visão mobile" : "visão desktop"} — use o seletor acima pra alternar
      </p>
    </div>
  );
}

/* ---------- SCREENS ---------- */

function Login({ onEnter }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-emerald-50 to-white text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-5">
        <Bot size={28} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Zappia</h1>
      <p className="text-sm text-slate-500 mt-1 mb-7 max-w-xs">Seu atendente com IA no WhatsApp. Responde texto e áudio, 24h por dia.</p>
      <div className="w-full max-w-xs space-y-3">
        <input placeholder="seu@email.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none" />
        <input placeholder="Senha" type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none" />
        <button onClick={onEnter} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm">Entrar</button>
      </div>
      <p className="text-xs text-slate-400 mt-5">Ainda não tem conta? <span className="text-emerald-600 font-medium">Criar agora</span></p>
    </div>
  );
}

function Connect() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 text-center bg-white">
      <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Passo 1 de 3</div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Conectar o WhatsApp</h1>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">Conecte o número oficial pela API da Meta. Sem risco de banimento.</p>
      <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 flex items-center justify-center mb-5">
        <QrCode size={80} className="text-emerald-500" />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Phone size={15} /> +55 85 9•••• ••21
        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">aguardando</span>
      </div>
      <button className="w-full max-w-xs py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm">Conectar número</button>
    </div>
  );
}

function Dashboard({ mobile }) {
  const max = Math.max(...week.map((w) => w.v));
  return (
    <div>
      <Header title="Olá, Daniel 👋" sub="Aqui está o resumo do seu atendimento hoje." />
      <div className={`grid gap-3 mb-6 ${mobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {metrics.map((m) => <Metric key={m.label} m={m} mobile={mobile} />)}
      </div>
      <div className={`grid gap-4 ${mobile ? "grid-cols-1" : "grid-cols-3"}`}>
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${mobile ? "" : "col-span-2"}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Conversas na semana</h3>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><TrendingUp size={13} /> +18%</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {week.map((w) => (
              <div key={w.d} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-emerald-500 rounded-t-md" style={{ height: `${(w.v / max) * 100}%`, minHeight: 6 }} />
                <span className="text-[10px] text-slate-400">{w.d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Leads recentes</h3>
          <div className="space-y-3">
            {leads.slice(0, 4).map((l) => (
              <div key={l.n} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold">
                  {l.n.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{l.n}</div>
                  <div className="text-xs text-slate-400 truncate">{l.c}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles size={18} className="text-emerald-600 mt-0.5" />
        <p className="text-sm text-emerald-800">A IA respondeu <b>86%</b> das conversas sozinha hoje. 4 conversas foram encaminhadas pra você.</p>
      </div>
    </div>
  );
}

function Inbox({ mobile, openConv, setOpenConv }) {
  const List = (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${mobile ? "" : "w-80 shrink-0"}`}>
      <div className="p-3 border-b border-slate-100 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
          <Search size={15} className="text-slate-400" />
          <input placeholder="Buscar conversa" className="bg-transparent text-sm outline-none w-full" />
        </div>
      </div>
      <div>
        {convos.map((c) => {
          const st = statusMap[c.status]; const on = openConv?.id === c.id;
          return (
            <button key={c.id} onClick={() => setOpenConv(c)}
              className={`w-full text-left px-3 py-3 flex gap-3 border-b border-slate-50 ${on && !mobile ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold shrink-0">{c.initials}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                    {c.audioPreview && <Mic size={12} className="text-emerald-500" />}{c.preview}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const Chat = openConv && (
    <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ minHeight: mobile ? 0 : 520 }}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {mobile && <button onClick={() => setOpenConv(null)}><ArrowLeft size={18} className="text-slate-500" /></button>}
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold">{openConv.initials}</div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{openConv.name}</div>
            <div className="text-xs text-emerald-600 flex items-center gap-1"><Bot size={12} /> IA respondendo</div>
          </div>
        </div>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 flex items-center gap-1.5">
          <Users size={13} /> Assumir
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" style={{ minHeight: 300 }}>
        {openConv.thread.map((m, i) => {
          const mine = m.from === "bot" || m.from === "you";
          const isYou = m.from === "you";
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                isYou ? "bg-sky-500 text-white" : mine ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
                {m.audio && (
                  <div className={`flex items-center gap-1.5 mb-1 text-[11px] ${mine ? "text-emerald-50" : "text-emerald-600"}`}>
                    <Mic size={12} /> áudio transcrito
                  </div>
                )}
                {isYou && <div className="text-[11px] text-sky-100 mb-0.5">Você (Daniel)</div>}
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-100 flex items-center gap-2">
        <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-400">Digite pra assumir a conversa…</div>
        <button className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Send size={17} /></button>
      </div>
    </div>
  );

  if (mobile) {
    return <div>{!openConv ? (<><Header title="Conversas" />{List}</>) : Chat}</div>;
  }
  return (
    <div>
      <Header title="Conversas" sub="Tudo que chega no WhatsApp, num lugar só." />
      <div className="flex gap-4">{List}{Chat}</div>
    </div>
  );
}

function Leads({ mobile }) {
  return (
    <div>
      <Header title="Leads" sub="Contatos capturados pela IA, prontos pra fechar." />
      <div className="flex items-center gap-2 mb-4">
        <button className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center gap-1.5"><Filter size={14} /> Filtrar</button>
        <button className="text-sm font-medium px-3 py-1.5 rounded-lg bg-emerald-500 text-white flex items-center gap-1.5 ml-auto"><Plus size={15} /> Exportar</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {leads.map((l, i) => (
          <div key={l.n} className={`px-4 py-3 flex items-center gap-3 ${i < leads.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0">
              {l.n.split(" ").map((x) => x[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate">{l.n}</div>
              <div className="text-xs text-slate-400 truncate">{l.c}</div>
            </div>
            {!mobile && <div className="text-xs text-slate-400 w-20">{l.canal}</div>}
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${leadStatus[l.st]}`}>
              {l.st === "novo" ? "Novo" : l.st === "contato" ? "Em contato" : "Matriculado"}
            </span>
            {!mobile && <div className="text-xs text-slate-400 w-14 text-right">{l.data}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Cursos() {
  const dot = { emerald: "bg-emerald-500", teal: "bg-teal-500", sky: "bg-sky-500" };
  return (
    <div>
      <Header title="Base de cursos" sub="É isso que a IA sabe. Adicione ou edite o que ela responde." />
      <button className="text-sm font-medium px-3 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-1.5 mb-5"><Plus size={16} /> Adicionar curso</button>
      <div className="space-y-5">
        {courseGroups.map((g) => (
          <div key={g.grupo}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot[g.cor]}`} />
              <h3 className="text-sm font-semibold text-slate-700">{g.grupo}</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {g.itens.map((c, i) => (
                <div key={c.nome} className={`px-4 py-3 flex items-center gap-3 ${i < g.itens.length - 1 ? "border-b border-slate-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate">{c.nome}</div>
                    <div className="text-xs text-slate-400 truncate">{c.info}</div>
                  </div>
                  <div className={`w-10 h-6 rounded-full flex items-center px-0.5 ${c.ativo ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"}`}>
                    <div className="w-5 h-5 rounded-full bg-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="text-sm font-medium text-slate-700 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Ajustes() {
  const tags = ["preço", "quero falar com atendente", "não entendi", "reclamação"];
  return (
    <div>
      <Header title="Ajustes da IA" sub="Personalidade, boas-vindas e quando chamar você." />
      <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-xl">
        <Field label="Nome do assistente">
          <input defaultValue="Atendimento Cursos" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none" />
        </Field>
        <Field label="Mensagem de boas-vindas">
          <textarea rows={3} defaultValue="Olá! 👋 Seja bem-vindo(a). Pode mandar por texto ou áudio — me conta qual curso te interessou?"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none resize-none" />
        </Field>
        <Field label="Tom da conversa">
          <div className="flex gap-2">
            {["Amigável", "Neutro", "Formal"].map((t, i) => (
              <button key={t} className={`px-3 py-2 rounded-lg text-sm font-medium border ${i === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{t}</button>
            ))}
          </div>
        </Field>
        <Field label="Encaminhar pra você quando o cliente disser">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">{t} <span className="text-slate-400">×</span></span>
            ))}
            <span className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-400 flex items-center gap-1"><Plus size={11} /> add</span>
          </div>
        </Field>
        <button className="mt-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm flex items-center gap-1.5"><Check size={16} /> Salvar ajustes</button>
      </div>
    </div>
  );
}

function Config() {
  const toggles = [
    { t: "Avisar quando um lead novo chegar", on: true },
    { t: "Avisar quando a IA encaminhar pra mim", on: true },
    { t: "Resumo diário por e-mail", on: false },
  ];
  return (
    <div>
      <Header title="Configurações" sub="Conexão, notificações e plano." />
      <div className="space-y-4 max-w-xl">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">WhatsApp conectado</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Phone size={18} /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800">+55 85 9•••• ••21</div>
              <div className="text-xs text-emerald-600 flex items-center gap-1"><CheckCheck size={13} /> Conectado · API oficial</div>
            </div>
            <button className="text-xs font-medium text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200">Trocar</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Notificações</h3>
          {toggles.map((tg, i) => (
            <div key={tg.t} className={`flex items-center justify-between py-2.5 ${i < toggles.length - 1 ? "border-b border-slate-50" : ""}`}>
              <span className="text-sm text-slate-600">{tg.t}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 ${tg.on ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"}`}>
                <div className="w-5 h-5 rounded-full bg-white" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Plano Pro</h3>
            <p className="text-xs text-slate-400 mt-0.5">R$ 250/mês · próxima cobrança 08/ago</p>
          </div>
          <button className="text-xs font-medium text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50">Gerenciar</button>
        </div>
      </div>
    </div>
  );
}

function Clientes() {
  return (
    <div>
      <Header title="Clientes" sub="Todos os atendentes que você gerencia (visão da agência)." />
      <button className="text-sm font-medium px-3 py-2 rounded-xl bg-emerald-500 text-white flex items-center gap-1.5 mb-5"><Plus size={16} /> Novo cliente</button>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {clients.map((c, i) => (
          <div key={c.n} className={`px-4 py-3.5 flex items-center gap-3 ${i < clients.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><Building2 size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate">{c.n}</div>
              <div className="text-xs text-slate-400 truncate">{c.nota}</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-sm font-semibold text-slate-700">{c.conv}</div>
              <div className="text-[10px] text-slate-400">conversas</div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">{c.plano}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${c.saude === "ok" ? "bg-emerald-500" : "bg-amber-400"}`} />
            <ChevronRight size={16} className="text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Faturamento({ mobile }) {
  const cards = [
    { label: "Receita mensal", value: "R$ 750", tint: "emerald" },
    { label: "Custo de operação", value: "R$ 210", tint: "sky" },
    { label: "Margem", value: "R$ 540", tint: "teal" },
  ];
  const rows = [
    { n: "Daniel — Cursos", rec: "R$ 250", custo: "R$ 80" },
    { n: "Gabriel — Depósito", rec: "R$ 250", custo: "R$ 70" },
    { n: "Clínica Vida", rec: "R$ 250", custo: "R$ 60" },
  ];
  return (
    <div>
      <Header title="Faturamento" sub="Receita, custo e margem da operação." />
      <div className={`grid gap-3 mb-5 ${mobile ? "grid-cols-1" : "grid-cols-3"}`}>
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="text-xs text-slate-500 mb-1">{c.label}</div>
            <div className={`text-2xl font-bold text-${c.tint}-600`}>{c.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex text-xs font-semibold text-slate-400">
          <span className="flex-1">Cliente</span><span className="w-20 text-right">Receita</span><span className="w-20 text-right">Custo</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.n} className={`px-4 py-3 flex items-center text-sm ${i < rows.length - 1 ? "border-b border-slate-50" : ""}`}>
            <span className="flex-1 font-medium text-slate-700 truncate">{r.n}</span>
            <span className="w-20 text-right text-emerald-600 font-semibold">{r.rec}</span>
            <span className="w-20 text-right text-slate-500">{r.custo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
