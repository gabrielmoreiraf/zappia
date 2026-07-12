"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  UserCog,
  BookOpen,
  SlidersHorizontal,
  Settings,
  Palette,
  Bot,
  Building2,
  Wallet,
  ChevronLeft,
  Store,
  type LucideIcon,
} from "lucide-react";
import { exitClient } from "./agency-actions";
import type { Caps } from "@/lib/permissions";

type Item = { href: string; label: string; icon: LucideIcon };
type Section = { label: string; items: Item[] };

/** Seções do painel do cliente, filtradas pelas permissões do usuário. */
function clientSections(caps: Caps): Section[] {
  const operacao: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];
  if (caps.conversas)
    operacao.push({ href: "/conversas", label: "Conversas", icon: MessageSquare });
  if (caps.leads) operacao.push({ href: "/leads", label: "Leads", icon: Users });

  const sections: Section[] = [{ label: "Operação", items: operacao }];

  if (caps.ai) {
    sections.push({
      label: "IA",
      items: [
        { href: "/conhecimento", label: "Base de conhecimento", icon: BookOpen },
        { href: "/ajustes", label: "Ajustes da IA", icon: SlidersHorizontal },
      ],
    });
  }

  const cfg: Item[] = [];
  if (caps.branding)
    cfg.push({ href: "/personalizacao", label: "Personalização", icon: Palette });
  if (caps.team) cfg.push({ href: "/equipe", label: "Equipe", icon: UserCog });
  if (caps.config)
    cfg.push({ href: "/config", label: "Configurações", icon: Settings });
  if (cfg.length) sections.push({ label: "Configurações", items: cfg });

  return sections;
}

const AGENCY_ITEMS: Item[] = [
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/faturamento", label: "Faturamento", icon: Wallet },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

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

function NavLink({ item, pathname }: { item: Item; pathname: string }) {
  const Ic = item.icon;
  const on = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 ${
        on ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Ic size={17} /> {item.label}
    </Link>
  );
}

export function Sidebar({
  isAdmin,
  activeClientName,
  activeClientLogo,
  caps,
}: {
  isAdmin: boolean;
  activeClientName: string | null;
  activeClientLogo?: string | null;
  caps: Caps;
}) {
  const pathname = usePathname();
  const sections = clientSections(caps);
  return (
    <aside className="hidden md:flex w-72 shrink-0 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
      {/* Mesma altura da topbar — as bordas ficam alinhadas numa faixa só. */}
      <div className="h-16 shrink-0 flex items-center px-4 border-b border-slate-100">
        <Logo />
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Painel do cliente ativo */}
        {activeClientName && (
          <div>
            <div className="flex items-center gap-2 px-2 py-2 mb-1.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-7 h-7 rounded-lg overflow-hidden bg-emerald-500 text-white flex items-center justify-center shrink-0">
                {activeClientLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeClientLogo}
                    alt={activeClientName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store size={15} />
                )}
              </span>
              <span className="text-sm font-semibold text-slate-800 truncate flex-1">
                {activeClientName}
              </span>
              {isAdmin && (
                <form action={exitClient}>
                  <button
                    type="submit"
                    title="Voltar para a agência"
                    className="text-slate-400 hover:text-emerald-600 flex items-center"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </form>
              )}
            </div>
            <div className="space-y-4">
              {sections.map((sec) => (
                <div key={sec.label}>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
                    {sec.label}
                  </div>
                  {sec.items.map((it) => (
                    <NavLink key={it.href} item={it} pathname={pathname} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agência (só admin) */}
        {isAdmin && (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
              Agência
            </div>
            {AGENCY_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}

export function MobileNav({
  isAdmin,
  caps,
}: {
  isAdmin: boolean;
  caps: Caps | null;
}) {
  const pathname = usePathname();
  let items: Item[] = [];
  if (caps) {
    items = [{ href: "/dashboard", label: "Início", icon: LayoutDashboard }];
    if (caps.conversas)
      items.push({ href: "/conversas", label: "Conversas", icon: MessageSquare });
    if (caps.leads) items.push({ href: "/leads", label: "Leads", icon: Users });
    if (caps.ai)
      items.push({ href: "/conhecimento", label: "Base", icon: BookOpen });
    if (caps.config)
      items.push({ href: "/config", label: "Config", icon: Settings });
  } else if (isAdmin) {
    items = [
      { href: "/clientes", label: "Clientes", icon: Building2 },
      { href: "/faturamento", label: "Faturamento", icon: Wallet },
      { href: "/perfil", label: "Perfil", icon: Users },
    ];
  }

  if (items.length === 0) return null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 flex justify-around px-1 py-1.5">
      {items.map((t) => {
        const Ic = t.icon;
        const on = isActive(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${
              on ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <Ic size={20} />
            <span className="text-[10px] font-medium">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
