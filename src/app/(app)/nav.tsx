"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  SlidersHorizontal,
  Settings,
  Bot,
  LogOut,
  Building2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const SIDEBAR: { g: string; items: { href: string; label: string; icon: LucideIcon }[] }[] =
  [
    {
      g: "Operação",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/conversas", label: "Conversas", icon: MessageSquare },
        { href: "/leads", label: "Leads", icon: Users },
      ],
    },
    {
      g: "IA",
      items: [
        { href: "/cursos", label: "Base de cursos", icon: BookOpen },
        { href: "/ajustes", label: "Ajustes da IA", icon: SlidersHorizontal },
      ],
    },
    {
      g: "Conta",
      items: [{ href: "/config", label: "Configurações", icon: Settings }],
    },
    {
      g: "Agência",
      items: [
        { href: "/clientes", label: "Clientes", icon: Building2 },
        { href: "/faturamento", label: "Faturamento", icon: Wallet },
      ],
    },
  ];

const MOBILE: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/conversas", label: "Conversas", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/cursos", label: "Cursos", icon: BookOpen },
  { href: "/config", label: "Ajustes", icon: Settings },
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

export function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-slate-200 p-3 flex-col h-screen sticky top-0">
      <div className="px-2 py-2 mb-2">
        <Logo />
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {SIDEBAR.map((sec) => (
          <div key={sec.g}>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
              {sec.g}
            </div>
            {sec.items.map((it) => {
              const Ic = it.icon;
              const on = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 ${
                    on
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Ic size={17} /> {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
          {(userName || userEmail).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 truncate">
            {userName || "Minha conta"}
          </div>
          <div className="text-xs text-slate-400 truncate">{userEmail}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sair"
          className="text-slate-400 hover:text-slate-600"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 flex justify-around px-1 py-1.5">
      {MOBILE.map((t) => {
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
